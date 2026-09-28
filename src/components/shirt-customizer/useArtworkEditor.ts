import { useEffect, useState } from "react";

// Carrega uma data URL como HTMLImageElement pro Konva desenhar (react-konva nao
// empacota um hook de imagem; isso evita depender de mais um pacote so pra isso).
export function useHtmlImage(url: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
    return () => {
      img.onload = null;
    };
  }, [url]);
  return image;
}
