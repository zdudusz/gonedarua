// Silhueta da camiseta (frente e costas). viewBox usa 10 unidades por cm,
// casando com CUSTOM_SHIRT_CONFIG.garmentWidthCm/garmentHeightCm (60 x 76 cm): o
// corpo slim tem ~40 cm de largura e envolve a area de impressao de 32 x 42 cm.
export const SILHOUETTE_VIEWBOX_W = 600;
export const SILHOUETTE_VIEWBOX_H = 760;

// Contorno de camiseta slim: gola redonda, ombro encaixado, manga inclinada,
// laterais retas e barra levemente arredondada. So a gola muda entre frente (decote mais fundo) e costas.
const outline = (neck: string) =>
  `M230,62 ${neck} L470,94 C498,106 534,176 566,248 L514,284 C511,268 508,252 500,232 C500,400 501,560 502,722 Q300,736 98,722 C99,560 100,400 100,232 C92,252 89,268 86,284 L34,248 C66,176 102,106 130,94 Z`;

export const SILHOUETTE_PATHS = {
  front: outline("C248,122 352,122 370,62"),
  back: outline("C250,84 350,84 370,62"),
} as const;

// Detalhes desenhados por cima do tecido: interior da gola (a parte de tras vista
// pela abertura do decote, so na frente),
// ribana da gola, costuras do ombro, bainhas das mangas e da barra.
export const SILHOUETTE_DETAILS = {
  front: {
    neckInside: "M230,62 C248,122 352,122 370,62 C350,84 250,84 230,62 Z",
    seams: [
      "M213,68 C238,142 362,142 387,68",
      "M470,94 C482,140 492,190 500,232",
      "M130,94 C118,140 108,190 100,232",
      "M556,232 L508,265",
      "M44,232 L92,265",
      "M104,702 Q300,716 496,702",
    ],
  },
  back: {
    neckInside: null,
    seams: [
      "M213,68 C240,104 360,104 387,68",
      "M470,94 C482,140 492,190 500,232",
      "M130,94 C118,140 108,190 100,232",
      "M556,232 L508,265",
      "M44,232 L92,265",
      "M104,702 Q300,716 496,702",
    ],
  },
} as const;

// Tons dos detalhes conforme a cor da camisa (clara ou escura).
export function silhouetteTones(colorHex: string) {
  const dark = isDarkHex(colorHex);
  return {
    outline: dark ? "#000000" : "#cacacb",
    seam: dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.14)",
    neckInside: dark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.07)",
  };
}

function isDarkHex(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const luminance = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luminance < 128;
}
