CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key text PRIMARY KEY,
  tokens double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.rate_limit_buckets TO service_role;

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_buckets_no_access" ON public.rate_limit_buckets
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.check_token_bucket(
  p_key text,
  p_capacity double precision,
  p_refill_per_min double precision
) RETURNS double precision
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now timestamptz := now();
  v_tokens double precision;
  v_updated timestamptz;
  v_elapsed_ms double precision;
  v_refill_per_ms double precision := p_refill_per_min / 60000.0;
  v_retry_after double precision;
BEGIN
  INSERT INTO public.rate_limit_buckets(key, tokens, updated_at)
  VALUES (p_key, p_capacity, v_now)
  ON CONFLICT (key) DO NOTHING;

  SELECT tokens, updated_at INTO v_tokens, v_updated
    FROM public.rate_limit_buckets WHERE key = p_key FOR UPDATE;

  v_elapsed_ms := EXTRACT(EPOCH FROM (v_now - v_updated)) * 1000.0;
  v_tokens := LEAST(p_capacity, v_tokens + v_elapsed_ms * v_refill_per_ms);

  IF v_tokens < 1 THEN
    v_retry_after := CEIL((1 - v_tokens) / v_refill_per_ms / 1000.0);
    RAISE EXCEPTION 'rate_limited:%', v_retry_after USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.rate_limit_buckets
     SET tokens = v_tokens - 1, updated_at = v_now
   WHERE key = p_key;

  RETURN v_tokens - 1;
END;
$$;

-- Cleanup old buckets (>24h idle) — wired into existing audit-archive cron later if desired.
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_buckets()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer;
BEGIN
  DELETE FROM public.rate_limit_buckets WHERE updated_at < now() - interval '24 hours';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;