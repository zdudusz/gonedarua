import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LogOut, Settings2, User, X } from "lucide-react";
import { useAuth, type CodeKind } from "./AuthProvider";

type View = "login" | "signup" | "code";
type Props = { defaultOpen?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Login do canto superior esquerdo: um botao abre o painel logo abaixo, com
// e-mail, senha e "Criar conta nova". O codigo de 6 digitos aparece no mesmo
// painel; logado, o painel mostra a conta.
export function LoginWidget({ defaultOpen = false }: Props) {
  const { user, isAdmin, loading, signIn, signUp, verifyCode, resendCode, signOut } = useAuth();
  const [open, setOpen] = useState(defaultOpen);
  const [view, setView] = useState<View>("login");
  const [codeKind, setCodeKind] = useState<CodeKind>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  // Fecha clicando fora ou com Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Entrou (pelo codigo, pela senha ou pelo link do e-mail): limpa o formulario.
  useEffect(() => {
    if (!user) return;
    setView("login");
    setPassword("");
    setConfirm("");
    setCode("");
  }, [user]);

  function go(next: View) {
    setView(next);
    setMessage(null);
    setPassword("");
    setConfirm("");
    setCode("");
  }

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    if (result.error) return setMessage({ text: result.error });
    if (result.codeSent) {
      setCodeKind("login");
      setPassword("");
      setView("code");
    }
  }

  async function submitSignup(event: FormEvent) {
    event.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setMessage({ text: "Esse e-mail não parece válido." });
    if (password !== confirm) return setMessage({ text: "As senhas não batem. Confere aí." });
    setBusy(true);
    setMessage(null);
    const result = await signUp(email.trim(), password);
    setBusy(false);
    if (result.error) return setMessage({ text: result.error });
    if (result.codeSent) {
      setCodeKind("signup");
      setPassword("");
      setConfirm("");
      setView("code");
    }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await verifyCode(email.trim(), code, codeKind);
    setBusy(false);
    if (result.error) setMessage({ text: result.error });
  }

  async function resend() {
    setBusy(true);
    setMessage(null);
    const result = await resendCode(email.trim(), codeKind);
    setBusy(false);
    setMessage(
      result.error ? { text: result.error } : { ok: true, text: "Mandamos um código novo." },
    );
  }

  const passwordField = (autoComplete: string, placeholder: string) => (
    <label className="auth-field">
      <span>SENHA</span>
      <div className="auth-password">
        <input
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={6}
          placeholder={placeholder}
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
  );

  const emailField = (
    <label className="auth-field">
      <span>E-MAIL</span>
      <input
        type="email"
        autoComplete="email"
        required
        placeholder="Coloque seu e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </label>
  );

  return (
    <div className="login-widget" ref={rootRef}>
      <button
        type="button"
        className="login-trigger"
        aria-expanded={open}
        aria-controls="login-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <User size={18} />
        <span>{user ? "CONTA" : "ENTRAR"}</span>
      </button>

      {open && (
        <div id="login-panel" className="login-panel" role="dialog" aria-label="Entrar na conta">
          <button
            type="button"
            className="login-close"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
          >
            <X size={17} />
          </button>

          {loading ? (
            <p className="auth-intro">Carregando...</p>
          ) : user ? (
            <>
              <p className="eyebrow auth-eyebrow">BEM-VINDO DE VOLTA</p>
              <div className="auth-account">
                <span>CONECTADO COMO</span>
                <strong>{user.email}</strong>
                {isAdmin && <em>ADMINISTRADOR DA LOJA</em>}
              </div>
              {isAdmin && (
                <Link to="/editar" className="auth-submit" onClick={() => setOpen(false)}>
                  <span>
                    <Settings2 size={16} /> PAINEL DE EDIÇÃO
                  </span>
                  <ArrowRight size={18} />
                </Link>
              )}
              <button type="button" className="auth-ghost" onClick={() => void signOut()}>
                <LogOut size={15} /> SAIR DA CONTA
              </button>
            </>
          ) : view === "code" ? (
            <>
              <p className="eyebrow auth-eyebrow">FALTA SÓ UM PASSO</p>
              <h2 className="login-title">CONFERE O E-MAIL.</h2>
              <p className="auth-intro">
                Mandamos um código de 6 dígitos para <strong>{email.trim()}</strong>.
              </p>
              <form onSubmit={(e) => void submitCode(e)} className="auth-form">
                <label className="auth-field">
                  <span>CÓDIGO</span>
                  <input
                    className="login-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </label>
                <button type="submit" disabled={busy || code.length !== 6} className="auth-submit">
                  <span>{busy ? "AGUARDE..." : "CONFIRMAR E ENTRAR"}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
              <div className="login-links">
                <button type="button" disabled={busy} onClick={() => void resend()}>
                  Reenviar código
                </button>
                <button
                  type="button"
                  onClick={() => go(codeKind === "signup" ? "signup" : "login")}
                >
                  <ArrowLeft size={13} /> Voltar
                </button>
              </div>
            </>
          ) : view === "signup" ? (
            <>
              <p className="eyebrow auth-eyebrow">NOVO NA QUEBRADA</p>
              <h2 className="login-title">CRIAR CONTA NOVA</h2>
              <form onSubmit={(e) => void submitSignup(e)} className="auth-form">
                {emailField}
                {passwordField("new-password", "Mínimo 6 caracteres")}
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
                <button type="submit" disabled={busy} className="auth-submit">
                  <span>{busy ? "AGUARDE..." : "CRIAR E RECEBER CÓDIGO"}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
              <div className="login-links">
                <button type="button" onClick={() => go("login")}>
                  <ArrowLeft size={13} /> Já tenho conta
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow auth-eyebrow">DE VOLTA PRA RUA</p>
              <h2 className="login-title">ENTRAR</h2>
              <form onSubmit={(e) => void submitLogin(e)} className="auth-form">
                {emailField}
                {passwordField("current-password", "Coloque sua senha")}
                <button type="submit" disabled={busy} className="auth-submit">
                  <span>{busy ? "AGUARDE..." : "ENTRAR"}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
              <div className="login-links">
                <button type="button" className="login-create" onClick={() => go("signup")}>
                  Criar conta nova
                </button>
              </div>
            </>
          )}

          {message && (
            <p className={`auth-message ${message.ok ? "ok" : ""}`} role="status">
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
