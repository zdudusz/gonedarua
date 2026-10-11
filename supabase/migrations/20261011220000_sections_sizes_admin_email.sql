-- Secoes da vitrine (ex.: "Camisetas Pretas", "Lancamentos") e tamanhos por produto.
-- Leitura publica das secoes ativas; escrita so para admin (mesmo padrao de products).
CREATE TABLE public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sections TO authenticated;
GRANT ALL ON public.sections TO service_role;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public active sections" ON public.sections FOR SELECT TO anon USING (active = true);
CREATE POLICY "authenticated sections" ON public.sections FOR SELECT TO authenticated USING (active = true OR public.is_store_admin(auth.uid()));
CREATE POLICY "admin insert sections" ON public.sections FOR INSERT TO authenticated WITH CHECK (public.is_store_admin(auth.uid()));
CREATE POLICY "admin update sections" ON public.sections FOR UPDATE TO authenticated USING (public.is_store_admin(auth.uid())) WITH CHECK (public.is_store_admin(auth.uid()));
CREATE POLICY "admin delete sections" ON public.sections FOR DELETE TO authenticated USING (public.is_store_admin(auth.uid()));
CREATE TRIGGER touch_sections BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE FUNCTION public.touch_store_updated_at();

-- Excluir uma secao nao apaga as pecas: elas ficam sem secao ("Outras" na vitrine).
ALTER TABLE public.products
  ADD COLUMN section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  ADD COLUMN sizes text[] NOT NULL DEFAULT ARRAY['P','M','G','GG','XG']::text[]
    CHECK (cardinality(sizes) > 0);
CREATE INDEX products_section_id_idx ON public.products (section_id);

-- Converte as categorias atuais (Preta, Clara...) em secoes e liga cada peca a sua.
INSERT INTO public.sections (name, sort_order)
SELECT category, row_number() OVER (ORDER BY min(sort_order))
FROM public.products
GROUP BY category;

UPDATE public.products p
SET section_id = s.id
FROM public.sections s
WHERE s.name = p.category;

-- Conta administradora: eduardogamese8@gmail.com. Quem entra com esse e-mail
-- (ja confirmado) vira admin, mesmo que outra conta ja tenha sido admin antes.
-- Nenhum outro e-mail consegue se promover.
CREATE OR REPLACE FUNCTION app_private.claim_store_admin() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner_email constant text := 'eduardogamese8@gmail.com';
  caller_email text;
  caller_confirmed timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF public.is_store_admin(auth.uid()) THEN RETURN true; END IF;
  SELECT lower(email), email_confirmed_at INTO caller_email, caller_confirmed
  FROM auth.users WHERE id = auth.uid();
  IF caller_email IS DISTINCT FROM owner_email OR caller_confirmed IS NULL THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  RETURN true;
END $$;

-- Se a conta ja existe e esta confirmada, ja libera o admin agora.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
WHERE lower(email) = 'eduardogamese8@gmail.com' AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
