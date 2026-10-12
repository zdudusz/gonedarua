import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, LogOut, Settings2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";

type Props = { defaultOpen?: boolean; onOpenChange?: (open: boolean) => void };

// Botao "Entrar / Minha conta" do canto superior direito. Logado, abre um
// painel lateral no mesmo estilo da sacola.
export function AccountButton({ defaultOpen = false, onOpenChange }: Props) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const [open, setOpenState] = useState(defaultOpen);
  const [message, setMessage] = useState("");

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

  // Sem login o botao leva para a pagina /entrar; logado abre o painel da conta.
  if (!user) {
    return (
      <Button variant="ghost" className="account-button" asChild>
        <Link to="/entrar" aria-label="Entrar ou criar conta">
          <User />
          <span className="desktop-only">ENTRAR</span>
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        className="account-button"
        onClick={() => setOpen(true)}
        aria-label="Minha conta"
      >
        <User />
        <span className="desktop-only">CONTA</span>
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
                <p className="eyebrow">BEM-VINDO DE VOLTA</p>
                <h2>MINHA CONTA</h2>
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
              ) : (
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
              )}
              {message && <p className="admin-message account-message">{message}</p>}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
