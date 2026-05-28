ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS deleted_in_pipedrive boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS email_messages_gmail_msg_uniq ON public.email_messages(gmail_message_id);

CREATE UNIQUE INDEX IF NOT EXISTS crm_deal_history_pd_change_uniq
  ON public.crm_deal_history(deal_id, evento, ((payload->>'time')), ((payload->>'field')))
  WHERE evento = 'pipedrive_change';