// So aceita caminhos internos ("/editar"), nunca outro dominio ("//x.com").
export function safeRedirect(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : undefined;
}
