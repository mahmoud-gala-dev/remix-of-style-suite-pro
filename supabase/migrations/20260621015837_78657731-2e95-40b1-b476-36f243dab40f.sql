SELECT cron.schedule(
  'cleanup-webhook-deliveries-daily',
  '0 3 * * *',
  $$ DELETE FROM public.webhook_deliveries WHERE created_at < now() - interval '30 days'; $$
);