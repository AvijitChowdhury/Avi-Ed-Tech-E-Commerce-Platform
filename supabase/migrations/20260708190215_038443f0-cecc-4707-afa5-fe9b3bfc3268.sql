DROP POLICY IF EXISTS "anyone read app_settings" ON public.app_settings;
REVOKE SELECT ON public.app_settings FROM anon;
CREATE POLICY "admins read app_settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));