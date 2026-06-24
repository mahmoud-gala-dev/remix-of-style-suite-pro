
-- suppliers
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage branch suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR
    EXISTS (SELECT 1 FROM user_branches ub WHERE ub.user_id = auth.uid() AND ub.branch_id = suppliers.branch_id)
  )
  WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR
    EXISTS (SELECT 1 FROM user_branches ub WHERE ub.user_id = auth.uid() AND ub.branch_id = suppliers.branch_id)
  );
CREATE INDEX suppliers_branch_idx ON public.suppliers(branch_id);
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- product enrichment
ALTER TABLE public.products
  ADD COLUMN reorder_point NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN reorder_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN last_auto_po_at TIMESTAMPTZ;

-- purchase_orders
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','received','cancelled')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','auto')),
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage branch POs" ON public.purchase_orders FOR ALL TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR
    EXISTS (SELECT 1 FROM user_branches ub WHERE ub.user_id = auth.uid() AND ub.branch_id = purchase_orders.branch_id)
  )
  WITH CHECK (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR
    EXISTS (SELECT 1 FROM user_branches ub WHERE ub.user_id = auth.uid() AND ub.branch_id = purchase_orders.branch_id)
  );
CREATE INDEX po_branch_idx ON public.purchase_orders(branch_id);
CREATE INDEX po_supplier_idx ON public.purchase_orders(supplier_id);
CREATE TRIGGER po_updated_at BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- purchase_order_items
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  qty NUMERIC(12,2) NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage branch PO items" ON public.purchase_order_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_items.po_id
        AND (
          has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR
          EXISTS (SELECT 1 FROM user_branches ub WHERE ub.user_id = auth.uid() AND ub.branch_id = po.branch_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_items.po_id
        AND (
          has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role) OR
          EXISTS (SELECT 1 FROM user_branches ub WHERE ub.user_id = auth.uid() AND ub.branch_id = po.branch_id)
        )
    )
  );
CREATE INDEX po_items_po_idx ON public.purchase_order_items(po_id);
