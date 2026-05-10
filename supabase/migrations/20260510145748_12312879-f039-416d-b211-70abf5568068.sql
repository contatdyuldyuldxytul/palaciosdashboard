-- Drop existing overloads
DROP FUNCTION IF EXISTS public.insert_strategic_input(uuid, text, text, integer, strategic_input_source, bigint);
DROP FUNCTION IF EXISTS public.insert_strategic_input(text, uuid, text, integer, text, bigint);
DROP FUNCTION IF EXISTS public.import_monthly_strategy(jsonb);
DROP FUNCTION IF EXISTS public.import_monthly_strategy(text, jsonb);

-- insert_strategic_input with API key auth
CREATE OR REPLACE FUNCTION public.insert_strategic_input(
  api_key text,
  target_user_id uuid,
  task_description text,
  priority int,
  source_type text,
  related_deal_id bigint DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected_key text;
  new_id uuid;
BEGIN
  SELECT decrypted_secret INTO expected_key
  FROM vault.decrypted_secrets WHERE name = 'STRATEGY_API_KEY';

  IF expected_key IS NULL OR api_key != expected_key THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.strategic_inputs (
    target_user_id, task_description, priority, source_type,
    related_deal_id, processed
  ) VALUES (
    target_user_id, task_description, COALESCE(priority,5),
    COALESCE(source_type,'custom')::strategic_input_source,
    related_deal_id, false
  ) RETURNING id INTO new_id;

  RETURN jsonb_build_object('success', true, 'id', new_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_strategic_input(text, uuid, text, int, text, bigint) TO anon, authenticated;

-- import_monthly_strategy with API key auth
CREATE OR REPLACE FUNCTION public.import_monthly_strategy(
  api_key text,
  payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected_key text;
  _month DATE;
  _strategy_id UUID;
  _campaign JSONB;
  _campaign_id UUID;
  _lead JSONB;
  _strategy JSONB;
  _campaigns_created INTEGER := 0;
  _leads_created INTEGER := 0;
BEGIN
  SELECT decrypted_secret INTO expected_key
  FROM vault.decrypted_secrets WHERE name = 'STRATEGY_API_KEY';

  IF expected_key IS NULL OR api_key != expected_key THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  _month := (payload->>'month' || '-01')::DATE;
  _strategy := payload->'monthly_strategy';

  INSERT INTO public.monthly_strategies (month, cash_target, operational_minimum, key_priorities, strategic_focus, allocation, source, session_notes)
  VALUES (
    _month,
    COALESCE((_strategy->>'cash_target')::NUMERIC, 0),
    COALESCE((_strategy->>'operational_minimum')::NUMERIC, 0),
    COALESCE(_strategy->'key_priorities', '[]'::jsonb),
    _strategy->>'strategic_focus',
    COALESCE(_strategy->'allocation', '{}'::jsonb),
    'claude_session',
    _strategy->>'session_notes'
  )
  ON CONFLICT (month) DO UPDATE SET
    cash_target = EXCLUDED.cash_target,
    operational_minimum = EXCLUDED.operational_minimum,
    key_priorities = EXCLUDED.key_priorities,
    strategic_focus = EXCLUDED.strategic_focus,
    allocation = EXCLUDED.allocation,
    session_notes = EXCLUDED.session_notes
  RETURNING id INTO _strategy_id;

  FOR _campaign IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'campaigns', '[]'::jsonb))
  LOOP
    INSERT INTO public.campaigns (
      monthly_strategy_id, name, description, owner_user_id, start_date, end_date,
      playbook_type, target_description, kpis, custom_templates
    )
    VALUES (
      _strategy_id,
      _campaign->>'name',
      _campaign->>'description',
      NULLIF(_campaign->>'owner_user_id','')::BIGINT,
      NULLIF(_campaign->>'start_date','')::DATE,
      NULLIF(_campaign->>'end_date','')::DATE,
      COALESCE((_campaign->>'playbook_type')::campaign_playbook, 'cadence_2_0'),
      _campaign->>'target_description',
      COALESCE(_campaign->'kpis', '{}'::jsonb),
      COALESCE(_campaign->'custom_templates', '{}'::jsonb)
    )
    ON CONFLICT (monthly_strategy_id, name) DO UPDATE SET
      description = EXCLUDED.description,
      owner_user_id = EXCLUDED.owner_user_id,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      playbook_type = EXCLUDED.playbook_type,
      target_description = EXCLUDED.target_description,
      kpis = EXCLUDED.kpis,
      custom_templates = EXCLUDED.custom_templates,
      updated_at = now()
    RETURNING id INTO _campaign_id;

    _campaigns_created := _campaigns_created + 1;

    FOR _lead IN SELECT * FROM jsonb_array_elements(COALESCE(_campaign->'leads', '[]'::jsonb))
    LOOP
      INSERT INTO public.campaign_leads (
        campaign_id, pipedrive_deal_id, lead_name, lead_company, group_label
      )
      VALUES (
        _campaign_id,
        NULLIF(_lead->>'pipedrive_deal_id','')::BIGINT,
        _lead->>'lead_name',
        _lead->>'lead_company',
        _lead->>'group'
      )
      ON CONFLICT (campaign_id, pipedrive_deal_id) DO UPDATE SET
        lead_name = EXCLUDED.lead_name,
        lead_company = EXCLUDED.lead_company,
        group_label = EXCLUDED.group_label;
      _leads_created := _leads_created + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'strategy_id', _strategy_id, 'campaigns', _campaigns_created, 'leads', _leads_created);
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_monthly_strategy(text, jsonb) TO anon, authenticated;

-- Ensure STRATEGY_API_KEY exists in Vault (no-op if already present)
DO $$
DECLARE
  existing text;
BEGIN
  SELECT decrypted_secret INTO existing FROM vault.decrypted_secrets WHERE name = 'STRATEGY_API_KEY';
  IF existing IS NULL THEN
    PERFORM vault.create_secret(
      coalesce(current_setting('app.strategy_api_key', true), 'PLEASE_SET_VIA_UPDATE'),
      'STRATEGY_API_KEY',
      'API key for external strategy imports'
    );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';