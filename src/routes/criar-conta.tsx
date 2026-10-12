import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { safeRedirect } from "@/lib/redirect";

export const Route = createFileRoute("/criar-conta")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = safeRedirect(search["redirect"]);
    return redirect ? { redirect } : {};
  },
  head: () => ({ meta: [{ title: "Criar conta | Gonê da Rua" }] }),
  component: function CriarConta() {
    const { redirect } = Route.useSearch();
    return <AuthScreen mode="signup" redirect={redirect} />;
  },
});
