REVOKE EXECUTE ON FUNCTION public.refresh_mv_daily_revenue() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'refresh-mv-daily-revenue',
  '*/10 * * * *',
  $$SELECT public.refresh_mv_daily_revenue();$$
);