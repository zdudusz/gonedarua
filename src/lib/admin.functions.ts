import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Confere no servidor o JWT do Supabase enviado pelo navegador (requireSupabaseAuth
// valida a assinatura) e o papel de admin da conta. A rota /editar so abre se isso
// devolver isAdmin: true; as gravacoes em si continuam barradas pelo RLS do banco.
export const verifyAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    // Admin so com sessao aberta pelo codigo do e-mail (mesma regra do banco).
    const amr = Array.isArray(context.claims.amr)
      ? (context.claims.amr as { method?: string }[])
      : [];
    const usedEmailCode = amr.some((m) => m?.method === "otp" || m?.method === "magiclink");
    return {
      userId: context.userId,
      email: typeof context.claims.email === "string" ? context.claims.email : null,
      isAdmin: data?.role === "admin" && usedEmailCode,
    };
  });
