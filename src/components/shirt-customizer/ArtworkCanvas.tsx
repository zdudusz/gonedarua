import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Path, Image as KonvaImage, Transformer } from "react-konva";
import type Konva from "konva";
import { clampSideToPrintArea } from "@/lib/customization-geometry";
import { PrintAreaOverlay } from "./PrintAreaOverlay";
import { useHtmlImage } from "./useArtworkEditor";
import {
  SILHOUETTE_DETAILS,
  SILHOUETTE_PATHS,
  SILHOUETTE_VIEWBOX_W,
  silhouetteTones,
} from "./silhouette";
import type { CustomizationSide, PrintArea } from "./customization.types";

const NUDGE_CM = 0.3;
const NUDGE_CM_LARGE = 1.5;

type Props = {
  side: "front" | "back";
  value: CustomizationSide;
  colorHex: string;
  garmentWidthCm: number;
  garmentHeightCm: number;
  printArea: PrintArea;
  exceeded: boolean;
  onChange: (patch: Partial<CustomizationSide>) => void;
};

// Canvas interativo (Konva): camiseta + guia da area de impressao + arte arrastavel,
// redimensionavel e giravel. Ocupa o maior espaco que couber no container pai,
// mantendo a proporcao fisica da camiseta.
export function ArtworkCanvas({
  side,
  value,
  colorHex,
  garmentWidthCm,
  garmentHeightCm,
  printArea,
  exceeded,
  onChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [stageWidthPx, setStageWidthPx] = useState(360);
  const image = useHtmlImage(value.assetUrl);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const byHeight =
        rect.height > 0 ? (rect.height * garmentWidthCm) / garmentHeightCm : Infinity;
      setStageWidthPx(Math.max(220, Math.min(rect.width, byHeight, 520)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [garmentWidthCm, garmentHeightCm]);

  const stageHeightPx = (stageWidthPx * garmentHeightCm) / garmentWidthCm;
  const pxPerCmX = stageWidthPx / garmentWidthCm;
  const pxPerCmY = stageHeightPx / garmentHeightCm;
  const scaleToStage = stageWidthPx / SILHOUETTE_VIEWBOX_W;

  useEffect(() => {
    if (image && transformerRef.current && imageRef.current) {
      transformerRef.current.nodes([imageRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [image]);

  function commitNodeGeometry() {
    const node = imageRef.current;
    if (!node) return;
    const widthPx = node.width() * node.scaleX();
    const heightPx = node.height() * node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    node.width(widthPx);
    node.height(heightPx);
    const next = {
      ...value,
      x: node.x() / stageWidthPx,
      y: node.y() / stageHeightPx,
      width: widthPx / stageWidthPx,
      height: heightPx / stageHeightPx,
      rotation: node.rotation(),
    };
    onChange(clampSideToPrintArea(next, printArea, garmentWidthCm, garmentHeightCm));
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!value.assetId) return;
    const deltaCm = event.shiftKey ? NUDGE_CM_LARGE : NUDGE_CM;
    let dx = 0,
      dy = 0;
    if (event.key === "ArrowLeft") dx = -deltaCm;
    else if (event.key === "ArrowRight") dx = deltaCm;
    else if (event.key === "ArrowUp") dy = -deltaCm;
    else if (event.key === "ArrowDown") dy = deltaCm;
    else return;
    event.preventDefault();
    const moved = { ...value, x: value.x + dx / garmentWidthCm, y: value.y + dy / garmentHeightCm };
    onChange(clampSideToPrintArea(moved, printArea, garmentWidthCm, garmentHeightCm));
  }

  const imageWidthPx = value.width * stageWidthPx;
  const imageHeightPx = value.height * stageHeightPx;

  // Arrastar nunca tira a arte da area de impressao: o centro fica preso ao
  // intervalo em que o retangulo inteiro cabe (se a arte for maior que a area,
  // fica centralizada naquele eixo). Mesma regra de isWithinPrintArea.
  function clampAxis(center: number, half: number, start: number, size: number) {
    const min = start + half;
    const max = start + size - half;
    return min > max ? start + size / 2 : Math.min(Math.max(center, min), max);
  }
  function dragBound(pos: { x: number; y: number }) {
    return {
      x: clampAxis(pos.x, imageWidthPx / 2, printArea.xCm * pxPerCmX, printArea.widthCm * pxPerCmX),
      y: clampAxis(
        pos.y,
        imageHeightPx / 2,
        printArea.yCm * pxPerCmY,
        printArea.heightCm * pxPerCmY,
      ),
    };
  }
  const tones = silhouetteTones(colorHex);
  const details = SILHOUETTE_DETAILS[side];
  const isDarkShirt = tones.outline === "#000000";
  const shapeScale = { scaleX: scaleToStage, scaleY: scaleToStage, listening: false };

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center">
      <div
        role="application"
        aria-label={`Editor da estampa ${side === "front" ? "da frente" : "das costas"}. Use as setas do teclado para mover.`}
        tabIndex={value.assetId ? 0 : -1}
        onKeyDown={handleKeyDown}
        className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#111]"
        style={{ width: stageWidthPx, height: stageHeightPx }}
      >
        <Stage width={stageWidthPx} height={stageHeightPx}>
          <Layer>
            <Path
              data={SILHOUETTE_PATHS[side]}
              fill={colorHex}
              stroke={tones.outline}
              strokeWidth={3}
              {...shapeScale}
              shadowColor="#000000"
              shadowOpacity={0.12}
              shadowBlur={24}
              shadowOffsetY={10}
            />
            {details.neckInside && (
              <>
                <Path data={details.neckInside} fill={colorHex} {...shapeScale} />
                <Path
                  data={details.neckInside}
                  fill={tones.neckInside}
                  stroke={tones.outline}
                  strokeWidth={3}
                  {...shapeScale}
                />
              </>
            )}
            {details.seams.map((d) => (
              <Path
                key={d}
                data={d}
                stroke={tones.seam}
                strokeWidth={2.5}
                dash={[7, 5]}
                lineCap="round"
                {...shapeScale}
              />
            ))}
            <PrintAreaOverlay
              xPx={printArea.xCm * pxPerCmX}
              yPx={printArea.yCm * pxPerCmY}
              widthPx={printArea.widthCm * pxPerCmX}
              heightPx={printArea.heightCm * pxPerCmY}
              exceeded={exceeded}
              onDark={isDarkShirt}
            />
            {image && (
              <KonvaImage
                ref={imageRef}
                image={image}
                x={value.x * stageWidthPx}
                y={value.y * stageHeightPx}
                width={imageWidthPx}
                height={imageHeightPx}
                offsetX={imageWidthPx / 2}
                offsetY={imageHeightPx / 2}
                rotation={value.rotation}
                draggable
                dragBoundFunc={dragBound}
                onDragEnd={commitNodeGeometry}
                onTransformEnd={commitNodeGeometry}
              />
            )}
            {image && (
              <Transformer
                ref={transformerRef}
                rotateEnabled
                keepRatio
                enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
                anchorSize={10}
                anchorCornerRadius={5}
                anchorStroke="#111111"
                anchorFill="#ffffff"
                borderStroke={isDarkShirt ? "#ffffff" : "#111111"}
                rotateAnchorOffset={24}
                // Pelos cantos a arte nao fica menor que 20px nem maior que a area.
                boundBoxFunc={(oldBox, newBox) =>
                  newBox.width < 20 ||
                  newBox.height < 20 ||
                  newBox.width > printArea.widthCm * pxPerCmX + 0.5 ||
                  newBox.height > printArea.heightCm * pxPerCmY + 0.5
                    ? oldBox
                    : newBox
                }
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
