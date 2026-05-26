
CREATE OR REPLACE FUNCTION public.crm_deal_enroll_flows()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _flow RECORD;
  _trigger_node_id text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stage_id IS NOT DISTINCT FROM OLD.stage_id THEN
    RETURN NEW;
  END IF;

  FOR _flow IN
    SELECT id, nodes, trigger_config
    FROM public.flows
    WHERE ativo = true
      AND (trigger_config->>'type') = 'crm_stage_enter'
      AND (trigger_config->>'stage_id')::uuid = NEW.stage_id
  LOOP
    SELECT (n->>'id') INTO _trigger_node_id
    FROM jsonb_array_elements(_flow.nodes) AS n
    WHERE (n->'data'->>'kind') = 'trigger'
    LIMIT 1;

    INSERT INTO public.flow_runs (flow_id, crm_deal_id, status, resume_at, current_node_id, context)
    VALUES (_flow.id, NEW.id, 'pending', now(), _trigger_node_id,
            jsonb_build_object('deal_id', NEW.id, 'stage_id', NEW.stage_id));
  END LOOP;
  RETURN NEW;
END;
$fn$;
