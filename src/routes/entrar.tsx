import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { safeRedirect } from "@/lib/redirect";

export const Route = createFileRoute("/entrar")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = safeRedirect(search["redirect"]);
    return redirect ? { redirect } : {};
  },
  head: () => ({ meta: [{ title: "Entrar | Gonê da Rua" }] }),
  component: function Entrar() {
    const { redirect } = Route.useSearch();
    return <AuthScreen mode="login" redirect={redirect} />;
  },
});
