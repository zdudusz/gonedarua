import { useState, type ChangeEvent, type DragEvent } from "react";
import { ArrowUpFromLine, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  validateArtworkFile,
  readArtworkImage,
  type ReadArtworkResult,
} from "@/lib/image-validation";

type Props = {
  label: string;
  onUploaded: (result: ReadArtworkResult) => void;
  /** "dropzone": area grande de arrastar/soltar; "button": so um link de texto. */
  variant?: "dropzone" | "button";
};

export function ArtworkUploader({ label, onUploaded, variant = "dropzone" }: Props) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      validateArtworkFile(file);
      onUploaded(await readArtworkImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    void handleFile(file);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files[0]);
  }

  const input = (
    <input
      type="file"
      accept="image/png,image/jpeg,image/webp"
      className="sr-only"
      onChange={onInput}
      aria-label={label}
    />
  );

  return (
    <div>
      {variant === "button" ? (
        <label className="cursor-pointer text-sm font-medium underline underline-offset-4 hover:text-[#707072] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#111]">
          {busy ? "Preparando..." : label}
          {input}
        </label>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200",
            "has-[:focus-visible]:border-[#111] has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#111]/10",
            dragging
              ? "scale-[1.01] border-[#111] bg-[#f5f5f5]"
              : "border-[#cacacb] hover:border-[#111] hover:bg-[#fafafa]",
          )}
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#111] text-white transition-transform duration-200 group-hover:-translate-y-1">
            {busy ? (
              <Loader2 size={26} className="animate-spin" aria-hidden="true" />
            ) : (
              <ArrowUpFromLine size={26} aria-hidden="true" />
            )}
          </span>
          <span className="cz-display mt-5 text-4xl">
            {busy ? "Preparando" : dragging ? "Pode soltar" : "Solte sua arte"}
          </span>
          <span className="mt-2 text-[15px] text-[#707072]">
            ou <span className="font-medium text-[#111] underline underline-offset-4">{label}</span>
          </span>
          <span className="mt-5 text-xs text-[#707072]">PNG, JPG ou WebP · até 10 MB</span>
          {input}
        </label>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-[#d30005]">
          {error}
        </p>
      )}
    </div>
  );
}
