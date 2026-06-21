CREATE INDEX IF NOT EXISTS idx_audit_log_at ON public.audit_log (at);

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-audit-log-daily') THEN
    PERFORM cron.unschedule('prune-audit-log-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'prune-audit-log-daily',
  '0 3 * * *',
  $$DELETE FROM public.audit_log WHERE at < (now() - interval '180 days');$$
);