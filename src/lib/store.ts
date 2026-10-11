import logoAsset from "@/assets/logo.webp.asset.json";

export type Product = {
  id: string;
  name: string;
  price: number;
  front_url: string;
  back_url: string | null;
  category: string;
  description: string;
  sort_order: number;
  active: boolean;
  section_id: string | null;
  sizes: string[];
};

export type Section = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
};

export type Store = {
  id: number;
  brand_name: string;
  hero_title: string;
  hero_subtitle: string;
  announcement: string;
  about_text: string;
  logo_url: string;
  hero_image_url: string;
  accent_color: string;
  promo_price: number;
  coupon_code: string;
  coupon_discount: number;
  instagram_url: string;
  whatsapp_number: string;
  hero_layout: "left" | "right";
  grid_columns: number;
  show_offer: boolean;
  show_about: boolean;
};

export const fallbackStore: Store = {
  id: 1,
  brand_name: "Gonê da Rua",
  hero_title: "FEITO PRA OCUPAR ESPAÇO.",
  hero_subtitle: "Oversized de verdade. Arte que não pede licença.",
  announcement: "DOIS TEES POR R$180 · USE SEU CUPOM DE R$10",
  about_text: "Da rua pra rua. Camisetas oversized com atitude, arte e identidade.",
  logo_url: logoAsset.url,
  hero_image_url: "",
  accent_color: "#e72363",
  promo_price: 180,
  coupon_code: "GONE10",
  coupon_discount: 10,
  instagram_url: "",
  whatsapp_number: "",
  hero_layout: "right",
  grid_columns: 4,
  show_offer: true,
  show_about: true,
};

// Tamanhos oferecidos como atalho no editor; o admin pode adicionar outros.
export const SIZE_PRESETS = ["PP", "P", "M", "G", "GG", "XG", "XGG"];
export const DEFAULT_SIZES = ["P", "M", "G", "GG", "XG"];

export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const storeHighlight = (store: Store) =>
  /^#[0-9a-fA-F]{6}$/.test(store.accent_color) ? store.accent_color : "#e72363";

// Sem bucket publico neste workspace: a foto vira um data URL WebP comprimido no navegador.
export async function imageFromFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha uma imagem válida.");
  if (file.size > 20 * 1024 * 1024) throw new Error("A imagem deve ter até 20 MB.");
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, 1200 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(src);
        reject(new Error("Não foi possível preparar a imagem."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(src);
      resolve(canvas.toDataURL("image/webp", 0.78));
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("Não foi possível abrir a imagem."));
    };
    img.src = src;
  });
}
