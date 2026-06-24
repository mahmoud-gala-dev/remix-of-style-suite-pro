
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE public.approval_kind AS ENUM ('discount', 'refund', 'cancel_paid_invoice', 'customer_delete', 'price_override', 'other');

CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.approval_kind NOT NULL,
  status public.approval_status NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  reason TEXT,
  amount NUMERIC,
  currency TEXT,
  reference_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX approval_requests_branch_status_idx ON public.approval_requests(branch_id, status, created_at DESC);
CREATE INDEX approval_requests_requested_by_idx ON public.approval_requests(requested_by, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals_read_tenant" ON public.approval_requests
  FOR SELECT TO authenticated
  USING (branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants())));

CREATE POLICY "approvals_insert_tenant" ON public.approval_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  );

CREATE POLICY "approvals_update_admin" ON public.approval_requests
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  )
  WITH CHECK (
    (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  );

CREATE TRIGGER approval_requests_updated_at
  BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
