import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
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
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/components/cart/CartProvider";
import { LoginWidget } from "@/components/auth/LoginWidget";
import { useAuth } from "@/components/auth/AuthProvider";
import { whatsappLink } from "@/lib/whatsapp";
import {
  DEFAULT_SIZES,
  fallbackStore,
  money,
  storeHighlight,
  type Product,
  type Section,
  type Store,
} from "@/lib/store";

const key = (id: string, size: string) => `${id}:${size}`;
const ALL = "Todas";
const OTHERS = "Outras";

export const Route = createFileRoute("/")({
  // ?entrar=1 (e os links antigos /entrar e /criar-conta) abre o painel de login.
  validateSearch: (search: Record<string, unknown>): { entrar?: boolean } =>
    [true, "1", "true"].includes(search["entrar"] as string | boolean) ? { entrar: true } : {},
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

function Index() {
  const { entrar } = Route.useSearch();
  const { isAdmin } = useAuth();
  const [store, setStore] = useState<Store>(fallbackStore);
  const [products, setProducts] = useState<Product[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState(ALL);
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

  async function refresh() {
    const [s, sec, p] = await Promise.all([
      supabase.from("store_settings").select("*").eq("id", 1).single(),
      supabase.from("sections").select("*").eq("active", true).order("sort_order"),
      supabase.from("products").select("*").eq("active", true).order("sort_order"),
    ]);
    if (s.data) setStore(s.data as Store);
    if (sec.data) setSections(sec.data as Section[]);
    if (p.data) setProducts(p.data as Product[]);
    setError(s.error?.message || sec.error?.message || p.error?.message || "");
    setLoading(false);
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    const original = document.body.style.overflow;
    if (selected || cartOpen || menuOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [selected, cartOpen, menuOpen]);

  // Pecas sem secao (ou de secao escondida) caem em "Outras".
  const sectionName = (product: Product) =>
    sections.find((s) => s.id === product.section_id)?.name ?? OTHERS;
  const groups = useMemo(() => {
    const term = search.toLowerCase();
    const matching = products.filter((p) => p.name.toLowerCase().includes(term));
    const list = sections.map((s) => ({
      id: s.id,
      name: s.name,
      items: matching.filter((p) => p.section_id === s.id),
    }));
    const known = new Set(sections.map((s) => s.id));
    list.push({
      id: OTHERS,
      name: OTHERS,
      items: matching.filter((p) => !p.section_id || !known.has(p.section_id)),
    });
    return list.filter((g) => g.items.length);
  }, [products, sections, search]);
  const shownGroups = filter === ALL ? groups : groups.filter((g) => g.id === filter);
  const visibleCount = shownGroups.reduce((n, g) => n + g.items.length, 0);
  const filters = [{ id: ALL, name: ALL }, ...groups.map((g) => ({ id: g.id, name: g.name }))];
  const productSizes = (product: Product) =>
    product.sizes?.length ? product.sizes : DEFAULT_SIZES;
  const openProduct = (product: Product) => {
    const sizes = productSizes(product);
    setSelected(product);
    setSize(sizes.includes("M") ? "M" : (sizes[0] ?? "M"));
  };
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
    addItem(
      {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        front_url: product.front_url,
      },
      chosenSize,
    );
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
  return (
    <div
      className="site"
      style={{ "--store-highlight": storeHighlight(store) } as React.CSSProperties}
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
          <LoginWidget defaultOpen={Boolean(entrar)} />
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
              {filters.map((f) => (
                <Button
                  key={f.id}
                  variant="ghost"
                  onClick={() => setFilter(f.id)}
                  className={`filter ${filter === f.id ? "active" : ""}`}
                >
                  {f.name.toUpperCase()}
                </Button>
              ))}
            </div>
            <span className="product-count">
              {visibleCount.toString().padStart(2, "0")} PEÇAS <ChevronDown size={15} />
            </span>
          </div>
          {loading ? (
            <div className="empty">CARREGANDO COLEÇÃO...</div>
          ) : error ? (
            <div className="empty">Não foi possível carregar a coleção. {error}</div>
          ) : visibleCount ? (
            <div className="shop-sections">
              {shownGroups.map((group) => (
                <div className="shop-section" key={group.id}>
                  {groups.length > 1 && (
                    <div className="shop-section-head">
                      <h3>{group.name}</h3>
                      <span>{group.items.length.toString().padStart(2, "0")} PEÇAS</span>
                    </div>
                  )}
                  <div className={`product-grid grid-${store.grid_columns}`}>
                    {group.items.map((product, index) => (
                      <article className="product-card" key={product.id}>
                        <Button
                          variant="ghost"
                          className="product-image"
                          onClick={() => openProduct(product)}
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
                          <span className="image-index">
                            GDR—{String(index + 1).padStart(2, "0")}
                          </span>
                          {product.back_url && <span className="back-hint">FRENTE / COSTAS</span>}
                          <span className="quick-add">
                            VER PEÇA <ArrowRight size={16} />
                          </span>
                        </Button>
                        <div className="product-info">
                          <div>
                            <p>OVERSIZED / {group.name.toUpperCase()}</p>
                            <h3>{product.name}</h3>
                          </div>
                          <strong>{money(Number(product.price))}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
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
            {isAdmin && (
              <Link to="/editar">
                <Settings2 size={15} /> EDITAR LOJA
              </Link>
            )}
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
            {isAdmin && (
              <Link to="/editar" onClick={() => setMenuOpen(false)}>
                EDITAR LOJA <ArrowRight />
              </Link>
            )}
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
              <p className="eyebrow">GONÊ DA RUA / {sectionName(selected).toUpperCase()}</p>
              <h2>{selected.name}</h2>
              <strong>{money(Number(selected.price))}</strong>
              {selected.description && <p>{selected.description}</p>}
              <p className="size-label">SELECIONE O TAMANHO</p>
              <div className="size-options">
                {productSizes(selected).map((s) => (
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
    </div>
  );
}
