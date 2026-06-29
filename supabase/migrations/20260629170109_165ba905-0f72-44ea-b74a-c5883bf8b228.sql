
-- product kind: simple vs variable
DO $$ BEGIN
  CREATE TYPE public.product_kind AS ENUM ('simple','variable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- brands
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT ALL ON public.brands TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.brands TO authenticated;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brands_public_read" ON public.brands;
CREATE POLICY "brands_public_read" ON public.brands FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "brands_admin_write" ON public.brands;
CREATE POLICY "brands_admin_write" ON public.brands FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
DROP TRIGGER IF EXISTS brands_touch ON public.brands;
CREATE TRIGGER brands_touch BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- tags
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tags TO anon, authenticated;
GRANT ALL ON public.tags TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.tags TO authenticated;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tags_public_read" ON public.tags;
CREATE POLICY "tags_public_read" ON public.tags FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "tags_admin_write" ON public.tags;
CREATE POLICY "tags_admin_write" ON public.tags FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.product_tags (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);
GRANT SELECT ON public.product_tags TO anon, authenticated;
GRANT ALL ON public.product_tags TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.product_tags TO authenticated;
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_tags_public_read" ON public.product_tags;
CREATE POLICY "product_tags_public_read" ON public.product_tags FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "product_tags_admin_write" ON public.product_tags;
CREATE POLICY "product_tags_admin_write" ON public.product_tags FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- variations
CREATE TABLE IF NOT EXISTS public.product_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  compare_price numeric(10,2),
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_variations TO anon, authenticated;
GRANT ALL ON public.product_variations TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.product_variations TO authenticated;
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_variations_public_read" ON public.product_variations;
CREATE POLICY "product_variations_public_read" ON public.product_variations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "product_variations_admin_write" ON public.product_variations;
CREATE POLICY "product_variations_admin_write" ON public.product_variations FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
DROP TRIGGER IF EXISTS product_variations_touch ON public.product_variations;
CREATE TRIGGER product_variations_touch BEFORE UPDATE ON public.product_variations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- related products
CREATE TABLE IF NOT EXISTS public.related_products (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  related_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, related_id),
  CHECK (product_id <> related_id)
);
GRANT SELECT ON public.related_products TO anon, authenticated;
GRANT ALL ON public.related_products TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.related_products TO authenticated;
ALTER TABLE public.related_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "related_products_public_read" ON public.related_products;
CREATE POLICY "related_products_public_read" ON public.related_products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "related_products_admin_write" ON public.related_products;
CREATE POLICY "related_products_admin_write" ON public.related_products FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- product enrichments
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS kind public.product_kind NOT NULL DEFAULT 'simple';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_cost numeric(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
