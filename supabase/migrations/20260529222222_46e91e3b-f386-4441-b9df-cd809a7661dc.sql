
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove job antigo se existir
DO $$ BEGIN
  PERFORM cron.unschedule('campaign-scheduler-5min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'campaign-scheduler-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zluhkwrcoupmqdhnjjew.supabase.co/functions/v1/campaign-scheduler',
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  $$
);
