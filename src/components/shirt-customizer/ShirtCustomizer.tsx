import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import logoAsset from "@/assets/logo.webp.asset.json";
import { cn } from "@/lib/utils";
import { calculateCustomizationPrice, formatMoney } from "@/lib/customization-pricing";
import { formatCm, isWithinPrintArea, sideAreaCm2 } from "@/lib/customization-geometry";
import { ArtworkCanvas } from "./ArtworkCanvas";
import { ArtworkPanel } from "./ArtworkPanel";
import { CustomizerStepper } from "./CustomizerStepper";
import { SendOrderStep } from "./SendOrderStep";
import { ShirtPicker } from "./ShirtPicker";
import { ShirtPreview } from "./ShirtPreview";
import { CUSTOMIZER_STEPS, useCustomization, type CustomizerStep } from "./useCustomization";
import {
  CUSTOM_SHIRT_CONFIG,
  SHIRT_COLORS,
  type CustomizationSideName,
} from "./customization.types";

const { garmentWidthCm, garmentHeightCm, pricing } = CUSTOM_SHIRT_CONFIG;
const printAreaOf = (side: CustomizationSideName) =>
  side === "front" ? CUSTOM_SHIRT_CONFIG.frontPrintArea : CUSTOM_SHIRT_CONFIG.backPrintArea;

const STEP_COPY: Record<CustomizerStep, { title: [string, string]; description: string }> = {
  camisa: {
    title: ["Escolha", "sua camisa"],
    description: "Preta ou branca. É a base de tudo que vem depois.",
  },
  frente: {
    title: ["Estampa", "da frente"],
    description: "Suba sua arte e ajuste tamanho, posição e rotação direto na camisa.",
  },
  costas: {
    title: ["Estampa", "das costas"],
    description: "Uma arte nas costas completa a peça. Se preferir, pule esta etapa.",
  },
  enviar: {
    title: ["Revise", "e envie"],
    description: "Escolha os tamanhos e mande o pedido direto para a loja.",
  },
};

const SIDE_NAME: Record<CustomizationSideName, string> = { front: "Frente", back: "Costas" };

type NaturalSize = { width: number; height: number } | null;

