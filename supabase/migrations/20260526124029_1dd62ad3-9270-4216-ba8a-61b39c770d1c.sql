
-- Files attached to CRM deals
CREATE TABLE public.crm_deal_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_deal_files_deal_id ON public.crm_deal_files(deal_id);

ALTER TABLE public.crm_deal_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read deal files"
  ON public.crm_deal_files FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert deal files"
  ON public.crm_deal_files FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete deal files"
  ON public.crm_deal_files FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-files', 'deal-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated read deal-files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'deal-files');

CREATE POLICY "Authenticated upload deal-files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deal-files');

CREATE POLICY "Authenticated delete deal-files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'deal-files');
