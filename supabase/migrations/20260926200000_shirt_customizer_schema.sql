-- Personalizador de camisetas: cores por produto, configuracao de area/preco por
-- produto, e as personalizacoes em si (uma por cliente, protegida por RLS).
-- Sem Supabase Storage (buckets desabilitados neste workspace): artes e previews
-- sao guardados como data URLs nas colunas *_artwork_url / *_preview_url, igual ao
-- padrao ja usado para fotos de produto em products.front_url/back_url.

CREATE TABLE public.product_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  hex text NOT NULL CHECK (hex ~ '^#[0-9a-fA-F]{6}$'),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.product_colors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_colors TO authenticated;
GRANT ALL ON public.product_colors TO service_role;
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public active colors" ON public.product_colors FOR SELECT TO anon USING (active = true);
CREATE POLICY "authenticated colors" ON public.product_colors FOR SELECT TO authenticated USING (active = true OR public.is_store_admin(auth.uid()));
CREATE POLICY "admin insert colors" ON public.product_colors FOR INSERT TO authenticated WITH CHECK (public.is_store_admin(auth.uid()));
CREATE POLICY "admin update colors" ON public.product_colors FOR UPDATE TO authenticated USING (public.is_store_admin(auth.uid())) WITH CHECK (public.is_store_admin(auth.uid()));
CREATE POLICY "admin delete colors" ON public.product_colors FOR DELETE TO authenticated USING (public.is_store_admin(auth.uid()));

CREATE TABLE public.product_customizer_configs (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  garment_width_cm numeric(6,2) NOT NULL DEFAULT 52,
  garment_height_cm numeric(6,2) NOT NULL DEFAULT 70,
  -- {xCm,yCm,widthCm,heightCm}: retangulo em cm dentro do bounding box da camiseta
  front_print_area jsonb NOT NULL DEFAULT '{"xCm":6,"yCm":13,"widthCm":40,"heightCm":44}',
  back_print_area jsonb NOT NULL DEFAULT '{"xCm":6,"yCm":13,"widthCm":40,"heightCm":44}',
  -- AreaPricingConfig: ver src/lib/customization-pricing.ts (mesma formula do trigger abaixo)
  pricing jsonb NOT NULL DEFAULT '{"baseShirtPrice":100,"referenceFrontWidthCm":40,"referenceFrontHeightCm":40,"referenceBackWidthCm":40,"referenceBackHeightCm":40,"referenceTotalPrice":180,"minimumPrice":89,"maximumPrice":260}'
);
GRANT SELECT ON public.product_customizer_configs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_customizer_configs TO authenticated;
GRANT ALL ON public.product_customizer_configs TO service_role;
ALTER TABLE public.product_customizer_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public enabled configs" ON public.product_customizer_configs FOR SELECT TO anon USING (enabled = true);
CREATE POLICY "authenticated configs" ON public.product_customizer_configs FOR SELECT TO authenticated USING (enabled = true OR public.is_store_admin(auth.uid()));
CREATE POLICY "admin insert configs" ON public.product_customizer_configs FOR INSERT TO authenticated WITH CHECK (public.is_store_admin(auth.uid()));
CREATE POLICY "admin update configs" ON public.product_customizer_configs FOR UPDATE TO authenticated USING (public.is_store_admin(auth.uid())) WITH CHECK (public.is_store_admin(auth.uid()));
CREATE POLICY "admin delete configs" ON public.product_customizer_configs FOR DELETE TO authenticated USING (public.is_store_admin(auth.uid()));

CREATE TABLE public.product_customizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  color_id uuid NOT NULL REFERENCES public.product_colors(id),
  -- ShirtCustomization normalizado (0..1): ver src/components/shirt-customizer/customization.types.ts
  configuration jsonb NOT NULL,
  front_width_cm numeric(8,2) NOT NULL DEFAULT 0,
  front_height_cm numeric(8,2) NOT NULL DEFAULT 0,
  back_width_cm numeric(8,2) NOT NULL DEFAULT 0,
  back_height_cm numeric(8,2) NOT NULL DEFAULT 0,
  front_area_cm2 numeric(12,2) NOT NULL DEFAULT 0,
  back_area_cm2 numeric(12,2) NOT NULL DEFAULT 0,
  calculated_price numeric(12,2) NOT NULL DEFAULT 0,
  front_artwork_url text,
  back_artwork_url text,
  front_preview_url text,
  back_preview_url text,
  status text NOT NULL DEFAULT 'editing'
    CHECK (status IN ('editing','pending_review','approved','needs_adjustment','in_production','completed','cancelled')),
  whatsapp_attachment_status text NOT NULL DEFAULT 'not_required'
    CHECK (whatsapp_attachment_status IN ('not_required','pending_automatic_send','sent_automatically','awaiting_manual_send','confirmed_by_store','send_failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_customizations TO authenticated;
GRANT ALL ON public.product_customizations TO service_role;
ALTER TABLE public.product_customizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own customizations select" ON public.product_customizations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_store_admin(auth.uid()));
CREATE POLICY "own customizations insert" ON public.product_customizations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own customizations update" ON public.product_customizations FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'editing') WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin update customizations" ON public.product_customizations FOR UPDATE TO authenticated USING (public.is_store_admin(auth.uid())) WITH CHECK (public.is_store_admin(auth.uid()));
CREATE POLICY "own customizations delete" ON public.product_customizations FOR DELETE TO authenticated USING (user_id = auth.uid() AND status = 'editing');
CREATE TRIGGER touch_customizations BEFORE UPDATE ON public.product_customizations FOR EACH ROW EXECUTE FUNCTION public.touch_store_updated_at();

CREATE TABLE public.product_customization_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customization_id uuid NOT NULL REFERENCES public.product_customizations(id) ON DELETE CASCADE,
  size_id text NOT NULL,
  label text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_customization_sizes TO authenticated;
GRANT ALL ON public.product_customization_sizes TO service_role;
ALTER TABLE public.product_customization_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sizes select" ON public.product_customization_sizes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.product_customizations c WHERE c.id = customization_id AND (c.user_id = auth.uid() OR public.is_store_admin(auth.uid())))
);
CREATE POLICY "own sizes insert" ON public.product_customization_sizes FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.product_customizations c WHERE c.id = customization_id AND c.user_id = auth.uid() AND c.status = 'editing')
);
CREATE POLICY "own sizes update" ON public.product_customization_sizes FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.product_customizations c WHERE c.id = customization_id AND c.user_id = auth.uid() AND c.status = 'editing')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.product_customizations c WHERE c.id = customization_id AND c.user_id = auth.uid())
);
CREATE POLICY "own sizes delete" ON public.product_customization_sizes FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.product_customizations c WHERE c.id = customization_id AND c.user_id = auth.uid() AND c.status = 'editing')
);