export function ShirtCustomizer() {
  const {
    step,
    stepIndex,
    goToStep,
    next,
    back,
    customization,
    setShirtColor,
    updateSide,
    removeSide,
    setSizeQuantity,
    totalQuantity,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCustomization();
  const [view, setView] = useState<CustomizationSideName>("front");
  const [naturalSize, setNaturalSize] = useState<Record<CustomizationSideName, NaturalSize>>({
    front: null,
    back: null,
  });

  const color = SHIRT_COLORS.find((c) => c.id === customization.shirtColor) ?? null;
  const shirtHex = color?.hex ?? SHIRT_COLORS[0].hex;
  const isOutside = (side: CustomizationSideName) =>
    !isWithinPrintArea(customization[side], printAreaOf(side), garmentWidthCm, garmentHeightCm);
  const exceeded = { front: isOutside("front"), back: isOutside("back") };
  const dims = {
    front: sideAreaCm2(customization.front, garmentWidthCm, garmentHeightCm),
    back: sideAreaCm2(customization.back, garmentWidthCm, garmentHeightCm),
  };
  const unitPrice = calculateCustomizationPrice(pricing, dims.front.areaCm2, dims.back.areaCm2);
  const hasArt = !!(customization.front.assetUrl || customization.back.assetUrl);
  const readyToSend = hasArt && !exceeded.front && !exceeded.back;

  const maxUnlockedIndex = !color
    ? 0
    : readyToSend
      ? CUSTOMIZER_STEPS.indexOf("enviar")
      : CUSTOMIZER_STEPS.indexOf("costas");
  useEffect(() => {
    if (stepIndex > maxUnlockedIndex) goToStep(CUSTOMIZER_STEPS[maxUnlockedIndex]!);
  }, [maxUnlockedIndex, stepIndex, goToStep]);

  // Nas etapas de edicao a vista acompanha a etapa; nas outras o cliente alterna.
  const editingSide: CustomizationSideName | null =
    step === "frente" ? "front" : step === "costas" ? "back" : null;
  const activeView = editingSide ?? view;

  function selectView(side: CustomizationSideName) {
    if (editingSide) goToStep(side === "front" ? "frente" : "costas");
    else setView(side);
  }

  const describeSide = (side: CustomizationSideName) =>
    customization[side].assetUrl
      ? `Estampa ${formatCm(dims[side].widthCm)} × ${formatCm(dims[side].heightCm)} cm`
      : "Sem estampa";

  const nextStep = CUSTOMIZER_STEPS[stepIndex + 1];
  const nextDisabled =
    !nextStep ||
    (step === "camisa" && !color) ||
    (editingSide !== null && exceeded[editingSide]) ||
    (step === "costas" && !readyToSend);
  // Nas costas, a frente fora da area tambem bloqueia o envio (da pra chegar aqui
  // pela aba/barra de progresso): o aviso precisa dizer isso e levar ate a frente.
  const frontBlocksSend = step === "costas" && exceeded.front;
  const nextHint =
    step === "camisa" && !color
      ? "Escolha uma cor para continuar."
      : step === "costas" && !hasArt
        ? "Envie uma arte na frente ou nas costas para continuar."
        : editingSide && exceeded[editingSide]
          ? "Ajuste a arte para dentro da área de impressão."
          : frontBlocksSend
            ? "A arte da frente está fora da área de impressão."
            : "";
  const nextLabel =
    editingSide && !customization[editingSide].assetUrl
      ? `Pular ${editingSide === "front" ? "frente" : "costas"}`
      : "Continuar";

  // Palavra gigante ao fundo do palco, estilo campanha.
  const stageWord =
    step === "camisa"
      ? (color?.name ?? "Sua camisa")
      : step === "enviar"
        ? "Pronta"
        : SIDE_NAME[activeView];

  const copy = STEP_COPY[step];

  return (
    <div className="customizer min-h-dvh">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#e5e5e5] bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
        <Link to="/" aria-label="Voltar para a loja" className="flex items-center gap-3">
          <img src={logoAsset.url} alt="Gonê da Rua" className="h-8 w-auto" />
        </Link>
        <p className="cz-eyebrow hidden sm:block">Camisa personalizada</p>
        <Link
          to="/"
          className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-[#f5f5f5]"
          aria-label="Sair do personalizador"
        >
          <X size={22} />
        </Link>
      </header>

      <main className="lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(440px,500px)]">
        {/* Palco */}
        <section
          aria-label="Prévia da camisa"
          className="relative h-[54vh] min-h-[380px] overflow-hidden bg-[#f5f5f5] lg:m-3 lg:mr-0 lg:h-auto lg:min-h-0 lg:rounded-[28px]"
        >
          <div
            key={stageWord}
            aria-hidden="true"
            className="animate-in fade-in zoom-in-95 pointer-events-none absolute inset-0 flex select-none items-center justify-center duration-500"
          >
            <span className="cz-display whitespace-nowrap text-[clamp(6rem,24vw,13rem)] text-[#ebebeb] lg:text-[clamp(9rem,16vw,22rem)]">
              {stageWord}
            </span>
          </div>

          <div className="absolute inset-0 px-10 pb-16 pt-16 lg:px-28 lg:pb-24 lg:pt-24">
            {editingSide ? (
              <ArtworkCanvas
                key={editingSide}
                side={editingSide}
                value={customization[editingSide]}
                colorHex={shirtHex}
                garmentWidthCm={garmentWidthCm}
                garmentHeightCm={garmentHeightCm}
                printArea={printAreaOf(editingSide)}
                exceeded={exceeded[editingSide]}
                onChange={(patch) => updateSide(editingSide, patch)}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div
                  key={`${activeView}-${shirtHex}`}
                  className="animate-in fade-in aspect-[60/76] h-full max-w-full drop-shadow-[0_24px_32px_rgba(0,0,0,0.14)] duration-300"
                >
                  <ShirtPreview
                    side={activeView}
                    colorHex={shirtHex}
                    garmentWidthCm={garmentWidthCm}
                    garmentHeightCm={garmentHeightCm}
                    artwork={customization[activeView]}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2 lg:inset-x-6 lg:top-6">
            <span className="flex h-9 items-center gap-2 rounded-full bg-white px-4 text-xs font-medium shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#007d48] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#007d48]" />
              </span>
              Prévia ao vivo
            </span>
            <div
              role="tablist"
              aria-label="Vista da camisa"
              className="flex rounded-full bg-white p-1 shadow-sm"
            >
              {(["front", "back"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  role="tab"
                  aria-selected={activeView === side}
                  onClick={() => selectView(side)}
                  className={cn(
                    "h-7 rounded-full px-4 text-xs font-semibold transition-colors",
                    activeView === side
                      ? "bg-[#111] text-white"
                      : "text-[#707072] hover:text-[#111]",
                  )}
                >
                  {SIDE_NAME[side]}
                </button>
              ))}
            </div>
          </div>

          {editingSide && customization[editingSide].assetUrl && (
            <p className="absolute inset-x-0 bottom-4 hidden text-center text-xs text-[#707072] sm:block lg:bottom-6">
              Arraste para mover · Use os cantos para redimensionar e girar
            </p>
          )}
        </section>

        {/* Painel */}
        <section className="flex flex-col lg:min-h-0" aria-labelledby="cz-step-title">
          <div className="flex-1 px-6 pb-48 pt-10 sm:px-10 lg:overflow-y-auto lg:px-12 lg:pb-10">
            <div key={step} className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <p className="cz-eyebrow text-[var(--accent)]">
                Passo {String(stepIndex + 1).padStart(2, "0")} /{" "}
                {String(CUSTOMIZER_STEPS.length).padStart(2, "0")}
              </p>
              <h1 id="cz-step-title" className="cz-display mt-3 text-[56px] sm:text-7xl">
                {copy.title[0]}
                <br />
                {copy.title[1]}
              </h1>
              <p className="mt-4 max-w-sm text-[17px] leading-relaxed text-[#707072]">
                {copy.description}
              </p>

              <div className="mt-9">
                {step === "camisa" && (
                  <ShirtPicker
                    selected={customization.shirtColor}
                    onSelect={(c) => setShirtColor(c.id)}
                  />
                )}
                {editingSide && color && (
                  <ArtworkPanel
                    key={editingSide}
                    side={editingSide}
                    value={customization[editingSide]}
                    naturalSizePx={naturalSize[editingSide]}
                    garmentWidthCm={garmentWidthCm}
                    garmentHeightCm={garmentHeightCm}
                    printArea={printAreaOf(editingSide)}
                    exceeded={exceeded[editingSide]}
                    onChange={(patch) => updateSide(editingSide, patch)}
                    onUploaded={(r) =>
                      setNaturalSize((s) => ({
                        ...s,
                        [editingSide]: { width: r.naturalWidthPx, height: r.naturalHeightPx },
                      }))
                    }
                    onRemove={() => {
                      removeSide(editingSide);
                      setNaturalSize((s) => ({ ...s, [editingSide]: null }));
                    }}
                    undo={undo}
                    redo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                  />
                )}
                {step === "enviar" && color && (
                  <SendOrderStep
                    customization={customization}
                    color={color}
                    unitPrice={unitPrice}
                    totalQuantity={totalQuantity}
                    describeSide={describeSide}
                    onSizeChange={setSizeQuantity}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Rodape: progresso, preco e navegacao (fixo no celular) */}
          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#e5e5e5] bg-white/95 px-6 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4 backdrop-blur-md sm:px-10 lg:static lg:px-12 lg:pb-6 lg:pt-5">
            <CustomizerStepper
              currentIndex={stepIndex}
              maxUnlockedIndex={maxUnlockedIndex}
              onSelect={goToStep}
            />
            <div className="mt-4 flex items-center gap-3">
              <div className="mr-auto min-w-0">
                <p className="text-xs text-[#707072]">Estimado por peça</p>
                <p className="cz-display text-3xl tabular-nums">{formatMoney(unitPrice)}</p>
              </div>
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={back}
                  aria-label="Etapa anterior"
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#cacacb] transition-colors hover:border-[#111]"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              {nextStep && (
                <button
                  type="button"
                  onClick={next}
                  disabled={nextDisabled}
                  className="group flex h-14 items-center gap-2 rounded-full bg-[#111] pl-7 pr-6 font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-25"
                >
                  {nextLabel}
                  <ArrowRight
                    size={18}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </button>
              )}
            </div>
            {nextHint && (
              <p className="mt-2 text-right text-xs text-[#707072]" role="status">
                {nextHint}
                {frontBlocksSend && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => goToStep("frente")}
                      className="font-semibold text-[#111] underline underline-offset-4"
                    >
                      Corrigir frente
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
