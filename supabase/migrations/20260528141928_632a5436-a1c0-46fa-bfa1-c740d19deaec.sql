DROP INDEX IF EXISTS public.crm_stages_pipedrive_stage_id_key;
CREATE UNIQUE INDEX crm_stages_pipedrive_stage_id_key
  ON public.crm_stages(pipedrive_stage_id);