import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AccountButton } from "@/components/auth/AccountButton";
import { useAuth } from "@/components/auth/AuthProvider";
import { verifyAdmin } from "@/lib/admin.functions";
import {
  DEFAULT_SIZES,
  SIZE_PRESETS,
  fallbackStore,
  imageFromFile,
  money,
  storeHighlight,
  type Product,
  type Section,
  type Store,
} from "@/lib/store";

const NO_SECTION = "sem-secao";

export const Route = createFileRoute("/editar")({
  head: () => ({
    meta: [{ title: "Editar loja | Gonê da Rua" }, { name: "robots", content: "noindex" }],
  }),
  component: EditGate,
});

// A sessao (JWT) do Supabase fica no navegador, entao a checagem roda depois de
// montar: o servidor valida o token em verifyAdmin() e so entao o painel aparece.
// Quem nao e admin volta para a loja com o login aberto. As gravacoes continuam
// barradas pelo RLS do banco mesmo que alguem burle a tela.
function EditGate() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    const deny = () => void navigate({ to: "/", search: { entrar: true }, replace: true });
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return deny();
      try {
        const result = await verifyAdmin();
        if (!active) return;
        if (result.isAdmin) setAllowed(true);
        else deny();
      } catch {
        if (active) deny();
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  if (!allowed) return <div className="site editor empty">VERIFICANDO ACESSO...</div>;
  return <EditPage />;
}

type DraftProduct = Partial<Product> & { sizes: string[] };

function EditPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"catalog" | "store">("catalog");
  const [store, setStore] = useState<Store>(fallbackStore);
  const [draftStore, setDraftStore] = useState<Store>(fallbackStore);
  const [sections, setSections] = useState<Section[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [newSectionName, setNewSectionName] = useState("");
  const [draftProduct, setDraftProduct] = useState<DraftProduct | null>(null);
  const [customSize, setCustomSize] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Saiu da conta com a pagina aberta: volta para a loja.
  useEffect(() => {
    if (!authLoading && !isAdmin) void navigate({ to: "/" });
  }, [authLoading, isAdmin, navigate]);

  async function refresh() {
    const [s, sec, p] = await Promise.all([
      supabase.from("store_settings").select("*").eq("id", 1).single(),
      supabase.from("sections").select("*").order("sort_order"),
      supabase.from("products").select("*").order("sort_order"),
    ]);
    if (s.data) {
      setStore(s.data as Store);
      setDraftStore(s.data as Store);
    }
    if (sec.data) {
      setSections(sec.data as Section[]);
      setSelectedSection((current) => current || sec.data[0]?.id || NO_SECTION);
    }
    if (p.data) setProducts(p.data as Product[]);
    const loadError = s.error?.message || sec.error?.message || p.error?.message;
    if (loadError) setMessage(`Erro ao carregar: ${loadError}`);
    setLoading(false);
  }
  useEffect(() => {
    void refresh();
  }, []);

  const sectionProducts = useMemo(
    () =>
      products.filter((p) =>
        selectedSection === NO_SECTION ? !p.section_id : p.section_id === selectedSection,
      ),
    [products, selectedSection],
  );
  const unassignedCount = products.filter((p) => !p.section_id).length;
  const currentSection = sections.find((s) => s.id === selectedSection);

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    setSaving(true);
    setMessage("");
    const { error } = await action();
    setMessage(error ? `Não foi possível salvar: ${error.message}` : ok);
    if (!error) await refresh();
    setSaving(false);
    return !error;
  }

  // ---------- Secoes ----------
  async function addSection() {
    const name = newSectionName.trim();
    if (!name) return;
    const sortOrder = Math.max(0, ...sections.map((s) => s.sort_order)) + 1;
    const { data, error } = await supabase
      .from("sections")
      .insert({ name, sort_order: sortOrder })
      .select()
      .single();
    if (error) {
      setMessage(`Não foi possível criar a seção: ${error.message}`);
      return;
    }
    setNewSectionName("");
    setSelectedSection(data.id);
    setMessage(`Seção "${name}" criada.`);
    await refresh();
  }

  const renameSection = (section: Section, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === section.name) return;
    void run(
      () => supabase.from("sections").update({ name: trimmed }).eq("id", section.id),
      "Seção renomeada.",
    );
  };

  async function moveSection(section: Section, direction: -1 | 1) {
    const index = sections.findIndex((s) => s.id === section.id);
    const other = sections[index + direction];
    if (!other) return;
    setSaving(true);
    const results = await Promise.all([
      supabase.from("sections").update({ sort_order: other.sort_order }).eq("id", section.id),
      supabase.from("sections").update({ sort_order: section.sort_order }).eq("id", other.id),
    ]);
    const error = results.find((r) => r.error)?.error;
    setMessage(error ? `Não foi possível reordenar: ${error.message}` : "Ordem atualizada.");
    await refresh();
    setSaving(false);
  }

  const toggleSection = (section: Section) =>
    void run(
      () => supabase.from("sections").update({ active: !section.active }).eq("id", section.id),
      section.active ? "Seção escondida da loja." : "Seção visível na loja.",
    );

  async function deleteSection(section: Section) {
    const count = products.filter((p) => p.section_id === section.id).length;
    const warning = count
      ? `Excluir a seção "${section.name}"? As ${count} peças dela continuam salvas, sem seção.`
      : `Excluir a seção "${section.name}"?`;
    if (!window.confirm(warning)) return;
    const ok = await run(
      () => supabase.from("sections").delete().eq("id", section.id),
      "Seção excluída.",
    );
    if (ok) setSelectedSection("");
  }

  // ---------- Pecas ----------
  const newProduct = () => {
    setDraftProduct({
      name: "",
      price: 99,
      front_url: "",
      back_url: null,
      description: "",
      active: true,
      section_id: selectedSection === NO_SECTION ? null : selectedSection,
      sort_order: Math.max(0, ...products.map((p) => p.sort_order)) + 1,
      sizes: [...DEFAULT_SIZES],
    });
    setMessage("");
  };

  async function saveProduct() {
    if (!draftProduct) return;
    const price = Number(draftProduct.price);
    if (!draftProduct.name?.trim()) return setMessage("Dê um nome para a peça.");
    if (!Number.isFinite(price) || price < 0) return setMessage("Informe um preço válido.");
    if (!draftProduct.front_url) return setMessage("Envie a foto da frente da peça.");
    if (!draftProduct.sizes.length) return setMessage("Escolha pelo menos um tamanho.");
    const section = sections.find((s) => s.id === draftProduct.section_id);
    const record = {
      name: draftProduct.name.trim(),
      price,
      front_url: draftProduct.front_url,
      back_url: draftProduct.back_url || null,
      // category segue preenchida para o personalizador e mensagens antigas.
      category: section?.name ?? draftProduct.category ?? "Camisetas",
      description: draftProduct.description?.trim() || "",
      sort_order: Number(draftProduct.sort_order) || 0,
      active: draftProduct.active ?? true,
      section_id: draftProduct.section_id || null,
      sizes: draftProduct.sizes,
    };
    const ok = await run(
      () =>
        draftProduct.id
          ? supabase.from("products").update(record).eq("id", draftProduct.id)
          : supabase.from("products").insert(record),
      draftProduct.id ? "Peça atualizada." : "Peça adicionada à loja.",
    );
    if (ok) {
      setSelectedSection(record.section_id ?? NO_SECTION);
      setDraftProduct(null);
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Excluir ${product.name}? Essa ação não pode ser desfeita.`)) return;
    await run(() => supabase.from("products").delete().eq("id", product.id), "Peça excluída.");
  }

  const toggleSize = (size: string) =>
    setDraftProduct((old) =>
      old
        ? {
            ...old,
            sizes: old.sizes.includes(size)
              ? old.sizes.filter((s) => s !== size)
              : sortSizes([...old.sizes, size]),
          }
        : old,
    );

  const addCustomSize = () => {
    const size = customSize.trim().toUpperCase();
    if (!size || !draftProduct || draftProduct.sizes.includes(size)) return;
    setDraftProduct({ ...draftProduct, sizes: sortSizes([...draftProduct.sizes, size]) });
    setCustomSize("");
  };

  async function uploadImage(event: ChangeEvent<HTMLInputElement>, done: (url: string) => void) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setMessage("Preparando imagem...");
      done(await imageFromFile(file));
      setMessage("Imagem pronta. Salve para publicar.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro na imagem.");
    }
    event.target.value = "";
  }

  // ---------- Loja ----------
  const saveStore = () =>
    void run(
      () =>
        supabase
          .from("store_settings")
          .update({
            brand_name: draftStore.brand_name,
            hero_title: draftStore.hero_title,
            hero_subtitle: draftStore.hero_subtitle,
            announcement: draftStore.announcement,
            about_text: draftStore.about_text,
            logo_url: draftStore.logo_url,
            hero_image_url: draftStore.hero_image_url,
            accent_color: draftStore.accent_color,
            promo_price: Number(draftStore.promo_price),
            coupon_code: draftStore.coupon_code,
            coupon_discount: Number(draftStore.coupon_discount),
            instagram_url: draftStore.instagram_url,
            whatsapp_number: draftStore.whatsapp_number,
            hero_layout: draftStore.hero_layout,
            grid_columns: draftStore.grid_columns,
            show_offer: draftStore.show_offer,
            show_about: draftStore.show_about,
          })
          .eq("id", 1),
      "Alterações da loja salvas.",
    );

  const field = (
    label: string,
    value: string | number,
    onChange: (value: string) => void,
    type = "text",
  ) => (
    <label className="admin-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
  const upload = (label: string, url: string | null | undefined, done: (url: string) => void) => (
    <label className="admin-upload">
      <span>
        <Upload size={17} /> {label}
      </span>
      {url && <img src={url} alt="Prévia" />}
      <input type="file" accept="image/*" onChange={(e) => void uploadImage(e, done)} />
    </label>
  );

  return (
    <div
      className="site editor"
      style={{ "--store-highlight": storeHighlight(store) } as React.CSSProperties}
    >
      <header className="header">
        <div className="header-left">
          <Link to="/" className="editor-back">
            <ArrowLeft size={15} /> <span className="desktop-only">VER LOJA</span>
          </Link>
        </div>
        <Link className="header-brand" to="/" aria-label="Voltar para a loja">
          <img src={store.logo_url} alt={store.brand_name} />
        </Link>
        <div className="header-right">
          <AccountButton />
        </div>
      </header>
      <main className="editor-main">
        <div className="editor-title">
          <div>
            <p className="eyebrow">PAINEL DA MARCA</p>
            <h1>EDITAR LOJA</h1>
          </div>
          <div className="admin-tabs editor-tabs">
            <Button
              variant={tab === "catalog" ? "default" : "ghost"}
              onClick={() => {
                setTab("catalog");
                setMessage("");
              }}
            >
              SEÇÕES & PEÇAS
            </Button>
            <Button
              variant={tab === "store" ? "default" : "ghost"}
              onClick={() => {
                setTab("store");
                setDraftProduct(null);
                setMessage("");
              }}
            >
              VISUAL & OFERTAS
            </Button>
          </div>
        </div>
        {message && (
          <p className="admin-message editor-message" role="status">
            {message}
            <button type="button" aria-label="Fechar aviso" onClick={() => setMessage("")}>
              <X size={14} />
            </button>
          </p>
        )}
        {loading ? (
          <div className="empty">CARREGANDO PAINEL...</div>
        ) : tab === "store" ? (
          <section className="editor-card editor-store">
            <div className="admin-fields">
              {field("Nome da marca", draftStore.brand_name, (v) =>
                setDraftStore({ ...draftStore, brand_name: v }),
              )}
              {field("Chamada principal", draftStore.hero_title, (v) =>
                setDraftStore({ ...draftStore, hero_title: v }),
              )}
              {field("Texto da chamada", draftStore.hero_subtitle, (v) =>
                setDraftStore({ ...draftStore, hero_subtitle: v }),
              )}
              {field("Faixa superior", draftStore.announcement, (v) =>
                setDraftStore({ ...draftStore, announcement: v }),
              )}
              {field("Texto sobre a marca", draftStore.about_text, (v) =>
                setDraftStore({ ...draftStore, about_text: v }),
              )}
              <div className="admin-row">
                {upload("Trocar logo", draftStore.logo_url, (v) =>
                  setDraftStore((old) => ({ ...old, logo_url: v })),
                )}
                {upload("Trocar foto de destaque", draftStore.hero_image_url, (v) =>
                  setDraftStore((old) => ({ ...old, hero_image_url: v })),
                )}
              </div>
              <div className="admin-row">
                <label className="admin-field">
                  <span>Cor de destaque</span>
                  <input
                    type="color"
                    value={storeHighlight(draftStore)}
                    onChange={(e) => setDraftStore({ ...draftStore, accent_color: e.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <span>Posição da foto principal</span>
                  <select
                    value={draftStore.hero_layout}
                    onChange={(e) =>
                      setDraftStore({
                        ...draftStore,
                        hero_layout: e.target.value as Store["hero_layout"],
                      })
                    }
                  >
                    <option value="right">À direita</option>
                    <option value="left">À esquerda</option>
                  </select>
                </label>
                <label className="admin-field">
                  <span>Colunas no computador</span>
                  <select
                    value={draftStore.grid_columns}
                    onChange={(e) =>
                      setDraftStore({ ...draftStore, grid_columns: Number(e.target.value) })
                    }
                  >
                    <option value={2}>2 colunas</option>
                    <option value={3}>3 colunas</option>
                    <option value={4}>4 colunas</option>
                  </select>
                </label>
              </div>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={draftStore.show_offer}
                  onChange={(e) => setDraftStore({ ...draftStore, show_offer: e.target.checked })}
                />{" "}
                Mostrar seção da promoção
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={draftStore.show_about}
                  onChange={(e) => setDraftStore({ ...draftStore, show_about: e.target.checked })}
                />{" "}
                Mostrar seção sobre a marca
              </label>
              <div className="admin-row">
                {field(
                  "Preço do combo (2 peças)",
                  draftStore.promo_price,
                  (v) => setDraftStore({ ...draftStore, promo_price: Number(v) }),
                  "number",
                )}
                {field(
                  "Desconto do cupom",
                  draftStore.coupon_discount,
                  (v) => setDraftStore({ ...draftStore, coupon_discount: Number(v) }),
                  "number",
                )}
                {field("Código do cupom", draftStore.coupon_code, (v) =>
                  setDraftStore({ ...draftStore, coupon_code: v }),
                )}
              </div>
              <div className="admin-row">
                {field("WhatsApp para pedidos (com DDD)", draftStore.whatsapp_number, (v) =>
                  setDraftStore({ ...draftStore, whatsapp_number: v }),
                )}
                {field("Link do Instagram", draftStore.instagram_url, (v) =>
                  setDraftStore({ ...draftStore, instagram_url: v }),
                )}
              </div>
              <Button onClick={saveStore} disabled={saving} className="editor-save">
                {saving ? "SALVANDO..." : "SALVAR LOJA"} <ArrowRight />
              </Button>
            </div>
          </section>
        ) : (
          <div className="editor-grid">
            <aside className="editor-card editor-sections">
              <p className="editor-label">SEÇÕES DA LOJA</p>
              <form
                className="coupon editor-new-section"
                onSubmit={(e) => {
                  e.preventDefault();
                  void addSection();
                }}
              >
                <input
                  value={newSectionName}
                  placeholder="NOME DA NOVA SEÇÃO"
                  onChange={(e) => setNewSectionName(e.target.value)}
                />
                <Button variant="outline" type="submit" disabled={!newSectionName.trim()}>
                  <Plus size={15} /> CRIAR
                </Button>
              </form>
              <ul className="editor-section-list">
                {sections.map((section, index) => (
                  <li
                    key={section.id}
                    className={`${selectedSection === section.id ? "active" : ""} ${section.active ? "" : "hidden-section"}`}
                  >
                    <button
                      type="button"
                      className="editor-section-name"
                      onClick={() => {
                        setSelectedSection(section.id);
                        setDraftProduct(null);
                      }}
                    >
                      <strong>{section.name}</strong>
                      <span>
                        {pieces(products.filter((p) => p.section_id === section.id).length)}
                        {section.active ? "" : " · OCULTA"}
                      </span>
                    </button>
                    <div className="editor-section-actions">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Subir seção"
                        disabled={saving || index === 0}
                        onClick={() => void moveSection(section, -1)}
                      >
                        <ArrowUp size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Descer seção"
                        disabled={saving || index === sections.length - 1}
                        onClick={() => void moveSection(section, 1)}
                      >
                        <ArrowDown size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Renomear seção ${section.name}`}
                        disabled={saving}
                        onClick={() => {
                          const name = window.prompt("Novo nome da seção", section.name);
                          if (name !== null) renameSection(section, name);
                        }}
                      >
                        <Pencil size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={section.active ? "Esconder seção" : "Mostrar seção"}
                        disabled={saving}
                        onClick={() => toggleSection(section)}
                      >
                        {section.active ? <Eye size={15} /> : <EyeOff size={15} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir seção ${section.name}`}
                        disabled={saving}
                        onClick={() => void deleteSection(section)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </li>
                ))}
                {unassignedCount > 0 && (
                  <li className={selectedSection === NO_SECTION ? "active" : ""}>
                    <button
                      type="button"
                      className="editor-section-name"
                      onClick={() => {
                        setSelectedSection(NO_SECTION);
                        setDraftProduct(null);
                      }}
                    >
                      <strong>Sem seção</strong>
                      <span>{pieces(unassignedCount)} · APARECEM EM "OUTRAS"</span>
                    </button>
                  </li>
                )}
              </ul>
              {!sections.length && (
                <p className="editor-hint">
                  Crie a primeira seção para começar a organizar a loja.
                </p>
              )}
            </aside>

            <section className="editor-card editor-products">
              {draftProduct ? (
                <div className="admin-fields">
                  <Button
                    variant="ghost"
                    className="back-admin"
                    onClick={() => setDraftProduct(null)}
                  >
                    <ArrowLeft size={16} /> VOLTAR ÀS PEÇAS
                  </Button>
                  <h2 className="editor-heading">
                    {draftProduct.id ? "EDITAR PEÇA" : "NOVA PEÇA"}
                  </h2>
                  {field("Nome da peça", draftProduct.name || "", (v) =>
                    setDraftProduct({ ...draftProduct, name: v }),
                  )}
                  <div className="admin-row">
                    {field(
                      "Preço (R$)",
                      draftProduct.price ?? "",
                      (v) => setDraftProduct({ ...draftProduct, price: Number(v) }),
                      "number",
                    )}
                    <label className="admin-field">
                      <span>Seção</span>
                      <select
                        value={draftProduct.section_id ?? ""}
                        onChange={(e) =>
                          setDraftProduct({ ...draftProduct, section_id: e.target.value || null })
                        }
                      >
                        <option value="">Sem seção</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="admin-field">
                    <span>Tamanhos disponíveis</span>
                    <div className="size-options editor-sizes">
                      {sortSizes(Array.from(new Set([...SIZE_PRESETS, ...draftProduct.sizes]))).map(
                        (s) => (
                          <Button
                            type="button"
                            variant="outline"
                            key={s}
                            aria-pressed={draftProduct.sizes.includes(s)}
                            className={draftProduct.sizes.includes(s) ? "selected-size" : ""}
                            onClick={() => toggleSize(s)}
                          >
                            {s}
                          </Button>
                        ),
                      )}
                    </div>
                    <div className="coupon editor-custom-size">
                      <input
                        value={customSize}
                        placeholder="OUTRO TAMANHO (EX.: 2XG, ÚNICO)"
                        onChange={(e) => setCustomSize(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomSize();
                          }
                        }}
                      />
                      <Button type="button" variant="outline" onClick={addCustomSize}>
                        ADICIONAR
                      </Button>
                    </div>
                  </div>
                  {field("Descrição", draftProduct.description || "", (v) =>
                    setDraftProduct({ ...draftProduct, description: v }),
                  )}
                  <div className="admin-row">
                    {upload("Foto da frente", draftProduct.front_url, (v) =>
                      setDraftProduct((old) => (old ? { ...old, front_url: v } : old)),
                    )}
                    {upload("Foto das costas (opcional)", draftProduct.back_url, (v) =>
                      setDraftProduct((old) => (old ? { ...old, back_url: v } : old)),
                    )}
                  </div>
                  <div className="admin-row">
                    {field(
                      "Posição na vitrine",
                      draftProduct.sort_order ?? 0,
                      (v) => setDraftProduct({ ...draftProduct, sort_order: Number(v) }),
                      "number",
                    )}
                    <label className="admin-checkbox editor-visible">
                      <input
                        type="checkbox"
                        checked={draftProduct.active ?? true}
                        onChange={(e) =>
                          setDraftProduct({ ...draftProduct, active: e.target.checked })
                        }
                      />{" "}
                      Peça visível na loja
                    </label>
                  </div>
                  <Button
                    onClick={() => void saveProduct()}
                    disabled={saving}
                    className="editor-save"
                  >
                    {saving ? "SALVANDO..." : "SALVAR PEÇA"} <ArrowRight />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="editor-products-head">
                    <div>
                      <p className="editor-label">PEÇAS DA SEÇÃO</p>
                      <h2 className="editor-heading">
                        {currentSection?.name ??
                          (selectedSection === NO_SECTION ? "Sem seção" : "—")}
                      </h2>
                    </div>
                    <Button className="new-product" onClick={newProduct}>
                      <Plus size={16} /> NOVA PEÇA
                    </Button>
                  </div>
                  {sectionProducts.length ? (
                    <div className="admin-list">
                      {sectionProducts.map((p) => (
                        <div className="admin-product" key={p.id}>
                          <img src={p.front_url} alt="" />
                          <div>
                            <strong>{p.name}</strong>
                            <span>
                              {money(Number(p.price))} · {p.sizes.join(" / ")} ·{" "}
                              {p.active ? "Visível" : "Oculta"}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setDraftProduct({ ...p, sizes: p.sizes ?? [...DEFAULT_SIZES] });
                              setMessage("");
                            }}
                          >
                            EDITAR
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Excluir ${p.name}`}
                            onClick={() => void deleteProduct(p)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="editor-hint">
                      Nenhuma peça nesta seção ainda. Use “Nova peça” para adicionar com foto,
                      tamanhos e preço.
                    </p>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

// Mantem a ordem natural de grade (PP, P, M, G...) e joga tamanhos livres para o fim.
function sortSizes(sizes: string[]): string[] {
  const rank = (s: string) => {
    const i = SIZE_PRESETS.indexOf(s);
    return i === -1 ? SIZE_PRESETS.length : i;
  };
  return [...sizes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "pt-BR"));
}

const pieces = (n: number) => `${n} ${n === 1 ? "PEÇA" : "PEÇAS"}`;
