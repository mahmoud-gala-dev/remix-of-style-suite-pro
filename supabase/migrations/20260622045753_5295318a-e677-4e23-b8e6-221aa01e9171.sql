-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text NULL,
  unit text NOT NULL DEFAULT 'unit',
  cost numeric(10,2) NOT NULL DEFAULT 0,
  price numeric(10,2) NOT NULL DEFAULT 0,
  stock numeric(12,2) NOT NULL DEFAULT 0,
  low_stock_threshold numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_branch_idx ON public.products(branch_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage branch products"
  ON public.products FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.user_branches ub WHERE ub.user_id = auth.uid() AND ub.branch_id = products.branch_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.user_branches ub WHERE ub.user_id = auth.uid() AND ub.branch_id = products.branch_id)
  );

-- Stock movements (audit log)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('purchase','sale','usage','adjustment','waste')),
  qty numeric(12,2) NOT NULL,
  unit_cost numeric(10,2) NULL,
  note text NULL,
  booking_id uuid NULL REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS stock_movements_branch_idx ON public.stock_movements(branch_id);

GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view branch stock movements"
  ON public.stock_movements FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.user_branches ub WHERE ub.user_id = auth.uid() AND ub.branch_id = stock_movements.branch_id)
  );

CREATE POLICY "Staff insert branch stock movements"
  ON public.stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.user_branches ub WHERE ub.user_id = auth.uid() AND ub.branch_id = stock_movements.branch_id)
  );

-- Trigger: keep products.stock in sync with movements
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kind IN ('purchase') THEN
    UPDATE public.products SET stock = stock + NEW.qty, updated_at = now() WHERE id = NEW.product_id;
  ELSIF NEW.kind IN ('sale','usage','waste') THEN
    UPDATE public.products SET stock = stock - NEW.qty, updated_at = now() WHERE id = NEW.product_id;
  ELSIF NEW.kind = 'adjustment' THEN
    UPDATE public.products SET stock = stock + NEW.qty, updated_at = now() WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_stock_movement ON public.stock_movements;
CREATE TRIGGER trg_apply_stock_movement
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- Commissions
CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  service_price numeric(10,2) NOT NULL,
  commission_pct numeric(5,2) NOT NULL,
  amount numeric(10,2) NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commissions_employee_idx ON public.commissions(employee_id);
CREATE INDEX IF NOT EXISTS commissions_branch_idx ON public.commissions(branch_id);

GRANT SELECT, UPDATE ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view branch commissions"
  ON public.commissions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.user_branches ub WHERE ub.user_id = auth.uid() AND ub.branch_id = commissions.branch_id)
  );

CREATE POLICY "Admins update commissions"
  ON public.commissions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Trigger: auto-insert / clear commission when a booking is completed / cancelled
CREATE OR REPLACE FUNCTION public.sync_booking_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_pct numeric(5,2);
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT commission_pct INTO emp_pct FROM public.employees WHERE id = NEW.employee_id;
    IF emp_pct IS NULL THEN emp_pct := 0; END IF;
    INSERT INTO public.commissions(booking_id, employee_id, branch_id, service_price, commission_pct, amount)
    VALUES (NEW.id, NEW.employee_id, NEW.branch_id, NEW.price, emp_pct, ROUND(NEW.price * emp_pct / 100.0, 2))
    ON CONFLICT (booking_id) DO UPDATE
      SET service_price = EXCLUDED.service_price,
          commission_pct = EXCLUDED.commission_pct,
          amount = EXCLUDED.amount;
  ELSIF NEW.status IN ('cancelled','no_show') AND OLD.status = 'completed' THEN
    DELETE FROM public.commissions WHERE booking_id = NEW.id AND paid = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_commission ON public.bookings;
CREATE TRIGGER trg_sync_booking_commission
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_booking_commission();