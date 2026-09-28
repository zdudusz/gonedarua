import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShirtPreview } from "./ShirtPreview";
import {
  CUSTOM_SHIRT_CONFIG,
  SHIRT_COLORS,
  type ShirtColor,
  type ShirtColorId,
} from "./customization.types";

type Props = {
  selected: ShirtColorId | null;
  onSelect: (color: ShirtColor) => void;
};

export function ShirtPicker({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Cor da camiseta">
      {SHIRT_COLORS.map((color) => {
        const active = selected === color.id;
        return (
          <button
            key={color.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(color)}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-2xl text-left outline-none transition-all duration-200",
              "focus-visible:ring-2 focus-visible:ring-[#111] focus-visible:ring-offset-2",
              active ? "ring-2 ring-[#111]" : "ring-1 ring-[#e5e5e5] hover:ring-[#111]",
            )}
          >
            <span className="block bg-[#f5f5f5] px-7 pb-4 pt-7">
              <span className="block transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.03]">
                <ShirtPreview
                  side="front"
                  colorHex={color.hex}
                  garmentWidthCm={CUSTOM_SHIRT_CONFIG.garmentWidthCm}
                  garmentHeightCm={CUSTOM_SHIRT_CONFIG.garmentHeightCm}
                />
              </span>
            </span>
            <span className="flex items-end justify-between gap-2 bg-white px-4 py-4">
              <span>
                <span className="cz-eyebrow block text-[#707072]">Camisa</span>
                <span className="cz-display mt-1 block text-4xl">{color.name}</span>
              </span>
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors",
                  active
                    ? "border-[#111] bg-[#111] text-white"
                    : "border-[#cacacb] text-transparent",
                )}
                aria-hidden="true"
              >
                <Check size={15} strokeWidth={3} />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
