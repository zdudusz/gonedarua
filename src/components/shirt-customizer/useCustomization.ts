import { useMemo, useState } from "react";
import {
  emptySide,
  CUSTOMIZATION_SIZES,
  type CustomizationSide,
  type CustomizationSideName,
  type ShirtColorId,
  type ShirtCustomization,
  type SizeQuantity,
} from "./customization.types";

export const CUSTOMIZER_STEPS = ["camisa", "frente", "costas", "enviar"] as const;
export type CustomizerStep = (typeof CUSTOMIZER_STEPS)[number];

export const STEP_LABELS: Record<CustomizerStep, string> = {
  camisa: "Camisa",
  frente: "Frente",
  costas: "Costas",
  enviar: "Enviar",
};

const HISTORY_LIMIT = 20;

const empty = (): ShirtCustomization => ({
  shirtColor: null,
  front: emptySide(),
  back: emptySide(),
  sizes: CUSTOMIZATION_SIZES.map((s) => ({ ...s })),
});

export function useCustomization() {
  const [stepIndex, setStepIndex] = useState(0);
  const [customization, setCustomizationState] = useState<ShirtCustomization>(empty);
  const [history, setHistory] = useState<ShirtCustomization[]>([]);
  const [future, setFuture] = useState<ShirtCustomization[]>([]);

  const step = CUSTOMIZER_STEPS[stepIndex]!;
  const goToStep = (target: CustomizerStep) => setStepIndex(CUSTOMIZER_STEPS.indexOf(target));
  const next = () => setStepIndex((i) => Math.min(i + 1, CUSTOMIZER_STEPS.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  // Toda mudanca de design passa por aqui: registra o estado anterior no
  // historico (undo) e limpa o redo, como qualquer editor convencional.
  function commit(updater: (current: ShirtCustomization) => ShirtCustomization) {
    setCustomizationState((current) => {
      setHistory((h) => [...h.slice(-HISTORY_LIMIT + 1), current]);
      setFuture([]);
      return updater(current);
    });
  }

  const setShirtColor = (shirtColor: ShirtColorId) => commit((c) => ({ ...c, shirtColor }));

  const updateSide = (side: CustomizationSideName, patch: Partial<CustomizationSide>) =>
    commit((c) => ({ ...c, [side]: { ...c[side], ...patch } }));

  // Remove a imagem por completo (volta ao estado vazio).
  const removeSide = (side: CustomizationSideName) =>
    commit((c) => ({ ...c, [side]: emptySide() }));

  const setSizeQuantity = (sizeId: string, quantity: number) =>
    commit((c) => ({
      ...c,
      sizes: c.sizes.map((s) =>
        s.sizeId === sizeId ? { ...s, quantity: Math.max(0, Math.floor(quantity)) } : s,
      ),
    }));

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const previous = h[h.length - 1]!;
      setFuture((f) => [customization, ...f]);
      setCustomizationState(previous);
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const [nextState, ...rest] = f as [ShirtCustomization, ...ShirtCustomization[]];
      setHistory((h) => [...h, customization]);
      setCustomizationState(nextState);
      return rest;
    });
  };

  const totalQuantity = useMemo(
    () => customization.sizes.reduce((sum: number, s: SizeQuantity) => sum + s.quantity, 0),
    [customization.sizes],
  );

  return {
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
    canUndo: history.length > 0,
    canRedo: future.length > 0,
  };
}
