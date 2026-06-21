CREATE TABLE public.user_2fa (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_2fa TO authenticated;
GRANT ALL ON public.user_2fa TO service_role;
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own 2FA" ON public.user_2fa FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);