CREATE TABLE public.gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  initial_amount numeric NOT NULL CHECK (initial_amount > 0),
  balance numeric NOT NULL CHECK (balance >= 0),
  currency text NOT NULL DEFAULT 'SAR',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','expired','cancelled')),
  issued_to_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  issued_to_name text,
  issued_to_phone text,
  issued_to_email text,
  message text,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_cards TO authenticated;
GRANT ALL ON public.gift_cards TO service_role;

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage gift_cards in their tenant"
ON public.gift_cards FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'super_admin')
  OR tenant_id = ANY(public.current_user_tenants())
)
WITH CHECK (
  public.has_role(auth.uid(),'super_admin')
  OR tenant_id = ANY(public.current_user_tenants())
);

CREATE TRIGGER set_gift_cards_updated_at
BEFORE UPDATE ON public.gift_cards
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_gift_cards_tenant ON public.gift_cards(tenant_id);
CREATE INDEX idx_gift_cards_code ON public.gift_cards(code);
CREATE INDEX idx_gift_cards_customer ON public.gift_cards(issued_to_customer_id);

CREATE TABLE public.gift_card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id uuid NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('issue','redeem','refund','adjust','cancel')),
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  note text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_card_transactions TO authenticated;
GRANT ALL ON public.gift_card_transactions TO service_role;

ALTER TABLE public.gift_card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage gift_card_transactions in their tenant"
ON public.gift_card_transactions FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'super_admin')
  OR tenant_id = ANY(public.current_user_tenants())
)
WITH CHECK (
  public.has_role(auth.uid(),'super_admin')
  OR tenant_id = ANY(public.current_user_tenants())
);

CREATE INDEX idx_gift_card_tx_card ON public.gift_card_transactions(gift_card_id);
CREATE INDEX idx_gift_card_tx_tenant ON public.gift_card_transactions(tenant_id);