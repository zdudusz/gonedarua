import { cn } from "@/lib/utils";
import { CUSTOMIZER_STEPS, STEP_LABELS, type CustomizerStep } from "./useCustomization";

type Props = {
  currentIndex: number;
  maxUnlockedIndex: number;
  onSelect: (step: CustomizerStep) => void;
};

// Progresso segmentado: cada segmento e clicavel quando a etapa ja esta liberada.
export function CustomizerStepper({ currentIndex, maxUnlockedIndex, onSelect }: Props) {
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Etapas da personalização">
      {CUSTOMIZER_STEPS.map((step, index) => {
        const unlocked = index <= maxUnlockedIndex;
        const active = index === currentIndex;
        return (
          <li key={step}>
            <button
              type="button"
              disabled={!unlocked}
              aria-current={active ? "step" : undefined}
              onClick={() => onSelect(step)}
              className="group flex w-full flex-col gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111] focus-visible:ring-offset-4 disabled:cursor-not-allowed"
            >
              <span className="relative h-[3px] w-full overflow-hidden rounded-full bg-[#e5e5e5]">
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full bg-[#111] transition-[width] duration-500 ease-out",
                    index <= currentIndex ? "w-full" : "w-0",
                  )}
                />
              </span>
              <span
                className={cn(
                  "flex gap-1.5 text-xs transition-colors",
                  active ? "font-semibold text-[#111]" : "text-[#707072]",
                  unlocked && !active && "group-hover:text-[#111]",
                  !unlocked && "opacity-40",
                )}
              >
                <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
