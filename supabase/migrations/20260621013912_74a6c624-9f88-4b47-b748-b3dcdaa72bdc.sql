ALTER TABLE public.webhook_deliveries
  ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry
  ON public.webhook_deliveries (next_retry_at)
  WHERE failed = false AND next_retry_at IS NOT NULL;