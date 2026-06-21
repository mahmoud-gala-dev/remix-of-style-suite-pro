
CREATE INDEX IF NOT EXISTS idx_bookings_customer_start ON public.bookings (customer_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_branch_created ON public.invoices (branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_at ON public.audit_log (actor, at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_items_customer ON public.queue_items (customer_id);

CREATE TABLE IF NOT EXISTS public.audit_log_archive (LIKE public.audit_log INCLUDING ALL);
GRANT SELECT ON public.audit_log_archive TO authenticated;
GRANT ALL ON public.audit_log_archive TO service_role;
ALTER TABLE public.audit_log_archive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read archive" ON public.audit_log_archive;
CREATE POLICY "Admins read archive" ON public.audit_log_archive FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.archive_old_audit_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE moved integer;
BEGIN
  WITH old AS (
    DELETE FROM public.audit_log WHERE at < now() - INTERVAL '365 days' RETURNING *
  )
  INSERT INTO public.audit_log_archive SELECT * FROM old;
  GET DIAGNOSTICS moved = ROW_COUNT;
  RETURN moved;
END;
$$;

CREATE OR REPLACE VIEW public.webhook_deliveries_dlq AS
  SELECT * FROM public.webhook_deliveries WHERE failed = true;
GRANT SELECT ON public.webhook_deliveries_dlq TO authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
