
-- Substitui o trigger antigo de fluxos pelo callback do n8n
DROP TRIGGER IF EXISTS daily_activity_resume_flow_trigger ON public.daily_activities;

CREATE OR REPLACE FUNCTION public.daily_activity_n8n_callback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supabase_url text := 'https://zluhkwrcoupmqdhnjjew.supabase.co';
BEGIN
  IF NEW.completed = true
     AND (OLD.completed IS DISTINCT FROM NEW.completed)
     AND NEW.source = 'flow'
     AND NEW.notes IS NOT NULL
     AND NEW.notes LIKE '%callback%' THEN
    PERFORM net.http_post(
      url := _supabase_url || '/functions/v1/flow-task-callback',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('activity_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_activity_n8n_callback_trigger ON public.daily_activities;
CREATE TRIGGER daily_activity_n8n_callback_trigger
  AFTER UPDATE ON public.daily_activities
  FOR EACH ROW EXECUTE FUNCTION public.daily_activity_n8n_callback();
