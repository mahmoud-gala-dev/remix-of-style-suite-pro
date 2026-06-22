ALTER TABLE public.customer_memberships
  ADD COLUMN IF NOT EXISTS expiry_reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS customer_memberships_expiry_reminder_idx
  ON public.customer_memberships (expires_at)
  WHERE expiry_reminder_sent_at IS NULL;