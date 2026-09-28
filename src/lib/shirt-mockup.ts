import {
  SILHOUETTE_DETAILS,
  SILHOUETTE_PATHS,
  SILHOUETTE_VIEWBOX_H,
  SILHOUETTE_VIEWBOX_W,
  silhouetteTones,
} from "@/components/shirt-customizer/silhouette";
import type {
  CustomizationSide,
  CustomizationSideName,
} from "@/components/shirt-customizer/customization.types";

const SCALE = 2;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a arte."));
    img.src = url;
  });
}

// Desenha a camiseta com a arte posicionada (mesma geometria normalizada do editor:
// x/y sao o centro, rotacao em torno do centro) e devolve um PNG -- e a imagem que o
// cliente manda pra loja junto com o pedido.
export async function renderShirtMockup(
  sideName: CustomizationSideName,
  side: CustomizationSide,
  colorHex: string,
): Promise<Blob> {
  const width = SILHOUETTE_VIEWBOX_W * SCALE;
  const height = SILHOUETTE_VIEWBOX_H * SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível gerar a prévia.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.scale(SCALE, SCALE);
  const tones = silhouetteTones(colorHex);
  const details = SILHOUETTE_DETAILS[sideName];
  const shirt = new Path2D(SILHOUETTE_PATHS[sideName]);
  ctx.fillStyle = colorHex;
  ctx.fill(shirt);
  // No PNG o fundo e branco: a camisa branca precisa de um contorno mais visivel.
  ctx.strokeStyle = tones.outline === "#000000" ? "#000000" : "#9e9ea0";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.stroke(shirt);
  if (details.neckInside) {
    const neck = new Path2D(details.neckInside);
    ctx.fill(neck);
    ctx.fillStyle = tones.neckInside;
    ctx.fill(neck);
    ctx.stroke(neck);
  }
  ctx.strokeStyle = tones.seam;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.setLineDash([7, 5]);
  for (const seam of details.seams) ctx.stroke(new Path2D(seam));
  ctx.restore();

  if (side.assetUrl) {
    const art = await loadImage(side.assetUrl);
    const artWidth = side.width * width;
    const artHeight = side.height * height;
    ctx.save();
    ctx.translate(side.x * width, side.y * height);
    ctx.rotate((side.rotation * Math.PI) / 180);
    ctx.drawImage(art, -artWidth / 2, -artHeight / 2, artWidth, artHeight);
    ctx.restore();
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível gerar a prévia."))),
      "image/png",
    ),
  );
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}
