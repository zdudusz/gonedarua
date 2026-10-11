import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, LogOut, Settings2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";

type Props = { defaultOpen?: boolean; onOpenChange?: (open: boolean) => void };

// Botao "Entrar / Minha conta" do canto superior direito + painel lateral no
// mesmo estilo da sacola.
export function AccountButton({ defaultOpen = false, onOpenChange }: Props) {
  const { user, isAdmin, loading, signIn, signUp, signOut } = useAuth();
  const [open, setOpenState] = useState(defaultOpen);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const setOpen = (value: boolean) => {
    setOpenState(value);
    onOpenChange?.(value);
  };

  useEffect(() => {
    if (defaultOpen) setOpenState(true);
  }, [defaultOpen]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = mode === "login" ? await signIn(email, password) : await signUp(email, password);
    if (result.error) setMessage(result.error);
    else if (result.needsConfirmation)
      setMessage("Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.");
    else {
      setMessage("");
      setPassword("");
    }
    setBusy(false);
  }

  const label = user ? "CONTA" : "ENTRAR";

  return (
    <>
      <Button
        variant="ghost"
        className="account-button"
        onClick={() => setOpen(true)}
        aria-label={user ? "Minha conta" : "Entrar ou criar conta"}
      >
        <User />
        <span className="desktop-only">{label}</span>
      </Button>
      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <aside
            className="side-panel account-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Minha conta"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-head">
              <div>
                <p className="eyebrow">{user ? "BEM-VINDO DE VOLTA" : "SUA CONTA"}</p>
                <h2>{user ? "MINHA CONTA" : mode === "login" ? "ENTRAR" : "CRIAR CONTA"}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar conta"
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>
            <div className="admin-content">
              {loading ? (
                <p className="admin-intro">Carregando...</p>
              ) : user ? (
                <div className="admin-fields">
                  <div className="account-card">
                    <span>CONECTADO COMO</span>
                    <strong>{user.email}</strong>
                    {isAdmin && <em>ADMINISTRADOR DA LOJA</em>}
                  </div>
                  {isAdmin && (
                    <Link to="/editar" className="account-link" onClick={() => setOpen(false)}>
                      <Settings2 size={16} /> PAINEL DE EDIÇÃO <ArrowRight size={16} />
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    className="w-full rounded-none"
                    onClick={async () => {
                      await signOut();
                      setMessage("Você saiu da sua conta.");
                    }}
                  >
                    <LogOut size={15} /> SAIR
                  </Button>
                </div>
              ) : (
                <>
                  <p className="admin-intro">
                    Entre para acompanhar seus pedidos e agilizar a próxima compra.
                  </p>
                  <div className="admin-tabs">
                    <Button
                      variant={mode === "login" ? "default" : "ghost"}
                      onClick={() => {
                        setMode("login");
                        setMessage("");
                      }}
                    >
                      ENTRAR
                    </Button>
                    <Button
                      variant={mode === "signup" ? "default" : "ghost"}
                      onClick={() => {
                        setMode("signup");
                        setMessage("");
                      }}
                    >
                      CRIAR CONTA
                    </Button>
                  </div>
                  <form onSubmit={(e) => void submit(e)} className="admin-fields">
                    <label className="admin-field">
                      <span>E-mail</span>
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </label>
                    <label className="admin-field">
                      <span>Senha</span>
                      <input
                        type="password"
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </label>
                    <Button type="submit" disabled={busy} className="w-full rounded-none">
                      {busy ? "AGUARDE..." : mode === "login" ? "ENTRAR" : "CRIAR CONTA"}
                    </Button>
                  </form>
                </>
              )}
              {message && <p className="admin-message account-message">{message}</p>}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
