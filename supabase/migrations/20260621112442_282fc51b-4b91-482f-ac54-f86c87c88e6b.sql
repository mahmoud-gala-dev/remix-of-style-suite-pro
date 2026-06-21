REVOKE EXECUTE ON FUNCTION public.check_token_bucket(text, double precision, double precision) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limit_buckets() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_token_bucket(text, double precision, double precision) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_buckets() TO service_role;