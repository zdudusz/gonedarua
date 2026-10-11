import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthResult = { error: string | null; needsConfirmation?: boolean };

type AuthContextValue = {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// claim_store_admin() so promove o e-mail oficial da loja; para qualquer outra
// conta ele so devolve false. Chamar a cada login mantem o admin sem passo extra.
async function resolveAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;
  const { data } = await supabase.rpc("claim_store_admin");
  return Boolean(data);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const apply = async (next: User | null) => {
      const admin = await resolveAdmin(next);
      if (!active) return;
      setUser(next);
      setIsAdmin(admin);
      setLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => void apply(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Fora do callback: o supabase-js trava se outra chamada do client roda aqui dentro.
        setTimeout(() => void apply(session?.user ?? null), 0);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? translateAuthError(error.message) : null };
  };

  const signUp: AuthContextValue["signUp"] = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: typeof window !== "undefined" ? { emailRedirectTo: window.location.origin } : {},
    });
    if (error) return { error: translateAuthError(error.message) };
    return { error: null, needsConfirmation: !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (lower.includes("email not confirmed"))
    return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (lower.includes("already registered")) return "Este e-mail já tem conta. Use Entrar.";
  if (lower.includes("password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  return message;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
