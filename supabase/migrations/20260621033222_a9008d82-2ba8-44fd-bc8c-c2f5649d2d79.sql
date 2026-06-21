-- P58: HMAC signing secret per webhook
ALTER TABLE public.webhooks
  ADD COLUMN IF NOT EXISTS secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex');

-- P59: rate-limit request_otp to 5 / 15 minutes per phone
CREATE OR REPLACE FUNCTION public.request_otp(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  n int;
BEGIN
  IF p_phone IS NULL OR length(p_phone) < 6 THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  SELECT count(*) INTO n
    FROM public.otp_codes
   WHERE phone = p_phone
     AND created_at > now() - interval '15 minutes';
  IF n >= 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  v_code := lpad((floor(random()*1000000))::int::text, 6, '0');
  INSERT INTO public.otp_codes(phone, code_hash, expires_at)
  VALUES (p_phone, encode(digest(v_code, 'sha256'),'hex'), now() + interval '5 minutes');
  RETURN v_code;
END $$;