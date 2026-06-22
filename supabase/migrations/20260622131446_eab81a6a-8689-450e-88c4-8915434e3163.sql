ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deposit_amount_cents integer,
  ADD COLUMN IF NOT EXISTS deposit_currency text,
  ADD COLUMN IF NOT EXISTS deposit_intent_id text,
  ADD COLUMN IF NOT EXISTS deposit_status text,
  ADD COLUMN IF NOT EXISTS deposit_held_at timestamptz,
  ADD COLUMN IF NOT EXISTS deposit_settled_at timestamptz;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_deposit_status_chk;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_deposit_status_chk
  CHECK (deposit_status IS NULL OR deposit_status IN ('authorized','captured','released','failed'));

CREATE INDEX IF NOT EXISTS bookings_deposit_status_idx
  ON public.bookings (deposit_status, start_at);