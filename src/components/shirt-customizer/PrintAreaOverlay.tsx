import { Rect } from "react-konva";

type Props = {
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
  exceeded: boolean;
  onDark: boolean;
};

// Guia discreta da area de impressao dentro do canvas do editor. Fica vermelha
// quando a arte ultrapassa o limite -- mas o aviso real (texto, nao só cor) fica
// no painel, pra não depender só da cor.
export function PrintAreaOverlay({ xPx, yPx, widthPx, heightPx, exceeded, onDark }: Props) {
  return (
    <Rect
      x={xPx}
      y={yPx}
      width={widthPx}
      height={heightPx}
      stroke={exceeded ? "#d30005" : onDark ? "#707072" : "#9e9ea0"}
      strokeWidth={exceeded ? 2 : 1}
      dash={[6, 5]}
      cornerRadius={4}
      listening={false}
    />
  );
}
