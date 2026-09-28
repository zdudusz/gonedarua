const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DIMENSION_PX = 2400;

export function validateArtworkFile(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error("Envie uma imagem PNG, JPG ou WebP.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("A imagem deve ter no máximo 10 MB.");
  }
}

export type ReadArtworkResult = { url: string; naturalWidthPx: number; naturalHeightPx: number };

// Le o arquivo, recodifica pra WebP (limitando a dimensao maxima) e devolve como
// data URL -- sem Supabase Storage neste workspace, o mesmo padrao ja usado em
// products.front_url/back_url (ver src/routes/index.tsx: imageFromFile).
export function readArtworkImage(file: File): Promise<ReadArtworkResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const naturalWidthPx = img.width;
      const naturalHeightPx = img.height;
      const ratio = Math.min(1, MAX_DIMENSION_PX / Math.max(naturalWidthPx, naturalHeightPx));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(naturalWidthPx * ratio);
      canvas.height = Math.round(naturalHeightPx * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Não foi possível preparar a imagem."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve({ url: canvas.toDataURL("image/webp", 0.9), naturalWidthPx, naturalHeightPx });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível abrir a imagem. Ela pode estar corrompida."));
    };
    img.src = objectUrl;
  });
}

// Heuristica de DPI: a arte precisa ter pixels suficientes pra imprimir a area
// configurada (em cm) num minimo aceitavel de nitidez.
const MIN_PRINT_DPI = 100;

export function isLowResolutionForPrint(
  naturalWidthPx: number,
  naturalHeightPx: number,
  printWidthCm: number,
  printHeightCm: number,
): boolean {
  const neededWidthPx = (printWidthCm / 2.54) * MIN_PRINT_DPI;
  const neededHeightPx = (printHeightCm / 2.54) * MIN_PRINT_DPI;
  return naturalWidthPx < neededWidthPx || naturalHeightPx < neededHeightPx;
}
