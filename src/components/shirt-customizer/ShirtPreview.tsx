import type { ReactNode } from "react";
import type { CustomizationSide, PrintArea } from "./customization.types";

import {
  SILHOUETTE_DETAILS,
  SILHOUETTE_PATHS,
  SILHOUETTE_VIEWBOX_H,
  SILHOUETTE_VIEWBOX_W,
  silhouetteTones,
} from "./silhouette";

type ShirtPreviewProps = {
  side: "front" | "back";
  colorHex: string;
  garmentWidthCm: number;
  garmentHeightCm: number;
  printArea?: PrintArea;
  artwork?: CustomizationSide;
  showGuide?: boolean;
  /** Overlay do editor (etapas 3/4); ausente na revisao/carrinho. */
  controls?: ReactNode;
  className?: string;
};

export function ShirtPreview({
  side,
  colorHex,
  garmentWidthCm,
  garmentHeightCm,
  printArea,
  artwork,
  showGuide,
  controls,
  className,
}: ShirtPreviewProps) {
  const tones = silhouetteTones(colorHex);
  const details = SILHOUETTE_DETAILS[side];
  return (
    <div
      className={`shirt-preview ${className ?? ""}`}
      style={{
        position: "relative",
        aspectRatio: `${garmentWidthCm} / ${garmentHeightCm}`,
        width: "100%",
      }}
    >
      <svg
        viewBox={`0 0 ${SILHOUETTE_VIEWBOX_W} ${SILHOUETTE_VIEWBOX_H}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        aria-hidden="true"
      >
        <path
          d={SILHOUETTE_PATHS[side]}
          fill={colorHex}
          stroke={tones.outline}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        {details.neckInside && (
          <>
            <path d={details.neckInside} fill={colorHex} />
            <path
              d={details.neckInside}
              fill={tones.neckInside}
              stroke={tones.outline}
              strokeWidth={3}
            />
          </>
        )}
        {details.seams.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke={tones.seam}
            strokeWidth={2.5}
            strokeDasharray="7 5"
            strokeLinecap="round"
          />
        ))}
      </svg>
      {artwork?.assetUrl && (
        <img
          src={artwork.assetUrl}
          alt=""
          style={{
            position: "absolute",
            left: `${(artwork.x - artwork.width / 2) * 100}%`,
            top: `${(artwork.y - artwork.height / 2) * 100}%`,
            width: `${artwork.width * 100}%`,
            height: `${artwork.height * 100}%`,
            transform: `rotate(${artwork.rotation}deg)`,
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      )}
      {showGuide && printArea && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: `${(printArea.xCm / garmentWidthCm) * 100}%`,
            top: `${(printArea.yCm / garmentHeightCm) * 100}%`,
            width: `${(printArea.widthCm / garmentWidthCm) * 100}%`,
            height: `${(printArea.heightCm / garmentHeightCm) * 100}%`,
            border: "1px dashed var(--border)",
            borderRadius: 2,
          }}
        />
      )}
      {controls}
    </div>
  );
}
