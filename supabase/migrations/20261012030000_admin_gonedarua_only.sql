-- Conta administradora passa a ser so gonedarua@gmail.com. Quem entra com esse
-- e-mail (ja confirmado) vira admin; qualquer outra conta, inclusive o admin
-- anterior (eduardogamese8@gmail.com), volta a ser usuario comum.
CREATE OR REPLACE FUNCTION app_private.claim_store_admin() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner_email constant text := 'gonedarua@gmail.com';
  caller_email text;
  caller_confirmed timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT lower(email), email_confirmed_at INTO caller_email, caller_confirmed
  FROM auth.users WHERE id = auth.uid();
  IF caller_email IS DISTINCT FROM owner_email OR caller_confirmed IS NULL THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  RETURN true;
END $$;

-- Rebaixa todo admin que nao seja o e-mail oficial.
UPDATE public.user_roles r SET role = 'user'
WHERE r.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = r.user_id AND lower(u.email) = 'gonedarua@gmail.com'
  );

-- Se a conta oficial ja existe e esta confirmada, ja libera o admin agora.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
WHERE lower(email) = 'gonedarua@gmail.com' AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- O login agora pede o codigo enviado por e-mail. A permissao de admin so vale
-- numa sessao aberta por esse codigo (amr "otp"; "magiclink" se entrou pelo
-- link do mesmo e-mail), entao so a senha do admin nao basta para gravar.
CREATE OR REPLACE FUNCTION app_private.is_store_admin(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    AND (
      coalesce(auth.jwt() -> 'amr', '[]'::jsonb) @> '[{"method":"otp"}]'
      OR coalesce(auth.jwt() -> 'amr', '[]'::jsonb) @> '[{"method":"magiclink"}]'
    )
$$;
