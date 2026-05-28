CREATE UNIQUE INDEX IF NOT EXISTS crm_stages_pipedrive_stage_id_key
  ON public.crm_stages(pipedrive_stage_id)
  WHERE pipedrive_stage_id IS NOT NULL;