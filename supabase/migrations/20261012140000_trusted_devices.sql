-- Aparelho confiavel: depois que a pessoa confirma o codigo do e-mail num
-- navegador, aquele navegador guarda um token aleatorio e o banco guarda so o
-- hash dele por 90 dias. Enquanto valer, o login com senha nao pede codigo.
CREATE TABLE public.trusted_devices (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '90 days',
  PRIMARY KEY (user_id, token_hash)
);
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
-- Ninguem le ou grava direto: so pelas funcoes abaixo.
REVOKE ALL ON public.trusted_devices FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.trusted_devices TO service_role;

-- Conta que nunca pede codigo (a da loja). Marcada no banco, nao na tela.
CREATE TABLE public.always_trusted_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.always_trusted_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.always_trusted_accounts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.always_trusted_accounts TO service_role;

INSERT INTO public.always_trusted_accounts (user_id)
SELECT id FROM auth.users WHERE lower(email) = 'gonedarua@gmail.com'
ON CONFLICT DO NOTHING;

-- Antes do login: este navegador ja pode entrar so com a senha?
-- Sem o token certo devolve false, entao nao revela nada de outras contas.
CREATE FUNCTION public.device_is_trusted(_email text, _token text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  WITH u AS (SELECT id FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1)
  SELECT EXISTS (SELECT 1 FROM public.always_trusted_accounts a JOIN u ON a.user_id = u.id)
    OR (
      length(coalesce(_token, '')) >= 32
      AND EXISTS (
        SELECT 1 FROM public.trusted_devices d JOIN u ON d.user_id = u.id
        WHERE d.token_hash = encode(digest(_token, 'sha256'), 'hex') AND d.expires_at > now()
      )
    )
$$;
REVOKE ALL ON FUNCTION public.device_is_trusted(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.device_is_trusted(text, text) TO anon, authenticated;

-- Depois do codigo: registra este navegador como confiavel. So vale numa sessao
-- aberta pelo codigo do e-mail (amr "otp") ou pelo link dele ("magiclink").
CREATE FUNCTION public.trust_this_device(_token text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF auth.uid() IS NULL OR length(coalesce(_token, '')) < 32 THEN RETURN false; END IF;
  IF NOT (
    coalesce(auth.jwt() -> 'amr', '[]'::jsonb) @> '[{"method":"otp"}]'
    OR coalesce(auth.jwt() -> 'amr', '[]'::jsonb) @> '[{"method":"magiclink"}]'
  ) THEN
    RETURN false;
  END IF;
  DELETE FROM public.trusted_devices WHERE user_id = auth.uid() AND expires_at <= now();
  INSERT INTO public.trusted_devices (user_id, token_hash)
  VALUES (auth.uid(), encode(digest(_token, 'sha256'), 'hex'))
  ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.trust_this_device(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trust_this_device(text) TO authenticated;

-- O admin entra direto com a senha, entao a permissao deixa de exigir sessao
-- aberta por codigo: basta o papel admin.
CREATE OR REPLACE FUNCTION app_private.is_store_admin(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;
