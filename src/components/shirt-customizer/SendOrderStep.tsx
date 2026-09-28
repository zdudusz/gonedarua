import { useEffect, useState } from "react";
import { Check, Download, Loader2, Minus, Plus, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { dataUrlToBlob, renderShirtMockup } from "@/lib/shirt-mockup";
import { whatsappLink } from "@/lib/whatsapp";
import { formatMoney } from "@/lib/customization-pricing";
import { ShirtPreview } from "./ShirtPreview";
import {
  CUSTOM_SHIRT_CONFIG,
  type CustomizationSideName,
  type ShirtColor,
  type ShirtCustomization,
} from "./customization.types";

const SIDE_LABEL: Record<CustomizationSideName, string> = { front: "frente", back: "costas" };

type Props = {
  customization: ShirtCustomization;
  color: ShirtColor;
  unitPrice: number;
  totalQuantity: number;
  describeSide: (side: CustomizationSideName) => string;
  onSizeChange: (sizeId: string, quantity: number) => void;
};

export function SendOrderStep({
  customization,
  color,
  unitPrice,
  totalQuantity,
  describeSide,
  onSizeChange,
}: Props) {
  const [store, setStore] = useState<{ brand_name: string; whatsapp_number: string } | null>(null);
  const [filesStatus, setFilesStatus] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    void supabase
      .from("store_settings")
      .select("brand_name, whatsapp_number")
      .eq("id", 1)
      .single()
      .then(({ data }) => setStore(data ?? { brand_name: "Gonê da Rua", whatsapp_number: "" }));
  }, []);

  const sidesWithArt = (["front", "back"] as const).filter((s) => customization[s].assetUrl);

  // Mockup da camiseta + arte original de cada lado com estampa: o que a loja
  // precisa pra conferir e produzir.
  async function buildFiles(): Promise<File[]> {
    const files: File[] = [];
    for (const s of sidesWithArt) {
      const side = customization[s];
      const mockup = await renderShirtMockup(s, side, color.hex);
      files.push(
        new File([mockup], `camisa-${color.id}-${SIDE_LABEL[s]}.png`, { type: "image/png" }),
      );
      const art = await dataUrlToBlob(side.assetUrl!);
      files.push(new File([art], `arte-${SIDE_LABEL[s]}.webp`, { type: art.type }));
    }
    return files;
  }

  async function saveImages() {
    setError("");
    setFilesStatus("busy");
    try {
      const files = await buildFiles();
      // No celular, o menu de compartilhar manda as imagens direto pro WhatsApp.
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files, title: "Camisa personalizada" });
      } else {
        for (const file of files) {
          const url = URL.createObjectURL(file);
          const link = document.createElement("a");
          link.href = url;
          link.download = file.name;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      }
      setFilesStatus("done");
    } catch (e) {
      // Cancelar o menu de compartilhar nao e erro.
      if (e instanceof DOMException && e.name === "AbortError") {
        setFilesStatus("idle");
        return;
      }
      setError(e instanceof Error ? e.message : "Não foi possível preparar as imagens.");
      setFilesStatus("idle");
    }
  }

  function sendWhatsapp() {
    if (!store) return;
    const sizes = customization.sizes
      .filter((s) => s.quantity > 0)
      .map((s) => `${s.quantity}x ${s.label}`)
      .join(", ");
    const message = [
      `Olá! Quero fazer um pedido de camisa personalizada na ${store.brand_name}:`,
      "",
      `• Camisa: ${color.name}`,
      `• Frente: ${describeSide("front")}`,
      `• Costas: ${describeSide("back")}`,
      `• Tamanhos: ${sizes}`,
      "",
      `Valor estimado: ${totalQuantity} × ${formatMoney(unitPrice)} = ${formatMoney(unitPrice * totalQuantity)}`,
      "",
      "Vou enviar as imagens da personalização aqui na conversa.",
    ].join("\n");
    const link = whatsappLink(store.whatsapp_number, message);
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  }

  const hasWhatsapp = !!store?.whatsapp_number.replace(/\D/g, "");
  const canSend = totalQuantity > 0 && hasWhatsapp;

  return (
    <div className="flex flex-col gap-10">
      {/* Tamanhos */}
      <section aria-labelledby="cz-sizes">
        <div className="flex items-baseline justify-between">
          <h3 id="cz-sizes" className="cz-eyebrow">
            Tamanhos
          </h3>
          <span className="text-sm tabular-nums text-[#707072]">
            {totalQuantity} {totalQuantity === 1 ? "peça" : "peças"}
          </span>
        </div>
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {customization.sizes.map((size) => {
            const active = size.quantity > 0;
            return (
              <li
                key={size.sizeId}
                className={cn(
                  "relative rounded-xl border transition-all duration-150",
                  active ? "border-[#111] bg-[#111] text-white" : "border-[#e5e5e5] bg-white",
                )}
              >
                {active ? (
                  <div className="flex flex-col items-center gap-2 px-1 py-3">
                    <span className="cz-display text-3xl">{size.label}</span>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Diminuir tamanho ${size.label}`}
                        onClick={() => onSizeChange(size.sizeId, size.quantity - 1)}
                        className="grid h-8 w-8 place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
                      >
                        <Minus size={14} />
                      </button>
                      <span
                        className="w-6 text-center font-semibold tabular-nums"
                        aria-live="polite"
                      >
                        {size.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Aumentar tamanho ${size.label}`}
                        onClick={() => onSizeChange(size.sizeId, size.quantity + 1)}
                        className="grid h-8 w-8 place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
                      >
                        <Plus size={14} />
                      </button>
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label={`Adicionar tamanho ${size.label}`}
                    onClick={() => onSizeChange(size.sizeId, 1)}
                    className="flex h-full min-h-[92px] w-full flex-col items-center justify-center gap-1 rounded-xl transition-colors hover:bg-[#f5f5f5]"
                  >
                    <span className="cz-display text-3xl">{size.label}</span>
                    <span className="text-xs text-[#707072]">Adicionar</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Resumo */}
      <section aria-labelledby="cz-summary" className="rounded-3xl bg-[#f5f5f5] p-5 sm:p-6">
        <h3 id="cz-summary" className="cz-eyebrow">
          Seu pedido
        </h3>
        <div className="mt-4 flex gap-3">
          {(["front", "back"] as const).map((s) => (
            <figure key={s} className="w-20">
              <div className="rounded-xl bg-white p-2">
                <ShirtPreview
                  side={s}
                  colorHex={color.hex}
                  garmentWidthCm={CUSTOM_SHIRT_CONFIG.garmentWidthCm}
                  garmentHeightCm={CUSTOM_SHIRT_CONFIG.garmentHeightCm}
                  artwork={customization[s]}
                />
              </div>
              <figcaption className="mt-1 text-center text-xs capitalize text-[#707072]">
                {SIDE_LABEL[s]}
              </figcaption>
            </figure>
          ))}
        </div>
        <dl className="mt-5 grid gap-2.5 text-sm">
          {[
            ["Camisa", color.name],
            ["Frente", describeSide("front")],
            ["Costas", describeSide("back")],
            ["Preço por peça", formatMoney(unitPrice)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-[#707072]">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex items-end justify-between border-t border-[#dcdcdc] pt-5">
          <span className="text-sm text-[#707072]">
            Total estimado
            <br />
            {totalQuantity} {totalQuantity === 1 ? "peça" : "peças"}
          </span>
          <span className="cz-display text-5xl tabular-nums">
            {formatMoney(unitPrice * totalQuantity)}
          </span>
        </div>
      </section>

      {/* Envio em 2 passos */}
      <section aria-labelledby="cz-send" className="flex flex-col gap-3">
        <h3 id="cz-send" className="cz-eyebrow">
          Finalizar
        </h3>
        <button
          type="button"
          onClick={() => void saveImages()}
          disabled={filesStatus === "busy"}
          className="flex h-16 items-center gap-4 rounded-full border border-[#cacacb] pl-2 pr-6 text-left transition-colors hover:border-[#111] disabled:opacity-50"
        >
          <span
            className={cn(
              "grid h-12 w-12 shrink-0 place-items-center rounded-full",
              filesStatus === "done" ? "bg-[#007d48] text-white" : "bg-[#f5f5f5]",
            )}
          >
            {filesStatus === "busy" ? (
              <Loader2 size={20} className="animate-spin" />
            ) : filesStatus === "done" ? (
              <Check size={20} strokeWidth={3} />
            ) : (
              <Download size={20} />
            )}
          </span>
          <span className="flex-1">
            <span className="block font-semibold">
              {filesStatus === "done" ? "Imagens salvas" : "1. Salvar imagens"}
            </span>
            <span className="block text-xs text-[#707072]">
              Prévia + arte original de cada lado
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={sendWhatsapp}
          disabled={!canSend}
          className="flex h-16 items-center gap-4 rounded-full bg-[#111] pl-2 pr-6 text-left text-white transition-opacity hover:opacity-85 disabled:opacity-30"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15">
            <Send size={19} />
          </span>
          <span className="flex-1">
            <span className="block font-semibold">2. Enviar pelo WhatsApp</span>
            <span className="block text-xs text-white/70">Depois é só anexar as imagens</span>
          </span>
        </button>
        {error && (
          <p role="alert" className="text-sm font-medium text-[#d30005]">
            {error}
          </p>
        )}
        {totalQuantity === 0 && (
          <p className="text-sm text-[#707072]">Adicione pelo menos um tamanho para enviar.</p>
        )}
        {store && !hasWhatsapp && (
          <p className="text-sm font-medium text-[#d30005]">
            Pedidos ainda indisponíveis. A loja precisa cadastrar um WhatsApp para receber pedidos.
          </p>
        )}
        <p className="mt-1 text-xs leading-relaxed text-[#707072]">
          Valor estimado pela área da estampa. A loja confirma o preço final e revisa a arte antes
          da produção. Nenhum pagamento é feito aqui.
        </p>
      </section>
    </div>
  );
}
