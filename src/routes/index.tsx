import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Instagram,
  Menu,
  Minus,
  Plus,
  Search,
  Settings2,
  ShoppingBag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/components/cart/CartProvider";
import { whatsappLink } from "@/lib/whatsapp";
import logoAsset from "@/assets/logo.webp.asset.json";

type Product = {
  id: string;
  name: string;
  price: number;
  front_url: string;
  back_url: string | null;
  category: string;
  description: string;
  sort_order: number;
  active: boolean;
};
type Store = {
  id: number;
  brand_name: string;
  hero_title: string;
  hero_subtitle: string;
  announcement: string;
  about_text: string;
  logo_url: string;
  hero_image_url: string;
  accent_color: string;
  promo_price: number;
  coupon_code: string;
  coupon_discount: number;
  instagram_url: string;
  whatsapp_number: string;
  hero_layout: "left" | "right";
  grid_columns: number;
  show_offer: boolean;
  show_about: boolean;
};
const fallback: Store = {
  id: 1,
  brand_name: "Gonê da Rua",
  hero_title: "FEITO PRA OCUPAR ESPAÇO.",
  hero_subtitle: "Oversized de verdade. Arte que não pede licença.",
  announcement: "DOIS TEES POR R$180 · USE SEU CUPOM DE R$10",
  about_text: "Da rua pra rua. Camisetas oversized com atitude, arte e identidade.",
  logo_url: logoAsset.url,
  hero_image_url: "",
  accent_color: "#e72363",
  promo_price: 180,
  coupon_code: "GONE10",
  coupon_discount: 10,
  instagram_url: "",
  whatsapp_number: "",
  hero_layout: "right",
  grid_columns: 4,
  show_offer: true,
  show_about: true,
};
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const key = (id: string, size: string) => `${id}:${size}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gonê da Rua | Camisetas Oversized" },
      {
        name: "description",
        content:
          "Camisetas oversized com arte, atitude e identidade. Conheça a coleção Gonê da Rua e a promoção de duas camisetas.",
      },
      { property: "og:title", content: "Gonê da Rua | Camisetas Oversized" },
      {
        property: "og:description",
        content: "Camisetas oversized com arte, atitude e identidade. Duas camisetas por R$180.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

async function imageFromFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha uma imagem válida.");
  if (file.size > 20 * 1024 * 1024) throw new Error("A imagem deve ter até 20 MB.");
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, 1200 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(src);
        reject(new Error("Não foi possível preparar a imagem."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(src);
      resolve(canvas.toDataURL("image/webp", 0.78));
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("Não foi possível abrir a imagem."));
    };
    img.src = src;
  });
}

function Index() {
  const [store, setStore] = useState<Store>(fallback);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("Todas");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [size, setSize] = useState("M");
  const [cartOpen, setCartOpen] = useState(false);
  const { items: cart, addItem, adjustItem } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminMode, setAdminMode] = useState<"login" | "signup">("login");
  const [adminTab, setAdminTab] = useState<"products" | "store">("products");
  const [adminMessage, setAdminMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [draftStore, setDraftStore] = useState<Store>(fallback);
  const [draftProduct, setDraftProduct] = useState<Partial<Product> | null>(null);

  async function refresh() {
    const [s, p] = await Promise.all([
      supabase.from("store_settings").select("*").eq("id", 1).single(),
      supabase.from("products").select("*").order("sort_order"),
    ]);
    if (s.data) {
      setStore(s.data as Store);
      setDraftStore(s.data as Store);
    }
    if (p.data) setProducts(p.data as Product[]);
    setError(s.error?.message || p.error?.message || "");
    setLoading(false);
  }
  useEffect(() => {
    void refresh();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();
        setAdmin(role?.role === "admin");
      }
    });
  }, []);
  useEffect(() => {
    const original = document.body.style.overflow;
    if (selected || cartOpen || adminOpen || menuOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [selected, cartOpen, adminOpen, menuOpen]);
  const visible = useMemo(
    () =>
      products.filter(
        (p) =>
          p.active &&
          (filter === "Todas" || p.category === filter) &&
          p.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, filter, search],
  );
  const categories = [
    "Todas",
    ...Array.from(new Set(products.filter((p) => p.active).map((p) => p.category))),
  ];
  const count = cart.reduce((n, item) => n + item.quantity, 0);
  const rawTotal = cart.reduce((n, item) => n + item.product.price * item.quantity, 0);
  // Each complete pair is capped at the promotional price; leftover singles keep their individual prices.
  const units = cart
    .flatMap((item) => Array.from({ length: item.quantity }, () => item.product.price))
    .sort((a, b) => b - a);
  let subtotal = 0;
  for (let i = 0; i < units.length; i += 2) {
    const first = units[i] ?? 0;
    const second = units[i + 1];
    subtotal += second === undefined ? first : Math.min(first + second, Number(store.promo_price));
  }
  const discount = couponApplied ? Math.min(Number(store.coupon_discount), subtotal) : 0;
  const total = Math.max(0, subtotal - discount);
  const addToCart = (product: Product, chosenSize: string) => {
    addItem(product, chosenSize);
    setSelected(null);
    setCartOpen(true);
  };
  const adjust = (product: { id: string }, chosenSize: string, delta: number) =>
    adjustItem(product.id, chosenSize, delta);
  const applyCoupon = () => {
    if (
      couponInput.trim().toUpperCase() === store.coupon_code.trim().toUpperCase() &&
      store.coupon_code.trim()
    ) {
      setCouponApplied(true);
      setCouponError("");
    } else {
      setCouponApplied(false);
      setCouponError("Cupom inválido.");
    }
  };
  const checkout = () => {
    const lines = cart
      .map(
        (i) => `• ${i.product.name} / ${i.size} — ${i.quantity}x ${money(Number(i.product.price))}`,
      )
      .join("\n");
    const message = `Olá! Quero fazer um pedido na ${store.brand_name}:\n\n${lines}\n\nSubtotal: ${money(rawTotal)}\nPromoção: -${money(rawTotal - subtotal)}${couponApplied ? `\nCupom ${store.coupon_code}: -${money(discount)}` : ""}\nTotal: ${money(total)}`;
    const link = whatsappLink(store.whatsapp_number, message);
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  };
  async function authSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setAdminMessage("");
    const result =
      adminMode === "signup"
        ? await supabase.auth.signUp({ email: adminEmail, password: adminPassword })
        : await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (result.error) setAdminMessage(result.error.message);
    else if (result.data.session) {
      const { data: granted, error: claimError } = await supabase.rpc("claim_store_admin");
      setAdmin(Boolean(granted));
      setAdminMessage(
        claimError?.message ||
          (granted ? "Acesso liberado." : "Esta conta não tem permissão para editar a loja."),
      );
      if (granted) await refresh();
    } else
      setAdminMessage(
        "Confira seu e-mail para confirmar a conta. Depois, entre para editar a loja.",
      );
    setSaving(false);
  }
  async function saveStore() {
    setSaving(true);
    setAdminMessage("");
    const { error: saveError } = await supabase
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
      .eq("id", 1);
    setAdminMessage(saveError?.message || "Alterações salvas.");
    if (!saveError) await refresh();
    setSaving(false);
  }
  async function saveProduct() {
    if (
      !draftProduct?.name?.trim() ||
      !draftProduct.front_url ||
      !Number.isFinite(Number(draftProduct.price))
    ) {
      setAdminMessage("Preencha nome, preço e foto da frente.");
      return;
    }
    setSaving(true);
    setAdminMessage("");
    const record = {
      name: draftProduct.name.trim(),
      price: Number(draftProduct.price),
      front_url: draftProduct.front_url,
      back_url: draftProduct.back_url || null,
      category: draftProduct.category || "Camisetas",
      description: draftProduct.description || "",
      sort_order: Number(draftProduct.sort_order) || 0,
      active: draftProduct.active ?? true,
    };
    const result = draftProduct.id
      ? await supabase.from("products").update(record).eq("id", draftProduct.id)
      : await supabase.from("products").insert(record);
    setAdminMessage(result.error?.message || "Peça salva.");
    if (!result.error) {
      setDraftProduct(null);
      await refresh();
    }
    setSaving(false);
  }
  async function deleteProduct(product: Product) {
    if (!window.confirm(`Excluir ${product.name}?`)) return;
    const { error: deleteError } = await supabase.from("products").delete().eq("id", product.id);
    setAdminMessage(deleteError?.message || "Peça excluída.");
    if (!deleteError) await refresh();
  }
  async function uploadImage(event: ChangeEvent<HTMLInputElement>, done: (url: string) => void) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setAdminMessage("Preparando imagem...");
      const url = await imageFromFile(file);
      done(url);
      setAdminMessage("Imagem pronta. Salve as alterações para publicar.");
    } catch (e) {
      setAdminMessage(e instanceof Error ? e.message : "Erro na imagem.");
    }
    event.target.value = "";
  }
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
  const editStore = (
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
      <label className="admin-field">
        <span>Cor de destaque</span>
        <input
          type="color"
          value={
            /^#[0-9a-fA-F]{6}$/.test(draftStore.accent_color) ? draftStore.accent_color : "#e72363"
          }
          onChange={(e) => setDraftStore({ ...draftStore, accent_color: e.target.value })}
        />
      </label>
      <label className="admin-field">
        <span>Posição da foto principal</span>
        <select
          value={draftStore.hero_layout}
          onChange={(e) =>
            setDraftStore({ ...draftStore, hero_layout: e.target.value as Store["hero_layout"] })
          }
        >
          <option value="right">À direita</option>
          <option value="left">À esquerda</option>
        </select>
      </label>
      <label className="admin-field">
        <span>Colunas da coleção no computador</span>
        <select
          value={draftStore.grid_columns}
          onChange={(e) => setDraftStore({ ...draftStore, grid_columns: Number(e.target.value) })}
        >
          <option value={2}>2 colunas</option>
          <option value={3}>3 colunas</option>
          <option value={4}>4 colunas</option>
        </select>
      </label>
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
      </div>
      {field("Código do cupom", draftStore.coupon_code, (v) =>
        setDraftStore({ ...draftStore, coupon_code: v }),
      )}
      {field("WhatsApp para pedidos (com DDD)", draftStore.whatsapp_number, (v) =>
        setDraftStore({ ...draftStore, whatsapp_number: v }),
      )}
      {field("Link do Instagram", draftStore.instagram_url, (v) =>
        setDraftStore({ ...draftStore, instagram_url: v }),
      )}
      <Button onClick={() => void saveStore()} disabled={saving} className="w-full rounded-none">
        {saving ? "Salvando..." : "Salvar loja"}
      </Button>
    </div>
  );
  return (
    <div
      className="site"
      style={
        {
          "--store-highlight": /^#[0-9a-fA-F]{6}$/.test(store.accent_color)
            ? store.accent_color
            : "#e72363",
        } as React.CSSProperties
      }
    >
      <div className="announcement">
        <span>{store.announcement}</span>
        <span className="announcement-end">
          ENVIO PARA TODO O BRASIL <ArrowRight size={13} />
        </span>
      </div>
      <header className="header">
        <div className="header-left">
          <Button
            variant="ghost"
            size="icon"
            className="mobile-only"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu />
          </Button>
          <a href="#colecao" className="desktop-only">
            COLEÇÃO
          </a>
          <a href="#sobre" className="desktop-only">
            NOSSA RUA
          </a>
          <Link to="/personalizar" className="desktop-only">
            CAMISA PERSONALIZADA
          </Link>
        </div>
        <a className="header-brand" href="#inicio" aria-label="Voltar ao início">
          <img src={store.logo_url} alt={store.brand_name} />
        </a>
        <div className="header-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Buscar"
          >
            <Search />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCartOpen(true)}
            aria-label={`Sacola com ${count} peças`}
            className="bag-button"
          >
            <ShoppingBag />
            {count > 0 && <span className="bag-count">{count}</span>}
          </Button>
        </div>
      </header>
      {searchOpen && (
        <div className="search-bar">
          <Search size={19} />
          <input
            autoFocus
            placeholder="Buscar uma estampa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fechar busca"
            onClick={() => {
              setSearchOpen(false);
              setSearch("");
            }}
          >
            <X />
          </Button>
        </div>
      )}
      <main id="inicio">
        <section className={`hero ${store.hero_layout === "left" ? "hero-reverse" : ""}`}>
          <div className="hero-copy">
            <div className="hero-topline">
              <span>GONÊ DA RUA™</span>
              <span>OVERSIZED / 2026</span>
            </div>
            <div className="hero-center">
              <p className="eyebrow">NOVA TEMPORADA — PEÇAS QUE FALAM POR VOCÊ</p>
              <h1>{store.hero_title}</h1>
              <p className="hero-sub">{store.hero_subtitle}</p>
              <a className="hero-cta" href="#colecao">
                EXPLORAR A COLEÇÃO <ArrowRight size={19} />
              </a>
            </div>
            <div className="hero-bottom">
              <span>ESTILO NÃO TEM PERMISSÃO.</span>
              <a href="#colecao" aria-label="Descer até a coleção">
                <ArrowDown size={23} />
              </a>
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-art-label">01 / DROP DA RUA</div>
            {store.hero_image_url && (
              <img src={store.hero_image_url} alt="Camiseta em destaque Gonê da Rua" />
            )}
            <span className="hero-art-outline">GONÊ</span>
          </div>
        </section>
        <div className="ticker" aria-hidden="true">
          <div>
            GONÊ DA RUA <span>✳</span> FEITO PRA RUA <span>✳</span> OVERSIZED DE VERDADE{" "}
            <span>✳</span> GONÊ DA RUA <span>✳</span> FEITO PRA RUA <span>✳</span>
          </div>
        </div>
        <section className="collection" id="colecao">
          <div className="section-intro">
            <div>
              <p className="eyebrow">01 — ESCOLHA SEU CORRE</p>
              <h2>
                VISTA A<br />
                <em>ATITUDE.</em>
              </h2>
            </div>
            <p>
              Peças que não passam despercebidas.
              <br />
              Encontre a que conta a sua história.
            </p>
          </div>
          <div className="collection-tools">
            <div className="filters">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant="ghost"
                  onClick={() => setFilter(cat)}
                  className={`filter ${filter === cat ? "active" : ""}`}
                >
                  {cat.toUpperCase()}
                </Button>
              ))}
            </div>
            <span className="product-count">
              {visible.length.toString().padStart(2, "0")} PEÇAS <ChevronDown size={15} />
            </span>
          </div>
          {loading ? (
            <div className="empty">CARREGANDO COLEÇÃO...</div>
          ) : error ? (
            <div className="empty">Não foi possível carregar a coleção. {error}</div>
          ) : visible.length ? (
            <div className={`product-grid grid-${store.grid_columns}`}>
              {visible.map((product, index) => (
                <article className="product-card" key={product.id}>
                  <Button
                    variant="ghost"
                    className="product-image"
                    onClick={() => {
                      setSelected(product);
                      setSize("M");
                    }}
                    aria-label={`Ver ${product.name}`}
                  >
                    <img
                      src={product.front_url}
                      alt={`Camiseta ${product.name} vista de frente`}
                      loading={index < 4 ? "eager" : "lazy"}
                      className="front-img"
                    />
                    {product.back_url && (
                      <img
                        src={product.back_url}
                        alt={`Camiseta ${product.name} vista de costas`}
                        loading="lazy"
                        className="back-img"
                      />
                    )}
                    <span className="image-index">GDR—{String(index + 1).padStart(2, "0")}</span>
                    {product.back_url && <span className="back-hint">FRENTE / COSTAS</span>}
                    <span className="quick-add">
                      VER PEÇA <ArrowRight size={16} />
                    </span>
                  </Button>
                  <div className="product-info">
                    <div>
                      <p>OVERSIZED / {product.category.toUpperCase()}</p>
                      <h3>{product.name}</h3>
                    </div>
                    <strong>{money(Number(product.price))}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">Nenhuma peça encontrada.</div>
          )}
        </section>
        {store.show_offer && (
          <section className="offer">
            <div className="offer-heading">
              <span>02 — O DOBRO DE ATITUDE</span>
              <span>GONÊ DA RUA™</span>
            </div>
            <div className="offer-main">
              <div>
                <p>MAIS ESTILO. MENOS DESCULPA.</p>
                <h2>
                  DUAS
                  <br />
                  POR <em>{money(Number(store.promo_price)).replace(",00", "")}</em>
                  <span className="offer-star">✳</span>
                </h2>
              </div>
              <div className="offer-side">
                <p>
                  Escolha duas camisetas da coleção e aproveite o preço especial no carrinho. O
                  cupom de {money(Number(store.coupon_discount))} também pode entrar no jogo.
                </p>
                <a href="#colecao">
                  ESCOLHER MINHAS CAMISETAS <ArrowRight size={20} />
                </a>
              </div>
            </div>
            <div className="offer-foot">
              * COMBO APLICADO AUTOMATICAMENTE NA SACOLA. CUPOM: {store.coupon_code}
            </div>
          </section>
        )}
        {store.show_about && (
          <section className="about" id="sobre">
            <div className="about-mark">
              GDR<span>✳</span>
            </div>
            <div>
              <p className="eyebrow">03 — A MARCA</p>
              <h2>
                NÃO É SÓ
                <br />
                CAMISETA.
                <br />
                <em>É POSTURA.</em>
              </h2>
              <p>{store.about_text}</p>
            </div>
          </section>
        )}
      </main>
      <footer>
        <div className="footer-top">
          <img src={store.logo_url} alt={store.brand_name} />
          <p>
            DA RUA.
            <br />
            PRA RUA.
          </p>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {store.brand_name.toUpperCase()}
          </span>
          <div>
            {store.instagram_url && (
              <a href={store.instagram_url} target="_blank" rel="noreferrer">
                <Instagram size={16} /> INSTAGRAM
              </a>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                setAdminOpen(true);
                setAdminMessage("");
              }}
            >
              <Settings2 size={15} /> EDITAR LOJA
            </Button>
          </div>
          <span>FEITO PRA OCUPAR ESPAÇO.</span>
        </div>
      </footer>
      {menuOpen && (
        <div className="overlay" onClick={() => setMenuOpen(false)}>
          <nav className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(false)}
              aria-label="Fechar menu"
            >
              <X />
            </Button>
            <a href="#colecao" onClick={() => setMenuOpen(false)}>
              COLEÇÃO <ArrowRight />
            </a>
            <a href="#sobre" onClick={() => setMenuOpen(false)}>
              NOSSA RUA <ArrowRight />
            </a>
            <Link to="/personalizar" onClick={() => setMenuOpen(false)}>
              CAMISA PERSONALIZADA <ArrowRight />
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                setMenuOpen(false);
                setAdminOpen(true);
              }}
            >
              EDITAR LOJA
            </Button>
          </nav>
        </div>
      )}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="modal-close"
              aria-label="Fechar peça"
              onClick={() => setSelected(null)}
            >
              <X />
            </Button>
            <div className="modal-images">
              <img src={selected.front_url} alt={`Frente da ${selected.name}`} />
              {selected.back_url && (
                <img src={selected.back_url} alt={`Costas da ${selected.name}`} />
              )}
            </div>
            <div className="modal-detail">
              <p className="eyebrow">GONÊ DA RUA / {selected.category.toUpperCase()}</p>
              <h2>{selected.name}</h2>
              <strong>{money(Number(selected.price))}</strong>
              {selected.description && <p>{selected.description}</p>}
              <p className="size-label">SELECIONE O TAMANHO</p>
              <div className="size-options">
                {["P", "M", "G", "GG", "XG"].map((s) => (
                  <Button
                    variant="outline"
                    key={s}
                    onClick={() => setSize(s)}
                    className={size === s ? "selected-size" : ""}
                  >
                    {s}
                  </Button>
                ))}
              </div>
              <Button className="add-cart" onClick={() => addToCart(selected, size)}>
                ADICIONAR À SACOLA <ArrowRight />
              </Button>
              <span className="modal-note">
                2 camisetas por {money(Number(store.promo_price))} · cupom de{" "}
                {money(Number(store.coupon_discount))}
              </span>
            </div>
          </div>
        </div>
      )}
      {cartOpen && (
        <div className="overlay" onClick={() => setCartOpen(false)}>
          <aside
            className="side-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Sacola"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-head">
              <div>
                <p className="eyebrow">SEU CORRE</p>
                <h2>
                  SACOLA <sup>{count}</sup>
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar sacola"
                onClick={() => setCartOpen(false)}
              >
                <X />
              </Button>
            </div>
            <div className="cart-content">
              {cart.length ? (
                cart.map((item) => (
                  <div className="cart-item" key={key(item.product.id, item.size)}>
                    <img src={item.product.front_url} alt={item.product.name} />
                    <div>
                      <h3>{item.product.name}</h3>
                      <span>
                        TAMANHO {item.size} / {money(Number(item.product.price))}
                      </span>
                      <div className="quantity">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Diminuir quantidade"
                          onClick={() => adjust(item.product, item.size, -1)}
                        >
                          {item.quantity === 1 ? <Trash2 size={15} /> : <Minus size={15} />}
                        </Button>
                        <b>{item.quantity}</b>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Aumentar quantidade"
                          onClick={() => adjust(item.product, item.size, 1)}
                        >
                          <Plus size={15} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="cart-empty">
                  <ShoppingBag size={35} />
                  <h3>SUA SACOLA ESTÁ VAZIA.</h3>
                  <p>O próximo corre começa com uma peça.</p>
                  <Button onClick={() => setCartOpen(false)}>
                    EXPLORAR COLEÇÃO <ArrowRight />
                  </Button>
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="cart-footer">
                <div className="coupon">
                  <input
                    value={couponInput}
                    placeholder="CÓDIGO DO CUPOM"
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      setCouponError("");
                    }}
                  />
                  <Button variant="outline" onClick={applyCoupon}>
                    APLICAR
                  </Button>
                </div>
                {couponError && <p className="coupon-error">{couponError}</p>}
                {couponApplied && (
                  <p className="coupon-success">
                    <Check size={14} /> Cupom aplicado
                  </p>
                )}
                <div className="totals">
                  <div>
                    <span>Peças</span>
                    <span>{money(rawTotal)}</span>
                  </div>
                  {rawTotal > subtotal && (
                    <div>
                      <span>Promoção 2 por {money(Number(store.promo_price))}</span>
                      <span>− {money(rawTotal - subtotal)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div>
                      <span>Cupom</span>
                      <span>− {money(discount)}</span>
                    </div>
                  )}
                  <div className="grand-total">
                    <strong>TOTAL</strong>
                    <strong>{money(total)}</strong>
                  </div>
                </div>
                {store.whatsapp_number.replace(/\D/g, "") ? (
                  <Button className="checkout" onClick={checkout}>
                    FINALIZAR PELO WHATSAPP <ArrowRight />
                  </Button>
                ) : (
                  <p className="checkout-unavailable">
                    Pedidos ainda indisponíveis. A loja precisa cadastrar um WhatsApp para receber
                    pedidos.
                  </p>
                )}
                <p className="checkout-note">
                  O pedido é enviado para confirmação da loja. Nenhum pagamento é feito aqui.
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
      {adminOpen && (
        <div className="overlay" onClick={() => setAdminOpen(false)}>
          <aside
            className="side-panel admin-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Editar loja"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-head">
              <div>
                <p className="eyebrow">PAINEL DA MARCA</p>
                <h2>EDITAR LOJA</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar editor"
                onClick={() => setAdminOpen(false)}
              >
                <X />
              </Button>
            </div>
            {admin ? (
              <div className="admin-content">
                <div className="admin-tabs">
                  <Button
                    variant={adminTab === "products" ? "default" : "ghost"}
                    onClick={() => {
                      setAdminTab("products");
                      setDraftProduct(null);
                    }}
                  >
                    PEÇAS
                  </Button>
                  <Button
                    variant={adminTab === "store" ? "default" : "ghost"}
                    onClick={() => setAdminTab("store")}
                  >
                    VISUAL & OFERTAS
                  </Button>
                </div>
                {adminMessage && <p className="admin-message">{adminMessage}</p>}
                {adminTab === "store" ? (
                  editStore
                ) : draftProduct ? (
                  <div className="admin-fields">
                    <Button
                      variant="ghost"
                      className="back-admin"
                      onClick={() => setDraftProduct(null)}
                    >
                      <ArrowLeft size={16} /> VOLTAR ÀS PEÇAS
                    </Button>
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
                      {field(
                        "Posição na vitrine",
                        draftProduct.sort_order ?? 0,
                        (v) => setDraftProduct({ ...draftProduct, sort_order: Number(v) }),
                        "number",
                      )}
                    </div>
                    {field("Categoria", draftProduct.category || "", (v) =>
                      setDraftProduct({ ...draftProduct, category: v }),
                    )}
                    {field("Descrição", draftProduct.description || "", (v) =>
                      setDraftProduct({ ...draftProduct, description: v }),
                    )}
                    <div className="admin-row">
                      {upload("Foto da frente", draftProduct.front_url, (v) =>
                        setDraftProduct((old) => ({ ...old, front_url: v })),
                      )}
                      {upload("Foto das costas", draftProduct.back_url, (v) =>
                        setDraftProduct((old) => ({ ...old, back_url: v })),
                      )}
                    </div>
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={draftProduct.active ?? true}
                        onChange={(e) =>
                          setDraftProduct({ ...draftProduct, active: e.target.checked })
                        }
                      />{" "}
                      Peça visível na loja
                    </label>
                    <Button
                      onClick={() => void saveProduct()}
                      disabled={saving}
                      className="w-full rounded-none"
                    >
                      {saving ? "Salvando..." : "Salvar peça"}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      className="new-product"
                      onClick={() => {
                        setDraftProduct({
                          name: "",
                          price: 99,
                          front_url: "",
                          back_url: null,
                          category: "Preta",
                          description: "",
                          sort_order: products.length + 1,
                          active: true,
                        });
                        setAdminMessage("");
                      }}
                    >
                      <Plus size={16} /> NOVA PEÇA
                    </Button>
                    <div className="admin-list">
                      {products.map((p) => (
                        <div className="admin-product" key={p.id}>
                          <img src={p.front_url} alt="" />
                          <div>
                            <strong>{p.name}</strong>
                            <span>
                              {money(Number(p.price))} · {p.active ? "Visível" : "Oculta"}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setDraftProduct(p);
                              setAdminMessage("");
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
                  </>
                )}
                <Button
                  variant="ghost"
                  className="admin-signout"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setAdmin(false);
                    setAdminMessage("Sessão encerrada.");
                  }}
                >
                  SAIR DO PAINEL
                </Button>
              </div>
            ) : (
              <div className="admin-content">
                <p className="admin-intro">
                  Entre para editar preços, estampas, fotos, cores e textos. Apenas a conta oficial
                  da loja pode assumir a administração.
                </p>
                <div className="admin-tabs">
                  <Button
                    variant={adminMode === "login" ? "default" : "ghost"}
                    onClick={() => setAdminMode("login")}
                  >
                    ENTRAR
                  </Button>
                  <Button
                    variant={adminMode === "signup" ? "default" : "ghost"}
                    onClick={() => setAdminMode("signup")}
                  >
                    CRIAR CONTA
                  </Button>
                </div>
                <form onSubmit={(e) => void authSubmit(e)} className="admin-fields">
                  {field("E-mail", adminEmail, setAdminEmail, "email")}
                  {field("Senha", adminPassword, setAdminPassword, "password")}
                  <Button type="submit" disabled={saving} className="w-full rounded-none">
                    {saving
                      ? "Aguarde..."
                      : adminMode === "login"
                        ? "ENTRAR NO PAINEL"
                        : "CRIAR CONTA"}
                  </Button>
                </form>
                {adminMessage && <p className="admin-message">{adminMessage}</p>}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
