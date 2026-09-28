export type CustomizationSideName = "front" | "back";

// x/y/width/height/rotation sao normalizados (0..1) em relacao ao bounding box
// fisico da camiseta (ver ShirtFaceConfig.garmentWidthCm/garmentHeightCm), nao ao
// tamanho em pixels do editor -- assim a mesma composicao vale em qualquer viewport.
export type CustomizationSide = {
  assetId: string | null;
  assetUrl: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export const emptySide = (): CustomizationSide => ({
  assetId: null,
  assetUrl: null,
  x: 0.5,
  y: 0.5,
  width: 0.3,
  height: 0.3,
  rotation: 0,
});

export type SizeQuantity = {
  sizeId: string;
  label: string;
  quantity: number;
};

export type ShirtCustomization = {
  shirtColor: ShirtColorId | null;
  front: CustomizationSide;
  back: CustomizationSide;
  sizes: SizeQuantity[];
  frontPreviewUrl?: string | null;
  backPreviewUrl?: string | null;
};

export type PrintArea = {
  xCm: number;
  yCm: number;
  widthCm: number;
  heightCm: number;
};

export type ShirtFaceConfig = {
  garmentWidthCm: number;
  garmentHeightCm: number;
  printArea: PrintArea;
};

export type AreaPricingConfig = {
  baseShirtPrice: number;
  referenceFrontWidthCm: number;
  referenceFrontHeightCm: number;
  referenceBackWidthCm: number;
  referenceBackHeightCm: number;
  referenceTotalPrice: number;
  minimumPrice?: number;
  maximumPrice?: number;
};

// So existem duas camisas personalizaveis: preta e branca (mesmos tons semeados
// em product_colors pela migration do personalizador).
export const SHIRT_COLORS = [
  { id: "preta", name: "Preta", hex: "#141414" },
  { id: "branca", name: "Branca", hex: "#f5f5f0" },
] as const;
export type ShirtColor = (typeof SHIRT_COLORS)[number];
export type ShirtColorId = ShirtColor["id"];

export type CustomizerConfig = {
  garmentWidthCm: number;
  garmentHeightCm: number;
  frontPrintArea: PrintArea;
  backPrintArea: PrintArea;
  pricing: AreaPricingConfig;
};

// Camiseta slim de 60 x 76 cm (bounding box com as mangas; ver silhouette.ts)
// com area de impressao de 32 x 42 cm centralizada no peito/costas. A tabela de
// preco segue a da migration 20260926200000_shirt_customizer_schema.sql: 40x40cm
// frente + 40x40cm costas = R$180.
export const CUSTOM_SHIRT_CONFIG: CustomizerConfig = {
  garmentWidthCm: 60,
  garmentHeightCm: 76,
  frontPrintArea: { xCm: 14, yCm: 16, widthCm: 32, heightCm: 42 },
  backPrintArea: { xCm: 14, yCm: 14, widthCm: 32, heightCm: 42 },
  pricing: {
    baseShirtPrice: 100,
    referenceFrontWidthCm: 40,
    referenceFrontHeightCm: 40,
    referenceBackWidthCm: 40,
    referenceBackHeightCm: 40,
    referenceTotalPrice: 180,
    minimumPrice: 89,
    maximumPrice: 260,
  },
};

export const CUSTOMIZATION_SIZES: SizeQuantity[] = [
  { sizeId: "PP", label: "PP", quantity: 0 },
  { sizeId: "P", label: "P", quantity: 0 },
  { sizeId: "M", label: "M", quantity: 0 },
  { sizeId: "G", label: "G", quantity: 0 },
  { sizeId: "GG", label: "GG", quantity: 0 },
  { sizeId: "XG", label: "XG", quantity: 0 },
];
