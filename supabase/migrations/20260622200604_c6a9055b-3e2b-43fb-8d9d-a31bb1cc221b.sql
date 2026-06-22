CREATE OR REPLACE FUNCTION public.notification_jobs_health()
RETURNS TABLE(pending bigint, failed bigint, stuck bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*) FILTER (WHERE status = 'pending'),
    count(*) FILTER (WHERE status = 'failed' AND attempts >= 5),
    count(*) FILTER (WHERE status = 'sending' AND updated_at < now() - interval '5 minutes')
  FROM public.notification_jobs;
$$;

REVOKE ALL ON FUNCTION public.notification_jobs_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notification_jobs_health() TO authenticated, service_role;