SELECT cron.schedule(
  'cleanup-report-cache',
  '*/15 * * * *',
  $$SELECT public.cleanup_report_cache();$$
);