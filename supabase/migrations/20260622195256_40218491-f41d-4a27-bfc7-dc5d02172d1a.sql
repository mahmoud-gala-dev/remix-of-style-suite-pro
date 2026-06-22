SELECT cron.schedule(
  'drain-notifications',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--cmdlnlojvcyzqvyawkcv.lovable.app/api/public/cron/drain-notifications',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);