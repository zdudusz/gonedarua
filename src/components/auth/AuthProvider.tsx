import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthResult = { error: string | null; codeSent?: boolean };
export type CodeKind = "login" | "signup";

type AuthContextValue = {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  verifyCode: (email: string, code: string, kind: CodeKind) => Promise<AuthResult>;
  resendCode: (email: string, kind: CodeKind) => Promise<AuthResult>;
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

// Sessao aberta pelo codigo do e-mail (amr "otp") ou pelo link dele ("magiclink").
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

// Token aleatorio deste navegador. O banco guarda so o hash, por 90 dias; com ele
// o login com senha nao pede codigo de novo neste aparelho.
const DEVICE_KEY = "gone-device-token";
function deviceToken(): string {
  try {
    let token = localStorage.getItem(DEVICE_KEY);
    if (!token || token.length < 32) {
      token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      localStorage.setItem(DEVICE_KEY, token);
    }
    return token;
  } catch {
    return "";
  }
}

// claim_store_admin() so promove o e-mail oficial da loja; para qualquer outra
// conta ele so devolve false. Chamar a cada login mantem o admin sem passo extra.
async function resolveAdmin(session: Session | null): Promise<boolean> {
  if (!session) return false;
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
        setTimeout(() => {
          // Entrou pelo codigo (ou pelo link) do e-mail: este navegador vira confiavel.
          if (event === "SIGNED_IN" && sessionUsedEmailCode(session))
            void supabase.rpc("trust_this_device", { _token: deviceToken() });
          void apply(session);
        }, 0);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const redirectTo = () =>
    typeof window !== "undefined" ? { emailRedirectTo: window.location.origin } : {};

  const sendCode = async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // O e-mail tambem traz um link: clicar nele entra direto, como o codigo.
      options: {
        shouldCreateUser: false,
        ...redirectTo(),
      },
    });
    return error ? { error: translateAuthError(error.message) } : { error: null, codeSent: true };
  };

  // Aparelho confiavel (ou a conta da loja) entra direto com a senha; nos outros
  // a senha e conferida a parte e quem abre a sessao e o codigo do e-mail.
  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { data: trusted } = await supabase.rpc("device_is_trusted", {
      _email: email,
      _token: deviceToken(),
    });
    if (trusted) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? translateAuthError(error.message) : null };
    }
    const checker = getPasswordChecker();
    const { error } = await checker.auth.signInWithPassword({ email, password });
    if (error) return { error: translateAuthError(error.message) };
    await checker.auth.signOut();
    return sendCode(email);
  };

  const verifyCode: AuthContextValue["verifyCode"] = async (email, code, kind) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: kind === "signup" ? "signup" : "email",
    });
    return { error: error ? translateAuthError(error.message) : null };
  };

  const resendCode: AuthContextValue["resendCode"] = async (email, kind) => {
    if (kind === "login") return sendCode(email);
    const { error } = await supabase.auth.resend({ type: "signup", email, options: redirectTo() });
    return error ? { error: translateAuthError(error.message) } : { error: null, codeSent: true };
  };

  // Cadastro: o Supabase manda o codigo de 6 digitos para confirmar o e-mail;
  // confirmar o codigo ja abre a sessao.
  const signUp: AuthContextValue["signUp"] = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: redirectTo() });
    if (error) return { error: translateAuthError(error.message) };
    // Com confirmacao por e-mail ligada, o Supabase nao acusa e-mail repetido:
    // devolve um usuario sem identidades. Tratamos como "ja tem conta".
    if (data.user && data.user.identities?.length === 0) return { error: EMAIL_TAKEN };
    return { error: null, codeSent: !data.session };
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
        resendCode,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const EMAIL_TAKEN = "Este e-mail já tem cadastro. Entre com sua senha.";

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (lower.includes("unable to validate email") || lower.includes("invalid format"))
    return "Esse e-mail não parece válido. Confere aí.";
  if (lower.includes("email not confirmed"))
    return "Esse e-mail ainda não foi confirmado. Crie a conta de novo para receber outro código.";
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
