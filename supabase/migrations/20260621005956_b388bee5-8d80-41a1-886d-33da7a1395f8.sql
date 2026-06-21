
-- 1) app_settings
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable by all" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "settings writable by admin" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

INSERT INTO public.app_settings(key, value) VALUES
  ('booking_otp_required', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2) otp_codes (server-only via SECURITY DEFINER functions)
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otp_codes_phone_idx ON public.otp_codes(phone, expires_at DESC);
GRANT ALL ON public.otp_codes TO service_role;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
-- No policies: only reachable through SECURITY DEFINER functions below.

-- 3) auth_attempts
CREATE TABLE public.auth_attempts (
  id bigserial PRIMARY KEY,
  ip text,
  email text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_attempts_recent_idx ON public.auth_attempts(ip, email, attempted_at DESC);
GRANT ALL ON public.auth_attempts TO service_role;
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- 4) check_rate_limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_ip text, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.auth_attempts
   WHERE attempted_at > now() - interval '15 minutes'
     AND (ip = p_ip OR email = p_email);
  IF n >= 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.auth_attempts(ip, email) VALUES (p_ip, p_email);
END $$;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text) TO anon, authenticated;

-- 5) request_otp — returns plaintext code (SMS hookup pending)
CREATE OR REPLACE FUNCTION public.request_otp(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_code text;
BEGIN
  IF p_phone IS NULL OR length(p_phone) < 6 THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;
  v_code := lpad((floor(random()*1000000))::int::text, 6, '0');
  INSERT INTO public.otp_codes(phone, code_hash, expires_at)
  VALUES (p_phone, encode(digest(v_code, 'sha256'),'hex'), now() + interval '5 minutes');
  RETURN v_code;
END $$;
GRANT EXECUTE ON FUNCTION public.request_otp(text) TO anon, authenticated;

-- 6) verify_otp
CREATE OR REPLACE FUNCTION public.verify_otp(p_phone text, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.otp_codes
   WHERE phone = p_phone
     AND code_hash = encode(digest(p_code, 'sha256'),'hex')
     AND used = false
     AND expires_at > now()
   ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NULL THEN RETURN false; END IF;
  UPDATE public.otp_codes SET used = true WHERE id = v_id;
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.verify_otp(text, text) TO anon, authenticated;
