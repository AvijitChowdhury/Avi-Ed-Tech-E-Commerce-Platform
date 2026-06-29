
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fraud_risk text,
  ADD COLUMN IF NOT EXISTS fraud_total_parcel int,
  ADD COLUMN IF NOT EXISTS fraud_success int,
  ADD COLUMN IF NOT EXISTS fraud_cancelled int,
  ADD COLUMN IF NOT EXISTS fraud_success_ratio numeric,
  ADD COLUMN IF NOT EXISTS fraud_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS fraud_raw jsonb;

CREATE TABLE IF NOT EXISTS public.fraud_checks (
  phone text PRIMARY KEY,
  risk text,
  total_parcel int,
  success int,
  cancelled int,
  success_ratio numeric,
  raw jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fraud_checks TO authenticated;
GRANT ALL ON public.fraud_checks TO service_role;
ALTER TABLE public.fraud_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage fraud_checks" ON public.fraud_checks;
CREATE POLICY "admins manage fraud_checks" ON public.fraud_checks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS fraud_checks_touch ON public.fraud_checks;
CREATE TRIGGER fraud_checks_touch BEFORE UPDATE ON public.fraud_checks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO authenticated, anon;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone read app_settings" ON public.app_settings;
CREATE POLICY "anyone read app_settings" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admins manage app_settings" ON public.app_settings;
CREATE POLICY "admins manage app_settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS app_settings_touch ON public.app_settings;
CREATE TRIGGER app_settings_touch BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.app_settings (key, value) VALUES
  ('fraud', '{"auto_check": true, "block_high_risk": false, "high_risk_ratio": 0.5}'::jsonb)
ON CONFLICT (key) DO NOTHING;
