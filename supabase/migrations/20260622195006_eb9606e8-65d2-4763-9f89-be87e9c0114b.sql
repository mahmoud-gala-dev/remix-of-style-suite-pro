CREATE TABLE public.report_cache (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.report_cache TO service_role;

ALTER TABLE public.report_cache ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_report_cache_expires ON public.report_cache (expires_at);

CREATE OR REPLACE FUNCTION public.cleanup_report_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  DELETE FROM public.report_cache WHERE expires_at < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;