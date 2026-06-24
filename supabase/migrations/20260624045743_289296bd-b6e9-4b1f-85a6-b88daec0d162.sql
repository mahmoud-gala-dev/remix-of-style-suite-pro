CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  prefix text NOT NULL UNIQUE,
  key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['read']::text[],
  rate_limit_per_min integer NOT NULL DEFAULT 60,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS api_keys_tenant_idx ON public.api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON public.api_keys(prefix);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_tenant_admin_select" ON public.api_keys FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.current_user_tenants()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "api_keys_tenant_admin_insert" ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY(public.current_user_tenants()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "api_keys_tenant_admin_update" ON public.api_keys FOR UPDATE TO authenticated
  USING (tenant_id = ANY(public.current_user_tenants()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "api_keys_tenant_admin_delete" ON public.api_keys FOR DELETE TO authenticated
  USING (tenant_id = ANY(public.current_user_tenants()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));