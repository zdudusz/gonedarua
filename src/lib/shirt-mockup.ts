import {
  NECK_BOTTOM_Y,
  SILHOUETTE_DETAILS,
  SILHOUETTE_PATHS,
  SILHOUETTE_VIEWBOX_H,
  SILHOUETTE_VIEWBOX_W,
  silhouetteTones,
} from "@/components/shirt-customizer/silhouette";
import {
  CUSTOM_SHIRT_CONFIG,
  type CustomizationSideName,
  type ShirtColor,
  type ShirtCustomization,
} from "@/components/shirt-customizer/customization.types";
import { formatCm, sideAreaCm2, sideBoundsCm } from "@/lib/customization-geometry";

// Layout da imagem (px). Em cima o "palco" igual ao do site (fundo cinza, camisa
// com sombra); embaixo a faixa com a especificacao da estampa.
const W = 1200;
const STAGE = { x: 40, y: 40, w: 1120, h: 1300, radius: 40, padding: 80 };
const ROW_H = 60;
const INK = "#111111";
const MUTED = "#707072";
const LINE = "#e5e5e5";
const ACCENT = "#e72363";
const DISPLAY_FONT = '"Barlow Condensed", "Arial Narrow", Impact, sans-serif';
const BODY_FONT = '"Inter", "Helvetica Neue", Arial, sans-serif';
const SIDE_TITLE: Record<CustomizationSideName, string> = { front: "Frente", back: "Costas" };

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a arte."));
    img.src = url;
  });
}

