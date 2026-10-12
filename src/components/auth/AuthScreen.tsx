import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LogOut, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fallbackStore, storeHighlight, type Store } from "@/lib/store";
import { useAuth } from "./AuthProvider";

type Mode = "login" | "signup";

const COPY = {
  login: {
    eyebrow: "DE VOLTA PRA RUA",
    title: ["ENTRA", "AÍ."],
    intro: "Entre com e-mail e senha. Depois mandamos um código de 6 dígitos pro seu e-mail.",
    submit: "ENTRAR",
    switchText: "Ainda não tem conta?",
    switchLink: "CRIAR CONTA",
  },
  signup: {
    eyebrow: "NOVO NA QUEBRADA",
    title: ["CHEGA", "MAIS."],
    intro: "Crie sua conta em segundos. Só precisa de e-mail e senha.",
    submit: "CRIAR MINHA CONTA",
    switchText: "Já tem conta?",
    switchLink: "ENTRAR",
  },
} as const;

const ROWS = ["GONÊ DA RUA", "OVERSIZED", "DA RUA PRA RUA", "ARTE SEM LICENÇA", "GONÊ DA RUA"];

// Forca da senha so como dica visual; o Supabase decide o minimo real (6).
function passwordScore(password: string) {
  if (!password) return 0;
  let score = password.length >= 6 ? 1 : 0;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}
const SCORE_LABEL = ["", "FRACA", "OK", "BOA", "FORTE"];

