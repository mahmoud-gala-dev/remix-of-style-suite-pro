
-- Prompt 9: Branch-scoped RLS
CREATE TABLE IF NOT EXISTS public.user_branches (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, branch_id)
);
GRANT SELECT ON public.user_branches TO authenticated;
GRANT ALL ON public.user_branches TO service_role;
ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own branches" ON public.user_branches;
CREATE POLICY "users read own branches" ON public.user_branches
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.user_has_branch(_uid uuid, _bid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'super_admin')
      OR EXISTS (SELECT 1 FROM public.user_branches WHERE user_id=_uid AND branch_id=_bid);
$$;

-- Replace policies with branch-scoped versions
DROP POLICY IF EXISTS "staff manage bookings" ON public.bookings;
CREATE POLICY "staff manage bookings" ON public.bookings
  FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()) AND public.user_has_branch(auth.uid(), branch_id))
  WITH CHECK (public.has_any_staff_role(auth.uid()) AND public.user_has_branch(auth.uid(), branch_id));

DROP POLICY IF EXISTS "staff manage customers" ON public.customers;
CREATE POLICY "staff manage customers" ON public.customers
  FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()) AND public.user_has_branch(auth.uid(), branch_id))
  WITH CHECK (public.has_any_staff_role(auth.uid()) AND public.user_has_branch(auth.uid(), branch_id));

DROP POLICY IF EXISTS "staff manage queue" ON public.queue_items;
CREATE POLICY "staff manage queue" ON public.queue_items
  FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()) AND public.user_has_branch(auth.uid(), branch_id))
  WITH CHECK (public.has_any_staff_role(auth.uid()) AND public.user_has_branch(auth.uid(), branch_id));

DROP POLICY IF EXISTS "Staff manage invoices" ON public.invoices;
CREATE POLICY "Staff manage invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()) AND public.user_has_branch(auth.uid(), branch_id))
  WITH CHECK (public.has_any_staff_role(auth.uid()) AND public.user_has_branch(auth.uid(), branch_id));

-- invoice_items has no branch_id; scope via parent invoice
DROP POLICY IF EXISTS "Staff manage invoice_items" ON public.invoice_items;
CREATE POLICY "Staff manage invoice_items" ON public.invoice_items
  FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.user_has_branch(auth.uid(), i.branch_id)
  ))
  WITH CHECK (public.has_any_staff_role(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.user_has_branch(auth.uid(), i.branch_id)
  ));

DROP POLICY IF EXISTS "Staff manage payments" ON public.payments;
CREATE POLICY "Staff manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (public.has_any_staff_role(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.user_has_branch(auth.uid(), i.branch_id)
  ))
  WITH CHECK (public.has_any_staff_role(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.user_has_branch(auth.uid(), i.branch_id)
  ));

-- Prompt 10: Overlap exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlap;
ALTER TABLE public.bookings ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (
    employee_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  ) WHERE (status NOT IN ('cancelled','no_show'));

-- Prompt 11: Audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid,
  table_name text NOT NULL,
  row_id text,
  action text NOT NULL,
  diff jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read audit" ON public.audit_log;
CREATE POLICY "admins read audit" ON public.audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.audit_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row_id text;
  v_diff jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row_id := COALESCE((to_jsonb(OLD)->>'id'), (to_jsonb(OLD)->>'user_id'));
    v_diff := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_row_id := COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(NEW)->>'user_id'));
    v_diff := to_jsonb(NEW);
  ELSE
    v_row_id := COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(NEW)->>'user_id'));
    v_diff := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  END IF;
  INSERT INTO public.audit_log(actor, table_name, row_id, action, diff)
  VALUES (auth.uid(), TG_TABLE_NAME, v_row_id, TG_OP, v_diff);
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_bookings_status ON public.bookings;
CREATE TRIGGER audit_bookings_status AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_invoices ON public.invoices;
CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Prompt 17: Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_start_at ON public.bookings (start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_branch_id ON public.bookings (branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_employee_start ON public.bookings (employee_id, start_at);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);
CREATE INDEX IF NOT EXISTS idx_queue_branch ON public.queue_items (branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_branch_created ON public.invoices (branch_id, created_at);

-- Auto-link super_admins to all branches for visibility (optional convenience)
-- Backfill: give existing staff access to all current branches so the app keeps working post-migration.
INSERT INTO public.user_branches (user_id, branch_id)
SELECT ur.user_id, b.id
FROM public.user_roles ur CROSS JOIN public.branches b
WHERE ur.role IN ('super_admin','admin','reception','staff')
ON CONFLICT DO NOTHING;
