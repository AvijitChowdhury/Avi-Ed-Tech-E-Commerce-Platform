ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS steadfast_consignment_id text,
  ADD COLUMN IF NOT EXISTS steadfast_tracking_code text,
  ADD COLUMN IF NOT EXISTS steadfast_status text,
  ADD COLUMN IF NOT EXISTS steadfast_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS steadfast_shipped_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_steadfast_consignment_idx ON public.orders(steadfast_consignment_id) WHERE steadfast_consignment_id IS NOT NULL;