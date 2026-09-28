import type {
  CustomizationSide,
  PrintArea,
} from "@/components/shirt-customizer/customization.types";

// width/height de uma face, em cm, a partir das proporcoes normalizadas (0..1) e
// das dimensoes fisicas do produto. Mesma conta que o trigger SQL faz no servidor.
export function sideAreaCm2(
  side: CustomizationSide,
  garmentWidthCm: number,
  garmentHeightCm: number,
) {
  if (!side.assetId) return { widthCm: 0, heightCm: 0, areaCm2: 0 };
  const widthCm = side.width * garmentWidthCm;
  const heightCm = side.height * garmentHeightCm;
  return { widthCm, heightCm, areaCm2: widthCm * heightCm };
}

// Retangulo normalizado da arte (x/y sao o centro, 0..1) convertido para cm, para
// comparar contra a area de impressao configurada.
export function sideBoundsCm(
  side: CustomizationSide,
  garmentWidthCm: number,
  garmentHeightCm: number,
) {
  const widthCm = side.width * garmentWidthCm;
  const heightCm = side.height * garmentHeightCm;
  const xCm = side.x * garmentWidthCm - widthCm / 2;
  const yCm = side.y * garmentHeightCm - heightCm / 2;
  return { xCm, yCm, widthCm, heightCm };
}

export function isWithinPrintArea(
  side: CustomizationSide,
  printArea: PrintArea,
  garmentWidthCm: number,
  garmentHeightCm: number,
): boolean {
  if (!side.assetId) return true;
  const bounds = sideBoundsCm(side, garmentWidthCm, garmentHeightCm);
  return (
    bounds.xCm >= printArea.xCm - 0.01 &&
    bounds.yCm >= printArea.yCm - 0.01 &&
    bounds.xCm + bounds.widthCm <= printArea.xCm + printArea.widthCm + 0.01 &&
    bounds.yCm + bounds.heightCm <= printArea.yCm + printArea.heightCm + 0.01
  );
}

// Maior largura normalizada que a arte pode ter mantendo a proporcao e cabendo
// inteira na area de impressao.
export function maxSideWidth(
  side: CustomizationSide,
  printArea: PrintArea,
  garmentWidthCm: number,
  garmentHeightCm: number,
): number {
  const aspect = (side.width * garmentWidthCm) / (side.height * garmentHeightCm || 1);
  return Math.min(printArea.widthCm, printArea.heightCm * aspect) / garmentWidthCm;
}

// "Ajustar automaticamente": reduz a arte (mantendo a proporcao) se ela for maior
// que a area de impressao e depois a empurra para dentro.
export function fitSideToPrintArea(
  side: CustomizationSide,
  printArea: PrintArea,
  garmentWidthCm: number,
  garmentHeightCm: number,
): CustomizationSide {
  const maxWidth = maxSideWidth(side, printArea, garmentWidthCm, garmentHeightCm);
  const scale = side.width > maxWidth ? maxWidth / side.width : 1;
  const resized = { ...side, width: side.width * scale, height: side.height * scale };
  return clampSideToPrintArea(resized, printArea, garmentWidthCm, garmentHeightCm);
}

// Empurra x/y (mantendo width/height) para dentro da area de impressao.
export function clampSideToPrintArea(
  side: CustomizationSide,
  printArea: PrintArea,
  garmentWidthCm: number,
  garmentHeightCm: number,
): CustomizationSide {
  const widthCm = side.width * garmentWidthCm;
  const heightCm = side.height * garmentHeightCm;
  const maxXCm = printArea.xCm + printArea.widthCm - widthCm;
  const maxYCm = printArea.yCm + printArea.heightCm - heightCm;
  const xCm = Math.min(
    Math.max(side.x * garmentWidthCm - widthCm / 2, printArea.xCm),
    Math.max(maxXCm, printArea.xCm),
  );
  const yCm = Math.min(
    Math.max(side.y * garmentHeightCm - heightCm / 2, printArea.yCm),
    Math.max(maxYCm, printArea.yCm),
  );
  return {
    ...side,
    x: (xCm + widthCm / 2) / garmentWidthCm,
    y: (yCm + heightCm / 2) / garmentHeightCm,
  };
}
