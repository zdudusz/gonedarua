import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, Crosshair, Info, Redo2, Trash2, Undo2 } from "lucide-react";
import {
  clampSideToPrintArea,
  fitSideToPrintArea,
  maxSideWidth,
  sideAreaCm2,
} from "@/lib/customization-geometry";
import { isLowResolutionForPrint, type ReadArtworkResult } from "@/lib/image-validation";
import { ArtworkUploader } from "./ArtworkUploader";
import type { CustomizationSide, CustomizationSideName, PrintArea } from "./customization.types";

type Props = {
  side: CustomizationSideName;
  value: CustomizationSide;
  naturalSizePx: { width: number; height: number } | null;
  garmentWidthCm: number;
  garmentHeightCm: number;
  printArea: PrintArea;
  exceeded: boolean;
  onChange: (patch: Partial<CustomizationSide>) => void;
  onUploaded: (result: ReadArtworkResult) => void;
  onRemove: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const MIN_WIDTH = 0.05;

const iconButton =
  "grid h-11 w-11 place-items-center rounded-full border border-[#e5e5e5] transition-colors hover:border-[#111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111] disabled:pointer-events-none disabled:opacity-30";

function Slider({
  label,
  valueLabel,
  fillPct,
  children,
}: {
  label: string;
  valueLabel: string;
  fillPct: number;
  children: ReactNode;
}) {
  return (
    <label className="block" style={{ "--cz-fill": `${fillPct}%` } as CSSProperties}>
      <span className="flex items-baseline justify-between">
        <span className="cz-eyebrow">{label}</span>
        <span className="text-sm tabular-nums text-[#707072]">{valueLabel}</span>
      </span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

export function ArtworkPanel({
  side,
  value,
  naturalSizePx,
  garmentWidthCm,
  garmentHeightCm,
  printArea,
  exceeded,
  onChange,
  onUploaded,
  onRemove,
  undo,
  redo,
  canUndo,
  canRedo,
}: Props) {
  const sideLabel = side === "front" ? "da frente" : "das costas";
  const center = {
    x: (printArea.xCm + printArea.widthCm / 2) / garmentWidthCm,
    y: (printArea.yCm + printArea.heightCm / 2) / garmentHeightCm,
  };

  // Posiciona a arte recem-enviada centralizada na area de impressao, ocupando
  // 70% do que couber mantendo a proporcao da imagem.
  function placeUploaded(result: ReadArtworkResult) {
    const aspect = result.naturalWidthPx / result.naturalHeightPx;
    const widthCm = Math.min(printArea.widthCm, printArea.heightCm * aspect) * 0.7;
    const heightCm = widthCm / aspect;
    onChange({
      assetId: crypto.randomUUID(),
      assetUrl: result.url,
      ...center,
      width: widthCm / garmentWidthCm,
      height: heightCm / garmentHeightCm,
      rotation: 0,
    });
    onUploaded(result);
  }

  if (!value.assetUrl) {
    return (
      <div className="flex flex-col gap-5">
        <ArtworkUploader label="escolha um arquivo" onUploaded={placeUploaded} />
        <ul className="grid gap-3 text-sm text-[#707072]">
          <li className="flex gap-3">
            <Info size={17} className="mt-0.5 shrink-0 text-[#111]" aria-hidden="true" />
            Área de impressão {sideLabel}: até {printArea.widthCm} × {printArea.heightCm} cm.
          </li>
          <li className="flex gap-3">
            <Info size={17} className="mt-0.5 shrink-0 text-[#111]" aria-hidden="true" />
            PNG com fundo transparente dá o melhor resultado na camisa.
          </li>
          <li className="flex gap-3">
            <Info size={17} className="mt-0.5 shrink-0 text-[#111]" aria-hidden="true" />
            Não quer estampa {sideLabel}? É só pular esta etapa.
          </li>
        </ul>
      </div>
    );
  }

  const { widthCm, heightCm } = sideAreaCm2(value, garmentWidthCm, garmentHeightCm);
  const aspect = widthCm / (heightCm || 1);
  const rotationSigned = value.rotation > 180 ? value.rotation - 360 : value.rotation;
  const lowRes = naturalSizePx
    ? isLowResolutionForPrint(
        naturalSizePx.width,
        naturalSizePx.height,
        printArea.widthCm,
        printArea.heightCm,
      )
    : false;

  // Limite do slider: a arte nunca cresce alem do que cabe na area de impressao.
  const maxWidth = maxSideWidth(value, printArea, garmentWidthCm, garmentHeightCm);

  // Redimensiona em torno do centro e, se encostar na borda, empurra pra dentro.
  function setWidthFraction(widthFraction: number) {
    const heightFraction = (widthFraction * garmentWidthCm) / aspect / garmentHeightCm;
    const resized = { ...value, width: widthFraction, height: heightFraction };
    onChange(clampSideToPrintArea(resized, printArea, garmentWidthCm, garmentHeightCm));
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center gap-4 rounded-2xl bg-[#f5f5f5] p-3">
        <img
          src={value.assetUrl}
          alt=""
          className="h-16 w-16 rounded-xl bg-white object-contain p-1.5"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Sua arte</p>
          <p className="text-sm tabular-nums text-[#707072]">
            {widthCm.toFixed(1)} × {heightCm.toFixed(1)} cm
          </p>
          <div className="mt-1">
            <ArtworkUploader label="Trocar imagem" variant="button" onUploaded={placeUploaded} />
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover arte"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#707072] transition-colors hover:bg-white hover:text-[#d30005]"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {exceeded && (
        <div
          role="alert"
          className="animate-in fade-in slide-in-from-top-1 rounded-2xl border border-[#d30005]/20 bg-[#fff1f1] p-4"
        >
          <p className="flex gap-3 text-sm text-[#b00004]">
            <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />A arte passou da área
            de impressão. Diminua ou reposicione para continuar.
          </p>
          <button
            type="button"
            onClick={() =>
              onChange(fitSideToPrintArea(value, printArea, garmentWidthCm, garmentHeightCm))
            }
            className="ml-[30px] mt-3 h-10 rounded-full bg-[#111] px-5 text-sm font-medium text-white transition-opacity hover:opacity-80"
          >
            Ajustar automaticamente
          </button>
        </div>
      )}
      {lowRes && (
        <p role="status" className="flex gap-3 rounded-2xl bg-[#fff6e8] p-4 text-sm text-[#7a3d00]">
          <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
          Resolução baixa para esse tamanho: a estampa pode sair borrada. Se puder, envie uma versão
          maior.
        </p>
      )}

      <Slider
        label="Tamanho"
        valueLabel={`${widthCm.toFixed(0)} cm de largura`}
        fillPct={Math.min(100, ((value.width - MIN_WIDTH) / (maxWidth - MIN_WIDTH)) * 100)}
      >
        <input
          type="range"
          min={MIN_WIDTH}
          max={maxWidth}
          step={0.005}
          value={value.width}
          onChange={(e) => setWidthFraction(Number(e.target.value))}
        />
      </Slider>

      <Slider
        label="Rotação"
        valueLabel={`${Math.round(rotationSigned)}°`}
        fillPct={((rotationSigned + 180) / 360) * 100}
      >
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={rotationSigned}
          onChange={(e) => onChange({ rotation: (Number(e.target.value) + 360) % 360 })}
        />
      </Slider>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...center, rotation: 0 })}
          className="flex h-11 items-center gap-2 rounded-full border border-[#e5e5e5] px-5 text-sm font-medium transition-colors hover:border-[#111]"
        >
          <Crosshair size={16} aria-hidden="true" /> Centralizar
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          aria-label="Desfazer"
          title="Desfazer"
          className={iconButton}
        >
          <Undo2 size={17} />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          aria-label="Refazer"
          title="Refazer"
          className={iconButton}
        >
          <Redo2 size={17} />
        </button>
      </div>
    </div>
  );
}
