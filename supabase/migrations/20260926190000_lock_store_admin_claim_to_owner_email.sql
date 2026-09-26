-- Security fix: claim_store_admin() previously granted admin to whichever
-- authenticated user called it first, with no check on identity. Any visitor
-- who signed up before the real owner would have permanently taken over the
-- store's admin role. Lock the first-claim path to the owner's email.
CREATE OR REPLACE FUNCTION app_private.claim_store_admin() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner_email constant text := 'gonedarua@gmail.com';
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(86753091);
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN public.is_store_admin(auth.uid());
  END IF;
  IF lower(coalesce(auth.email(), '')) IS DISTINCT FROM owner_email THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  RETURN true;
END $$;
