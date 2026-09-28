import type { AreaPricingConfig } from "@/components/shirt-customizer/customization.types";

// Espelha exatamente a funcao public.recalculate_customization_price() em
// supabase/migrations/20260926200000_shirt_customizer_schema.sql. Esta versao e
// só para a ESTIMATIVA em tempo real no editor -- o preco que vale de verdade é o
// que o trigger grava no banco ao salvar (nunca o valor calculado aqui).
export function calculateCustomizationPrice(
  config: AreaPricingConfig,
  frontAreaCm2: number,
  backAreaCm2: number,
): number {
  const referenceAreaCm2 =
    config.referenceFrontWidthCm * config.referenceFrontHeightCm +
    config.referenceBackWidthCm * config.referenceBackHeightCm;
  const artworkAreaCm2 = frontAreaCm2 + backAreaCm2;
  const surcharge =
    referenceAreaCm2 > 0
      ? (artworkAreaCm2 / referenceAreaCm2) * (config.referenceTotalPrice - config.baseShirtPrice)
      : 0;
  let price = config.baseShirtPrice + surcharge;
  if (config.minimumPrice !== undefined) price = Math.max(price, config.minimumPrice);
  if (config.maximumPrice !== undefined) price = Math.min(price, config.maximumPrice);
  return Math.round(price * 100) / 100;
}

export const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
