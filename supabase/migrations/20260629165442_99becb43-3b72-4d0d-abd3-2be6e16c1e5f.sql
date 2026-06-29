
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS orders_deleted_at_idx ON public.orders(deleted_at);

DROP POLICY IF EXISTS "orders_admin_delete" ON public.orders;
CREATE POLICY "orders_admin_delete" ON public.orders FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
