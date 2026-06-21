
CREATE OR REPLACE FUNCTION public.current_user_tenants()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'super_admin') THEN
      (SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) FROM public.tenants)
    ELSE
      (SELECT COALESCE(array_agg(DISTINCT b.tenant_id), ARRAY[]::uuid[])
         FROM public.user_branches ub
         JOIN public.branches b ON b.id = ub.branch_id
        WHERE ub.user_id = auth.uid() AND b.tenant_id IS NOT NULL)
  END;
$$;

-- customers
DROP POLICY IF EXISTS "staff manage customers" ON public.customers;
CREATE POLICY "staff manage customers" ON public.customers
  FOR ALL TO authenticated
  USING (
    has_any_staff_role(auth.uid())
    AND user_has_branch(auth.uid(), branch_id)
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  )
  WITH CHECK (
    has_any_staff_role(auth.uid())
    AND user_has_branch(auth.uid(), branch_id)
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  );

-- bookings
DROP POLICY IF EXISTS "staff manage bookings" ON public.bookings;
CREATE POLICY "staff manage bookings" ON public.bookings
  FOR ALL TO authenticated
  USING (
    has_any_staff_role(auth.uid())
    AND user_has_branch(auth.uid(), branch_id)
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  )
  WITH CHECK (
    has_any_staff_role(auth.uid())
    AND user_has_branch(auth.uid(), branch_id)
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  );

-- queue_items
DROP POLICY IF EXISTS "staff manage queue" ON public.queue_items;
CREATE POLICY "staff manage queue" ON public.queue_items
  FOR ALL TO authenticated
  USING (
    has_any_staff_role(auth.uid())
    AND user_has_branch(auth.uid(), branch_id)
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  )
  WITH CHECK (
    has_any_staff_role(auth.uid())
    AND user_has_branch(auth.uid(), branch_id)
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  );

-- invoices
DROP POLICY IF EXISTS "Staff manage invoices" ON public.invoices;
CREATE POLICY "Staff manage invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (
    has_any_staff_role(auth.uid())
    AND user_has_branch(auth.uid(), branch_id)
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  )
  WITH CHECK (
    has_any_staff_role(auth.uid())
    AND user_has_branch(auth.uid(), branch_id)
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  );

-- employees: staff view + admin manage, both tenant-scoped via branch
DROP POLICY IF EXISTS "staff view employees" ON public.employees;
CREATE POLICY "staff view employees" ON public.employees
  FOR SELECT TO authenticated
  USING (
    has_any_staff_role(auth.uid())
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  );

DROP POLICY IF EXISTS "admin manage employees" ON public.employees;
CREATE POLICY "admin manage employees" ON public.employees
  FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  )
  WITH CHECK (
    (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  );

-- services: same
DROP POLICY IF EXISTS "staff view services" ON public.services;
CREATE POLICY "staff view services" ON public.services
  FOR SELECT TO authenticated
  USING (
    has_any_staff_role(auth.uid())
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  );

DROP POLICY IF EXISTS "admin manage services" ON public.services;
CREATE POLICY "admin manage services" ON public.services
  FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  )
  WITH CHECK (
    (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
    AND branch_id IN (SELECT id FROM public.branches WHERE tenant_id = ANY(public.current_user_tenants()))
  );
