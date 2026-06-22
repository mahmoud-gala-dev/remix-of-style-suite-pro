-- 1) Recurring bookings: tag bookings created as a series
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS recurrence_group_id uuid NULL;

CREATE INDEX IF NOT EXISTS bookings_recurrence_group_idx
  ON public.bookings(recurrence_group_id)
  WHERE recurrence_group_id IS NOT NULL;

-- 2) Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_branch_idx ON public.reviews(branch_id);
CREATE INDEX IF NOT EXISTS reviews_employee_idx ON public.reviews(employee_id);

GRANT SELECT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Staff of the branch (or admins/super_admins) can read reviews
CREATE POLICY "Staff can view branch reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.user_branches ub
      WHERE ub.user_id = auth.uid() AND ub.branch_id = reviews.branch_id
    )
  );