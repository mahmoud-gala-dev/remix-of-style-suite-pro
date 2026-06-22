
CREATE TABLE public.web_vitals_samples (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  rating TEXT,
  route TEXT,
  ip TEXT
);
CREATE INDEX idx_web_vitals_at ON public.web_vitals_samples (at DESC);
CREATE INDEX idx_web_vitals_name_at ON public.web_vitals_samples (name, at DESC);
GRANT INSERT ON public.web_vitals_samples TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.web_vitals_samples_id_seq TO anon, authenticated;
GRANT ALL ON public.web_vitals_samples TO service_role;
GRANT ALL ON SEQUENCE public.web_vitals_samples_id_seq TO service_role;
ALTER TABLE public.web_vitals_samples ENABLE ROW LEVEL SECURITY;
-- Anyone may write a beacon (the public route does this); reads are admin-only via service_role.
CREATE POLICY "anyone can insert vital sample" ON public.web_vitals_samples FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read samples" ON public.web_vitals_samples FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.web_vitals_p75(p_window_minutes INT DEFAULT 15)
RETURNS TABLE(name TEXT, p75 DOUBLE PRECISION, samples BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name,
         percentile_cont(0.75) WITHIN GROUP (ORDER BY value) AS p75,
         count(*)::bigint AS samples
  FROM public.web_vitals_samples
  WHERE at > now() - make_interval(mins => p_window_minutes)
  GROUP BY name;
$$;

REVOKE ALL ON FUNCTION public.web_vitals_p75(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.web_vitals_p75(int) TO service_role, authenticated;
