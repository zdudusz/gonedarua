import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { SizeQuantity } from "@/components/shirt-customizer/customization.types";

export type CartProduct = { id: string; name: string; price: number; front_url: string };
export type CartItem = { product: CartProduct; size: string; quantity: number };

export type CustomizedCartItem = {
  customizationId: string;
  productId: string;
  productName: string;
  colorId: string;
  colorName: string;
  sizes: SizeQuantity[];
  frontAreaCm2: number;
  backAreaCm2: number;
  calculatedPrice: number;
  frontPreviewUrl: string | null;
  backPreviewUrl: string | null;
};

const cartKey = (id: string, size: string) => `${id}:${size}`;
const STORAGE_KEY = "gonedarua-cart-v1";

type CartContextValue = {
  items: CartItem[];
  customizedItems: CustomizedCartItem[];
  addItem: (product: CartProduct, size: string) => void;
  adjustItem: (productId: string, size: string, delta: number) => void;
  upsertCustomizedItem: (item: CustomizedCartItem) => void;
  removeCustomizedItem: (customizationId: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customizedItems, setCustomizedItems] = useState<CustomizedCartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // So le do localStorage apos montar no cliente, pra nao divergir do HTML do SSR.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          items?: CartItem[];
          customizedItems?: CustomizedCartItem[];
        };
        if (Array.isArray(parsed.items)) setItems(parsed.items);
        if (Array.isArray(parsed.customizedItems)) setCustomizedItems(parsed.customizedItems);
      }
    } catch {
      /* carrinho local corrompido ou indisponivel: comeca vazio */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, customizedItems }));
    } catch {
      /* localStorage indisponivel (modo privado etc): carrinho segue só em memoria */
    }
  }, [items, customizedItems, hydrated]);

  const addItem: CartContextValue["addItem"] = (product, size) => {
    setItems((old) => {
      const existing = old.find((i) => cartKey(i.product.id, i.size) === cartKey(product.id, size));
      return existing
        ? old.map((i) => (i === existing ? { ...i, quantity: i.quantity + 1 } : i))
        : [...old, { product, size, quantity: 1 }];
    });
  };

  const adjustItem: CartContextValue["adjustItem"] = (productId, size, delta) => {
    setItems((old) =>
      old
        .map((i) =>
          cartKey(i.product.id, i.size) === cartKey(productId, size)
            ? { ...i, quantity: i.quantity + delta }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const upsertCustomizedItem: CartContextValue["upsertCustomizedItem"] = (item) => {
    setCustomizedItems((old) => {
      const idx = old.findIndex((i) => i.customizationId === item.customizationId);
      if (idx === -1) return [...old, item];
      const next = [...old];
      next[idx] = item;
      return next;
    });
  };

  const removeCustomizedItem: CartContextValue["removeCustomizedItem"] = (customizationId) => {
    setCustomizedItems((old) => old.filter((i) => i.customizationId !== customizationId));
  };

  return (
    <CartContext.Provider
      value={{
        items,
        customizedItems,
        addItem,
        adjustItem,
        upsertCustomizedItem,
        removeCustomizedItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return ctx;
}
