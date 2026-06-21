
-- P28: Materialized view for daily revenue reports
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_daily_revenue AS
SELECT
  date_trunc('day', i.created_at)::date AS day,
  i.branch_id,
  COUNT(*)::bigint AS invoice_count,
  COALESCE(SUM(i.total), 0)::numeric AS total_revenue,
  COALESCE(SUM(i.tax), 0)::numeric AS total_tax,
  COALESCE(SUM(i.discount), 0)::numeric AS total_discount
FROM public.invoices i
WHERE i.status = 'paid'
GROUP BY 1, 2;

CREATE UNIQUE INDEX IF NOT EXISTS mv_daily_revenue_pk
  ON public.mv_daily_revenue(day, branch_id);

GRANT SELECT ON public.mv_daily_revenue TO authenticated;
GRANT ALL ON public.mv_daily_revenue TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_mv_daily_revenue()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_daily_revenue;
$$;

-- Schedule hourly refresh
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'refresh-mv-daily-revenue',
  '0 * * * *',
  $$ SELECT public.refresh_mv_daily_revenue(); $$
);