export function AuthScreen({ mode, redirect }: { mode: Mode; redirect?: string | undefined }) {
  const { user, isAdmin, loading, signIn, signUp, verifyCode, resendCode, signOut } = useAuth();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store>(fallbackStore);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  // Depois da senha certa, o login pede o codigo de 6 digitos enviado ao e-mail.
  const [codeStep, setCodeStep] = useState(false);
  const [code, setCode] = useState("");
  // Cadastro aguardando o clique no link do e-mail: assim que a conta for
  // confirmada (em qualquer aparelho), esta aba entra sozinha com a senha.
  const [pendingSignup, setPendingSignup] = useState<{ email: string; password: string } | null>(
    null,
  );
  const copy = COPY[mode];
  const score = passwordScore(password);

  useEffect(() => {
    void supabase
      .from("store_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => data && setStore(data as Store));
  }, []);

  useEffect(() => {
    setMessage(null);
    setPassword("");
    setConfirm("");
    setCodeStep(false);
    setCode("");
    setPendingSignup(null);
  }, [mode]);

  useEffect(() => {
    if (!pendingSignup) return;
    if (user) {
      setPendingSignup(null);
      void navigate({ to: redirect ?? "/" });
      return;
    }
    let done = false;
    const startedAt = Date.now();
    const tryLogin = async () => {
      if (done) return;
      if (Date.now() - startedAt > 15 * 60_000) return window.clearInterval(timer);
      const { error } = await supabase.auth.signInWithPassword(pendingSignup);
      if (error || done) return;
      done = true;
      setPendingSignup(null);
      void navigate({ to: redirect ?? "/" });
    };
    // Intervalo folgado para nao bater no limite de tentativas de login do Supabase.
    const timer = window.setInterval(() => void tryLogin(), 10_000);
    const onFocus = () => void tryLogin();
    window.addEventListener("focus", onFocus);
    return () => {
      done = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [pendingSignup, user, navigate, redirect]);

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await verifyCode(email, code);
    setBusy(false);
    if (result.error) return setMessage({ text: result.error });
    void navigate({ to: redirect ?? "/" });
  }

  async function resend() {
    setBusy(true);
    setMessage(null);
    const result = await resendCode(email);
    setBusy(false);
    setMessage(
      result.error ? { text: result.error } : { ok: true, text: "Mandamos um código novo." },
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "signup" && password !== confirm) {
      setMessage({ text: "As senhas não batem. Confere aí." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = mode === "login" ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (result.error) return setMessage({ text: result.error });
    if (result.codeSent) {
      setPassword("");
      setCode("");
      return setCodeStep(true);
    }
    if (result.needsConfirmation) {
      setPendingSignup({ email, password });
      setPassword("");
      setConfirm("");
      return setMessage({
        ok: true,
        text: "Conta criada! Clique no link que mandamos no seu e-mail. Assim que confirmar, você entra automaticamente.",
      });
    }
    void navigate({ to: redirect ?? "/" });
  }

  const style = { "--store-highlight": storeHighlight(store) } as CSSProperties;

  return (
    <main className="site auth-screen" style={style}>
      <div className="auth-poster" aria-hidden="true">
        {ROWS.map((row, i) => (
          <div key={i} className={`auth-row ${i % 2 ? "auth-row-reverse" : ""}`}>
            <span>
              {Array.from({ length: 4 }, () => `${row} ★ `).join("")}
              {Array.from({ length: 4 }, () => `${row} ★ `).join("")}
            </span>
          </div>
        ))}
      </div>

      <header className="auth-top">
        <Link to="/" className="auth-brand" aria-label="Voltar para a loja">
          {store.brand_name.toUpperCase()}
        </Link>
        <Link to="/" className="auth-back">
          <ArrowLeft size={15} /> VOLTAR À LOJA
        </Link>
      </header>

      <section className="auth-stage">
        <div className="auth-card-wrap">
          <span className="auth-sticker auth-sticker-a" aria-hidden="true">
            OVERSIZED DE VERDADE
          </span>
          <span className="auth-sticker auth-sticker-b" aria-hidden="true">
            ★ DA RUA PRA RUA
          </span>
          <div className="auth-card" key={user ? "account" : mode}>
            {loading ? (
              <p className="auth-intro">Carregando...</p>
            ) : user ? (
              <>
                <p className="eyebrow auth-eyebrow">BEM-VINDO DE VOLTA</p>
                <h1 className="auth-title">
                  SUA <em>CONTA.</em>
                </h1>
                <div className="auth-account">
                  <span>CONECTADO COMO</span>
                  <strong>{user.email}</strong>
                  {isAdmin && <em>ADMINISTRADOR DA LOJA</em>}
                </div>
                {isAdmin && (
                  <Link to="/editar" className="auth-submit">
                    <span>
                      <Settings2 size={16} /> PAINEL DE EDIÇÃO
                    </span>
                    <ArrowRight size={18} />
                  </Link>
                )}
                <Link
                  to={redirect && redirect !== "/editar" ? redirect : "/"}
                  className="auth-ghost"
                >
                  CONTINUAR COMPRANDO <ArrowRight size={15} />
                </Link>
                <button type="button" className="auth-ghost" onClick={() => void signOut()}>
                  <LogOut size={15} /> SAIR DA CONTA
                </button>
              </>
            ) : codeStep ? (
              <>
                <p className="eyebrow auth-eyebrow">FALTA SÓ UM PASSO</p>
                <h1 className="auth-title">
                  CONFERE O <em>E-MAIL.</em>
                </h1>
                <p className="auth-intro">
                  Mandamos um código de 6 dígitos para <strong>{email}</strong>. Digite abaixo ou
                  clique no link do e-mail para entrar.
                </p>
                <form onSubmit={(e) => void submitCode(e)} className="auth-form">
                  <label className="auth-field">
                    <span>CÓDIGO</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy || code.length !== 6}
                    className="auth-submit"
                  >
                    <span>{busy ? "AGUARDE..." : "CONFIRMAR E ENTRAR"}</span>
                    <ArrowRight size={18} />
                  </button>
                </form>
                <button
                  type="button"
                  className="auth-ghost"
                  disabled={busy}
                  onClick={() => void resend()}
                >
                  REENVIAR CÓDIGO
                </button>
                <button
                  type="button"
                  className="auth-ghost"
                  onClick={() => {
                    setCodeStep(false);
                    setMessage(null);
                  }}
                >
                  <ArrowLeft size={15} /> USAR OUTRO E-MAIL
                </button>
              </>
            ) : (
              <>
                <div className="auth-tabs" role="tablist" aria-label="Entrar ou criar conta">
                  <Link
                    to="/entrar"
                    search={redirect ? { redirect } : {}}
                    role="tab"
                    aria-selected={mode === "login"}
                    className={mode === "login" ? "active" : ""}
                  >
                    ENTRAR
                  </Link>
                  <Link
                    to="/criar-conta"
                    search={redirect ? { redirect } : {}}
                    role="tab"
                    aria-selected={mode === "signup"}
                    className={mode === "signup" ? "active" : ""}
                  >
                    CRIAR CONTA
                  </Link>
                </div>
                <p className="eyebrow auth-eyebrow">{copy.eyebrow}</p>
                <h1 className="auth-title">
                  {copy.title[0]} <em>{copy.title[1]}</em>
                </h1>
                <p className="auth-intro">{copy.intro}</p>

                <form onSubmit={(e) => void submit(e)} className="auth-form">
                  <label className="auth-field">
                    <span>E-MAIL</span>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="voce@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label className="auth-field">
                    <span>SENHA</span>
                    <div className="auth-password">
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        required
                        minLength={6}
                        placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "Sua senha"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </label>
                  {mode === "signup" && (
                    <>
                      <div className="auth-strength" aria-live="polite">
                        {[1, 2, 3, 4].map((n) => (
                          <i key={n} className={score >= n ? "on" : ""} />
                        ))}
                        <span>{password ? SCORE_LABEL[score] || "CURTA DEMAIS" : ""}</span>
                      </div>
                      <label className="auth-field">
                        <span>CONFIRMAR SENHA</span>
                        <input
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          minLength={6}
                          placeholder="Repita a senha"
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                        />
                      </label>
                    </>
                  )}
                  <button type="submit" disabled={busy} className="auth-submit">
                    <span>{busy ? "AGUARDE..." : copy.submit}</span>
                    <ArrowRight size={18} />
                  </button>
                </form>

                <p className="auth-switch">
                  {copy.switchText}{" "}
                  <Link
                    to={mode === "login" ? "/criar-conta" : "/entrar"}
                    search={redirect ? { redirect } : {}}
                  >
                    {copy.switchLink}
                  </Link>
                </p>
              </>
            )}
            {message && (
              <p className={`auth-message ${message.ok ? "ok" : ""}`} role="status">
                {message.text}
              </p>
            )}
          </div>
        </div>
      </section>

      <footer className="auth-foot">
        <span>© {store.brand_name.toUpperCase()}</span>
        <span>CAMISETAS OVERSIZED</span>
      </footer>
    </main>
  );
}