-- Preco e area sao sempre recalculados aqui, nunca aceitos do navegador. front_w/h e
-- back_w/h derivam do retangulo normalizado (configuration->front/back) multiplicado
-- pelas dimensoes fisicas do produto (garment_width_cm/garment_height_cm) -- nao dos
-- valores front_width_cm/back_width_cm que o cliente possa ter enviado. Se a area
-- resultante ultrapassar a area de impressao configurada, o INSERT/UPDATE e rejeitado
-- (isso tambem funciona como teto de preco: nao ha como inflar area alem do permitido).
CREATE FUNCTION public.recalculate_customization_price() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  cfg public.product_customizer_configs%ROWTYPE;
  front_side jsonb; back_side jsonb;
  front_w numeric; front_h numeric; back_w numeric; back_h numeric;
  reference_area numeric; artwork_area numeric; surcharge numeric; price numeric;
BEGIN
  SELECT * INTO cfg FROM public.product_customizer_configs WHERE product_id = NEW.product_id;
  IF cfg IS NULL OR cfg.enabled = false THEN
    RAISE EXCEPTION 'Este produto nao esta habilitado para personalizacao.';
  END IF;

  front_side := NEW.configuration->'front';
  back_side := NEW.configuration->'back';

  front_w := COALESCE((front_side->>'width')::numeric, 0) * cfg.garment_width_cm;
  front_h := COALESCE((front_side->>'height')::numeric, 0) * cfg.garment_height_cm;
  back_w := COALESCE((back_side->>'width')::numeric, 0) * cfg.garment_width_cm;
  back_h := COALESCE((back_side->>'height')::numeric, 0) * cfg.garment_height_cm;

  IF front_side IS NULL OR front_side->>'assetId' IS NULL THEN front_w := 0; front_h := 0; END IF;
  IF back_side IS NULL OR back_side->>'assetId' IS NULL THEN back_w := 0; back_h := 0; END IF;

  IF front_w > (cfg.front_print_area->>'widthCm')::numeric OR front_h > (cfg.front_print_area->>'heightCm')::numeric THEN
    RAISE EXCEPTION 'A arte da frente ultrapassa a area de impressao permitida.';
  END IF;
  IF back_w > (cfg.back_print_area->>'widthCm')::numeric OR back_h > (cfg.back_print_area->>'heightCm')::numeric THEN
    RAISE EXCEPTION 'A arte das costas ultrapassa a area de impressao permitida.';
  END IF;

  NEW.front_width_cm := round(front_w, 2);
  NEW.front_height_cm := round(front_h, 2);
  NEW.back_width_cm := round(back_w, 2);
  NEW.back_height_cm := round(back_h, 2);
  NEW.front_area_cm2 := round(front_w * front_h, 2);
  NEW.back_area_cm2 := round(back_w * back_h, 2);

  reference_area := (cfg.pricing->>'referenceFrontWidthCm')::numeric * (cfg.pricing->>'referenceFrontHeightCm')::numeric
                   + (cfg.pricing->>'referenceBackWidthCm')::numeric * (cfg.pricing->>'referenceBackHeightCm')::numeric;
  artwork_area := NEW.front_area_cm2 + NEW.back_area_cm2;
  surcharge := CASE WHEN reference_area > 0
    THEN (artwork_area / reference_area) * ((cfg.pricing->>'referenceTotalPrice')::numeric - (cfg.pricing->>'baseShirtPrice')::numeric)
    ELSE 0 END;
  price := (cfg.pricing->>'baseShirtPrice')::numeric + surcharge;
  IF cfg.pricing ? 'minimumPrice' THEN price := GREATEST(price, (cfg.pricing->>'minimumPrice')::numeric); END IF;
  IF cfg.pricing ? 'maximumPrice' THEN price := LEAST(price, (cfg.pricing->>'maximumPrice')::numeric); END IF;
  NEW.calculated_price := round(price, 2);

  RETURN NEW;
END $$;
CREATE TRIGGER price_customizations BEFORE INSERT OR UPDATE ON public.product_customizations
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_customization_price();

-- Seed: habilita o personalizador para o catalogo atual e da 1 cor (derivada da
-- categoria existente) por produto, para o color-picker ter ao menos um swatch.
INSERT INTO public.product_customizer_configs (product_id)
SELECT id FROM public.products;

INSERT INTO public.product_colors (product_id, name, hex, sort_order)
SELECT id,
       CASE WHEN category = 'Clara' THEN 'Branco' ELSE 'Preto' END,
       CASE WHEN category = 'Clara' THEN '#f5f5f0' ELSE '#141414' END,
       0
FROM public.products;
