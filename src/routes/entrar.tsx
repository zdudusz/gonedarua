import { createFileRoute, redirect } from "@tanstack/react-router";

// Nao existe mais pagina de login: links antigos abrem o painel do canto esquerdo.
export const Route = createFileRoute("/entrar")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: { entrar: true } });
  },
});
