
CREATE TABLE public.service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  description text,
  service_ids uuid[] NOT NULL DEFAULT '{}',
  sessions_count integer NOT NULL CHECK (sessions_count > 0),
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'SAR',
  validity_days integer NOT NULL DEFAULT 365 CHECK (validity_days > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customer_package_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.service_packages(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sessions_total integer NOT NULL CHECK (sessions_total > 0),
  sessions_remaining integer NOT NULL CHECK (sessions_remaining >= 0),
  price_paid numeric(12,2) NOT NULL CHECK (price_paid >= 0),
  currency text NOT NULL DEFAULT 'SAR',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','exhausted','expired','cancelled')),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.package_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  purchase_id uuid NOT NULL REFERENCES public.customer_package_purchases(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  sessions_used integer NOT NULL DEFAULT 1 CHECK (sessions_used > 0),
  used_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_packages_branch ON public.service_packages(branch_id);
CREATE INDEX idx_cpp_branch ON public.customer_package_purchases(branch_id);
CREATE INDEX idx_cpp_customer ON public.customer_package_purchases(customer_id);
CREATE INDEX idx_package_usages_purchase ON public.package_usages(purchase_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_packages TO authenticated;
GRANT ALL ON public.service_packages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_package_purchases TO authenticated;
GRANT ALL ON public.customer_package_purchases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_usages TO authenticated;
GRANT ALL ON public.package_usages TO service_role;

ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_package_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members manage service_packages" ON public.service_packages
  FOR ALL TO authenticated
  USING (branch_id IN (SELECT b.id FROM public.branches b WHERE b.tenant_id = ANY(public.current_user_tenants())))
  WITH CHECK (branch_id IN (SELECT b.id FROM public.branches b WHERE b.tenant_id = ANY(public.current_user_tenants())));

CREATE POLICY "tenant members manage customer_package_purchases" ON public.customer_package_purchases
  FOR ALL TO authenticated
  USING (branch_id IN (SELECT b.id FROM public.branches b WHERE b.tenant_id = ANY(public.current_user_tenants())))
  WITH CHECK (branch_id IN (SELECT b.id FROM public.branches b WHERE b.tenant_id = ANY(public.current_user_tenants())));

CREATE POLICY "tenant members manage package_usages" ON public.package_usages
  FOR ALL TO authenticated
  USING (purchase_id IN (
    SELECT cpp.id FROM public.customer_package_purchases cpp
    JOIN public.branches b ON b.id = cpp.branch_id
    WHERE b.tenant_id = ANY(public.current_user_tenants())
  ))
  WITH CHECK (purchase_id IN (
    SELECT cpp.id FROM public.customer_package_purchases cpp
    JOIN public.branches b ON b.id = cpp.branch_id
    WHERE b.tenant_id = ANY(public.current_user_tenants())
  ));

CREATE TRIGGER set_service_packages_updated_at
  BEFORE UPDATE ON public.service_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_cpp_updated_at
  BEFORE UPDATE ON public.customer_package_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
