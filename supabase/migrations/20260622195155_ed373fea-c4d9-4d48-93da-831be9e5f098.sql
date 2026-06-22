CREATE TABLE public.notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  run_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.notification_jobs TO service_role;

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notification_jobs_runnable
  ON public.notification_jobs (status, run_at)
  WHERE status IN ('pending', 'failed');

CREATE TRIGGER trg_notification_jobs_updated_at
  BEFORE UPDATE ON public.notification_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();