
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS manage_token uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_manage_token_key ON public.bookings(manage_token);

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  preferred_date date,
  notes text,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist TO authenticated;
GRANT ALL ON public.waitlist TO service_role;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_waitlist" ON public.waitlist FOR SELECT TO authenticated
  USING (public.user_has_branch(auth.uid(), branch_id));
CREATE POLICY "staff_write_waitlist" ON public.waitlist FOR ALL TO authenticated
  USING (public.user_has_branch(auth.uid(), branch_id))
  WITH CHECK (public.user_has_branch(auth.uid(), branch_id));

CREATE INDEX IF NOT EXISTS waitlist_branch_status_idx ON public.waitlist(branch_id, status, created_at);
