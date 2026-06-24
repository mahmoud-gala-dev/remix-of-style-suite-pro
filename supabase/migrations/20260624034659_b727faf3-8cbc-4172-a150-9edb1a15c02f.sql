
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  referrer_reward numeric(12,2) NOT NULL DEFAULT 0,
  referee_reward numeric(12,2) NOT NULL DEFAULT 0,
  reward_type text NOT NULL DEFAULT 'credit' CHECK (reward_type IN ('credit','points','discount_pct')),
  uses_count integer NOT NULL DEFAULT 0,
  max_uses integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id)
);

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  referral_code_id uuid NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referrer_customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  referee_customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  referrer_reward numeric(12,2) NOT NULL DEFAULT 0,
  referee_reward numeric(12,2) NOT NULL DEFAULT 0,
  reward_type text NOT NULL DEFAULT 'credit',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referral_code_id, referee_customer_id)
);

CREATE INDEX idx_referral_codes_branch ON public.referral_codes(branch_id);
CREATE INDEX idx_referrals_branch ON public.referrals(branch_id);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members manage referral_codes" ON public.referral_codes
  FOR ALL TO authenticated
  USING (branch_id IN (SELECT b.id FROM public.branches b WHERE b.tenant_id = ANY(public.current_user_tenants())))
  WITH CHECK (branch_id IN (SELECT b.id FROM public.branches b WHERE b.tenant_id = ANY(public.current_user_tenants())));

CREATE POLICY "tenant members manage referrals" ON public.referrals
  FOR ALL TO authenticated
  USING (branch_id IN (SELECT b.id FROM public.branches b WHERE b.tenant_id = ANY(public.current_user_tenants())))
  WITH CHECK (branch_id IN (SELECT b.id FROM public.branches b WHERE b.tenant_id = ANY(public.current_user_tenants())));

CREATE TRIGGER set_referral_codes_updated_at
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
