
CREATE TYPE public.billing_tier AS ENUM ('free', 'pro', 'enterprise');

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tier public.billing_tier NOT NULL DEFAULT 'free',
  max_bookings_per_month INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins read own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.user_branches ub
      JOIN public.branches b ON b.id = ub.branch_id
      WHERE ub.user_id = auth.uid() AND b.tenant_id = subscriptions.tenant_id
    )
  );

CREATE POLICY "Super admin manages subscriptions"
  ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.count_tenant_bookings_this_period(_tenant_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.bookings bk
  JOIN public.branches b ON b.id = bk.branch_id
  JOIN public.subscriptions s ON s.tenant_id = b.tenant_id
  WHERE b.tenant_id = _tenant_id
    AND bk.created_at >= s.current_period_start
    AND bk.created_at <  s.current_period_end
$$;

REVOKE EXECUTE ON FUNCTION public.count_tenant_bookings_this_period(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_tenant_bookings_this_period(UUID) TO authenticated, service_role;

-- Seed free subscriptions for existing tenants
INSERT INTO public.subscriptions (tenant_id)
SELECT id FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;
