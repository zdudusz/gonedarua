import { createFileRoute } from "@tanstack/react-router";
import { ShirtCustomizer } from "@/components/shirt-customizer/ShirtCustomizer";

export const Route = createFileRoute("/personalizar")({
  head: () => ({
    meta: [{ title: "Personalizar camiseta | Gonê da Rua" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: () => <ShirtCustomizer />,
});
