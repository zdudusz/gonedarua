import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthResult = { error: string | null; needsConfirmation?: boolean; codeSent?: boolean };

type AuthContextValue = {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  verifyCode: (email: string, code: string) => Promise<AuthResult>;
  resendCode: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Login em dois passos: a senha e conferida num client a parte, sem sessao
// salva, e logo descartada; quem abre a sessao de verdade e o codigo de 6
// digitos que o Supabase manda por e-mail (verifyOtp).
let passwordChecker: ReturnType<typeof createClient> | undefined;
function getPasswordChecker() {
  const key: string = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  passwordChecker ??= createClient(import.meta.env["VITE_SUPABASE_URL"], key, {
    // Mesmo ajuste do client principal: chave sb_publishable_ nao e um JWT.
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "gone-password-check",
    },
  });
  return passwordChecker;
}

// O banco so reconhece o admin numa sessao aberta pelo codigo do e-mail
// (amr "otp"/"magiclink"); a tela segue a mesma regra.
function sessionUsedEmailCode(session: Session | null): boolean {
  if (!session) return false;
  try {
    const payload = session.access_token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(payload)) as { amr?: { method?: string }[] };
    return (claims.amr ?? []).some((m) => m.method === "otp" || m.method === "magiclink");
  } catch {
    return false;
  }
}

// claim_store_admin() so promove o e-mail oficial da loja; para qualquer outra
// conta ele so devolve false. Chamar a cada login mantem o admin sem passo extra.
async function resolveAdmin(session: Session | null): Promise<boolean> {
  if (!session || !sessionUsedEmailCode(session)) return false;
  const { data } = await supabase.rpc("claim_store_admin");
  return Boolean(data);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const apply = async (session: Session | null) => {
      const admin = await resolveAdmin(session);
      if (!active) return;
      setUser(session?.user ?? null);
      setIsAdmin(admin);
      setLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => void apply(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Fora do callback: o supabase-js trava se outra chamada do client roda aqui dentro.
        setTimeout(() => void apply(session), 0);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const sendCode = async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // O e-mail tambem traz um link: clicar nele entra direto, como o codigo.
      options: {
        shouldCreateUser: false,
        ...(typeof window !== "undefined" ? { emailRedirectTo: window.location.origin } : {}),
      },
    });
    return error ? { error: translateAuthError(error.message) } : { error: null, codeSent: true };
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const checker = getPasswordChecker();
    const { error } = await checker.auth.signInWithPassword({ email, password });
    if (error) return { error: translateAuthError(error.message) };
    await checker.auth.signOut();
    return sendCode(email);
  };

  const verifyCode: AuthContextValue["verifyCode"] = async (email, code) => {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    return { error: error ? translateAuthError(error.message) : null };
  };

  const signUp: AuthContextValue["signUp"] = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: typeof window !== "undefined" ? { emailRedirectTo: window.location.origin } : {},
    });
    if (error) return { error: translateAuthError(error.message) };
    // Com confirmacao por e-mail ligada, o Supabase nao acusa e-mail repetido:
    // devolve um usuario sem identidades. Tratamos como "ja tem conta".
    if (data.user && data.user.identities?.length === 0) return { error: EMAIL_TAKEN };
    return { error: null, needsConfirmation: !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        signIn,
        signUp,
        verifyCode,
        resendCode: sendCode,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const EMAIL_TAKEN = "Este e-mail já tem conta. Use Entrar.";

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (lower.includes("email not confirmed"))
    return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (lower.includes("already registered")) return EMAIL_TAKEN;
  if (lower.includes("token has expired") || lower.includes("invalid"))
    return "Código inválido ou expirado. Confira ou peça outro.";
  if (lower.includes("rate limit") || lower.includes("only request this after"))
    return "Muitos pedidos de código. Espere um minuto e tente de novo.";
  if (lower.includes("password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  return message;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
