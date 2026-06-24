
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.service_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  branch_id UUID,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'after' CHECK (kind IN ('before','after','portfolio')),
  caption TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_photos TO authenticated;
GRANT SELECT ON public.service_photos TO anon;
GRANT ALL ON public.service_photos TO service_role;
ALTER TABLE public.service_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage service_photos"
  ON public.service_photos FOR ALL TO authenticated
  USING (tenant_id = ANY(public.current_user_tenants()))
  WITH CHECK (tenant_id = ANY(public.current_user_tenants()));
CREATE POLICY "anon read public service_photos"
  ON public.service_photos FOR SELECT TO anon
  USING (is_public = true);
CREATE INDEX service_photos_service_idx ON public.service_photos(service_id);
CREATE INDEX service_photos_employee_idx ON public.service_photos(employee_id);
CREATE INDEX service_photos_tenant_idx ON public.service_photos(tenant_id);

CREATE TABLE public.customer_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  branch_id UUID,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'after' CHECK (kind IN ('before','after','note')),
  caption TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_photos TO authenticated;
GRANT ALL ON public.customer_photos TO service_role;
ALTER TABLE public.customer_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage customer_photos"
  ON public.customer_photos FOR ALL TO authenticated
  USING (tenant_id = ANY(public.current_user_tenants()))
  WITH CHECK (tenant_id = ANY(public.current_user_tenants()));
CREATE INDEX customer_photos_customer_idx ON public.customer_photos(customer_id);
CREATE INDEX customer_photos_tenant_idx ON public.customer_photos(tenant_id);

CREATE TRIGGER service_photos_updated_at BEFORE UPDATE ON public.service_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER customer_photos_updated_at BEFORE UPDATE ON public.customer_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "gallery tenant read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'gallery' AND (split_part(name, '/', 1))::uuid = ANY(public.current_user_tenants()));
CREATE POLICY "gallery tenant write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery' AND (split_part(name, '/', 1))::uuid = ANY(public.current_user_tenants()));
CREATE POLICY "gallery tenant update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'gallery' AND (split_part(name, '/', 1))::uuid = ANY(public.current_user_tenants()));
CREATE POLICY "gallery tenant delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gallery' AND (split_part(name, '/', 1))::uuid = ANY(public.current_user_tenants()));