// Linhas da especificacao de um lado: moldura, posicao e rotacao.
export function describeArtworkPlacement(
  sideName: CustomizationSideName,
  customization: ShirtCustomization,
) {
  const { garmentWidthCm, garmentHeightCm } = CUSTOM_SHIRT_CONFIG;
  const side = customization[sideName];
  const { widthCm, heightCm } = sideAreaCm2(side, garmentWidthCm, garmentHeightCm);
  const bounds = sideBoundsCm(side, garmentWidthCm, garmentHeightCm);
  const fromCollarCm = Math.max(0, bounds.yCm - NECK_BOTTOM_Y[sideName] / 10);
  const offsetCm = side.x * garmentWidthCm - garmentWidthCm / 2;
  const horizontal =
    Math.abs(offsetCm) < 0.5
      ? "centralizada"
      : `${formatCm(Math.abs(offsetCm))} cm à ${offsetCm > 0 ? "direita" : "esquerda"} do centro`;
  const rotation = Math.round(side.rotation > 180 ? side.rotation - 360 : side.rotation);
  return {
    frame: `${formatCm(widthCm)} × ${formatCm(heightCm)} cm`,
    position: `${formatCm(fromCollarCm)} cm abaixo da gola · ${horizontal}`,
    rotation: rotation === 0 ? null : `${rotation}°`,
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Imagem enviada a loja: a camisa exatamente como aparece no site (mesmo desenho,
// cores, contorno, costuras, fundo e sombra do palco), com a moldura da estampa
// marcada e uma faixa com a especificacao (lado, cor, medida, posicao, rotacao e o
// outro lado).
export async function renderShirtMockup(
  sideName: CustomizationSideName,
  customization: ShirtCustomization,
  color: ShirtColor,
): Promise<Blob> {
  const side = customization[sideName];
  const otherName: CustomizationSideName = sideName === "front" ? "back" : "front";
  const spec = describeArtworkPlacement(sideName, customization);
  const other = customization[otherName].assetUrl
    ? `Estampa ${describeArtworkPlacement(otherName, customization).frame}`
    : "Sem estampa";
  const rows: [string, string][] = [
    ["Moldura da estampa", spec.frame],
    ["Posição", spec.position],
    ...(spec.rotation ? [["Rotação", spec.rotation] as [string, string]] : []),
    [SIDE_TITLE[otherName], other],
  ];
  const H = STAGE.y + STAGE.h + 230 + rows.length * ROW_H + 40;

  await Promise.all([
    document.fonts.load(`800 120px ${DISPLAY_FONT}`),
    document.fonts.load(`600 34px ${BODY_FONT}`),
    document.fonts.load(`400 30px ${BODY_FONT}`),
  ]).catch(() => undefined);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível gerar a prévia.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // ---- palco (igual ao site) ----
  ctx.fillStyle = "#f5f5f5";
  roundRect(ctx, STAGE.x, STAGE.y, STAGE.w, STAGE.h, STAGE.radius);
  ctx.fill();

  const scale = Math.min(
    (STAGE.w - STAGE.padding * 2) / SILHOUETTE_VIEWBOX_W,
    (STAGE.h - STAGE.padding * 2) / SILHOUETTE_VIEWBOX_H,
  );
  const shirtW = SILHOUETTE_VIEWBOX_W * scale;
  const shirtH = SILHOUETTE_VIEWBOX_H * scale;
  const originX = STAGE.x + (STAGE.w - shirtW) / 2;
  const originY = STAGE.y + (STAGE.h - shirtH) / 2;

  const tones = silhouetteTones(color.hex);
  const details = SILHOUETTE_DETAILS[sideName];
  const shirt = new Path2D(SILHOUETTE_PATHS[sideName]);

  ctx.save();
  ctx.translate(originX, originY);
  ctx.scale(scale, scale);
  // Sombra do palco do site: drop-shadow(0 24px 32px rgba(0,0,0,.14)).
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.14)";
  ctx.shadowBlur = 32 * scale;
  ctx.shadowOffsetY = 24 * scale;
  ctx.fillStyle = color.hex;
  ctx.fill(shirt);
  ctx.restore();
  ctx.strokeStyle = tones.outline;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.stroke(shirt);
  if (details.neckInside) {
    const neck = new Path2D(details.neckInside);
    ctx.fillStyle = color.hex;
    ctx.fill(neck);
    ctx.fillStyle = tones.neckInside;
    ctx.fill(neck);
    ctx.stroke(neck);
  }
  ctx.save();
  ctx.strokeStyle = tones.seam;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.setLineDash([7, 5]);
  for (const seam of details.seams) ctx.stroke(new Path2D(seam));
  ctx.restore();

  // Arte + moldura, com a mesma geometria do editor (x/y = centro, rotacao no centro).
  const cx = side.x * SILHOUETTE_VIEWBOX_W;
  const cy = side.y * SILHOUETTE_VIEWBOX_H;
  const artW = side.width * SILHOUETTE_VIEWBOX_W;
  const artH = side.height * SILHOUETTE_VIEWBOX_H;
  const angle = (side.rotation * Math.PI) / 180;
  if (side.assetUrl) {
    const art = await loadImage(side.assetUrl);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.drawImage(art, -artW / 2, -artH / 2, artW, artH);
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2.5 / scale;
    ctx.setLineDash([10 / scale, 7 / scale]);
    ctx.strokeRect(
      -artW / 2 - 3 / scale,
      -artH / 2 - 3 / scale,
      artW + 6 / scale,
      artH + 6 / scale,
    );
    ctx.restore();
  }
  ctx.restore();

  // Etiqueta com a medida logo acima do ponto mais alto da moldura.
  if (side.assetUrl) {
    const corners = [
      [-artW / 2, -artH / 2],
      [artW / 2, -artH / 2],
      [artW / 2, artH / 2],
      [-artW / 2, artH / 2],
    ].map(([x, y]) => originY + (cy + x! * Math.sin(angle) + y! * Math.cos(angle)) * scale);
    const topY = Math.min(...corners);
    ctx.font = `600 28px ${BODY_FONT}`;
    const label = spec.frame;
    const pillW = ctx.measureText(label).width + 36;
    const pillH = 48;
    const pillX = originX + cx * scale - pillW / 2;
    const pillY = Math.max(STAGE.y + 16, topY - pillH - 14);
    ctx.fillStyle = ACCENT;
    roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(label, pillX + pillW / 2, pillY + pillH / 2 + 1);
  }

  // ---- faixa de especificacao ----
  ctx.textBaseline = "alphabetic";
  let y = STAGE.y + STAGE.h + 70;
  ctx.textAlign = "left";
  ctx.fillStyle = MUTED;
  ctx.font = `600 24px ${BODY_FONT}`;
  ctx.letterSpacing = "4px";
  ctx.fillText("GONÊ DA RUA · CAMISA PERSONALIZADA", STAGE.x, y);
  ctx.letterSpacing = "0px";

  y += 120;
  ctx.fillStyle = INK;
  ctx.font = `800 120px ${DISPLAY_FONT}`;
  ctx.fillText(SIDE_TITLE[sideName].toUpperCase(), STAGE.x - 4, y);

  ctx.textAlign = "right";
  ctx.font = `600 34px ${BODY_FONT}`;
  const colorLabel = `Camisa ${color.name}`;
  ctx.fillText(colorLabel, STAGE.x + STAGE.w, y - 14);
  const swatchX = STAGE.x + STAGE.w - ctx.measureText(colorLabel).width - 34;
  ctx.beginPath();
  ctx.arc(swatchX, y - 26, 16, 0, Math.PI * 2);
  ctx.fillStyle = color.hex;
  ctx.fill();
  ctx.strokeStyle = "#cacacb";
  ctx.lineWidth = 2;
  ctx.stroke();

  y += 36;
  ctx.fillStyle = LINE;
  ctx.fillRect(STAGE.x, y, STAGE.w, 2);

  y += 12;
  for (const [label, value] of rows) {
    y += ROW_H;
    ctx.textAlign = "left";
    ctx.fillStyle = MUTED;
    ctx.font = `400 30px ${BODY_FONT}`;
    ctx.fillText(label, STAGE.x, y);
    ctx.textAlign = "right";
    ctx.fillStyle = label === "Moldura da estampa" ? ACCENT : INK;
    ctx.font = `600 32px ${BODY_FONT}`;
    ctx.fillText(value, STAGE.x + STAGE.w, y);
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível gerar a prévia."))),
      "image/png",
    ),
  );
}
