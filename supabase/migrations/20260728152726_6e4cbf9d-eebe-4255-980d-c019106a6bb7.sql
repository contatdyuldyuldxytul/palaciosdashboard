
-- 1. crm_deal_files: ownership checks
DROP POLICY IF EXISTS "Authenticated can insert deal files" ON public.crm_deal_files;
DROP POLICY IF EXISTS "Authenticated can delete deal files" ON public.crm_deal_files;

CREATE POLICY "deal_files_insert_owner" ON public.crm_deal_files
FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.crm_deals d
    WHERE d.id = crm_deal_files.deal_id
      AND (d.owner_user_id = auth.uid() OR d.owner_user_id IS NULL OR public.has_role(auth.uid(), 'fundador'))
  )
);

CREATE POLICY "deal_files_delete_owner" ON public.crm_deal_files
FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.has_role(auth.uid(), 'fundador')
  OR EXISTS (
    SELECT 1 FROM public.crm_deals d
    WHERE d.id = crm_deal_files.deal_id AND d.owner_user_id = auth.uid()
  )
);

-- 2. custom_activities: scope writes
DROP POLICY IF EXISTS "Authenticated can manage custom_activities" ON public.custom_activities;

CREATE POLICY "custom_activities_insert" ON public.custom_activities
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'fundador')
  OR responsavel = public.get_my_colaborador_slug()
);

CREATE POLICY "custom_activities_update" ON public.custom_activities
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'fundador')
  OR responsavel = public.get_my_colaborador_slug()
)
WITH CHECK (
  public.has_role(auth.uid(), 'fundador')
  OR responsavel = public.get_my_colaborador_slug()
);

CREATE POLICY "custom_activities_delete" ON public.custom_activities
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'fundador')
  OR responsavel = public.get_my_colaborador_slug()
);

-- 3. email_campaign_recipients: owner-scoped writes
CREATE POLICY "owner_insert_recipients" ON public.email_campaign_recipients
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.email_campaigns c
  WHERE c.id = email_campaign_recipients.campaign_id AND c.criado_por = auth.uid()
));

CREATE POLICY "owner_update_recipients" ON public.email_campaign_recipients
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.email_campaigns c
  WHERE c.id = email_campaign_recipients.campaign_id AND c.criado_por = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.email_campaigns c
  WHERE c.id = email_campaign_recipients.campaign_id AND c.criado_por = auth.uid()
));

CREATE POLICY "owner_delete_recipients" ON public.email_campaign_recipients
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.email_campaigns c
  WHERE c.id = email_campaign_recipients.campaign_id AND c.criado_por = auth.uid()
));

-- 4. email_unsubscribe_tokens: no public read/update; server-side only
DROP POLICY IF EXISTS "anyone_unsub_select" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "anyone_unsub_update" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "anyone_unsub_insert" ON public.email_unsubscribe_tokens;
REVOKE ALL ON public.email_unsubscribe_tokens FROM anon, authenticated;
GRANT ALL ON public.email_unsubscribe_tokens TO service_role;

CREATE POLICY "fundador_manage_unsub_tokens" ON public.email_unsubscribe_tokens
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'fundador'))
WITH CHECK (public.has_role(auth.uid(), 'fundador'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_unsubscribe_tokens TO authenticated;

-- 5. financeiro_empresa: restrict policy role to authenticated
DROP POLICY IF EXISTS "Fundador can manage fin empresa" ON public.financeiro_empresa;
CREATE POLICY "Fundador can manage fin empresa" ON public.financeiro_empresa
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'fundador'))
WITH CHECK (public.has_role(auth.uid(), 'fundador'));

-- 6. flows / flow_runs: only fundador can write
DROP POLICY IF EXISTS "flows_manage" ON public.flows;
CREATE POLICY "flows_manage" ON public.flows
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'fundador'))
WITH CHECK (public.has_role(auth.uid(), 'fundador'));

DROP POLICY IF EXISTS "flow_runs_manage" ON public.flow_runs;

-- 7. leads: owner-scoped access
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;

CREATE POLICY "leads_select_owner" ON public.leads
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'fundador')
  OR responsavel_id = auth.uid()
  OR created_by = auth.uid()
  OR responsavel_id IS NULL
);

CREATE POLICY "leads_insert_owner" ON public.leads
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'fundador')
  OR responsavel_id = auth.uid()
  OR responsavel_id IS NULL
);

CREATE POLICY "leads_update_owner" ON public.leads
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'fundador')
  OR responsavel_id = auth.uid()
  OR created_by = auth.uid()
  OR responsavel_id IS NULL
)
WITH CHECK (
  public.has_role(auth.uid(), 'fundador')
  OR responsavel_id = auth.uid()
  OR responsavel_id IS NULL
);

-- 8. storage: deal-files ownership
DROP POLICY IF EXISTS "Authenticated read deal-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload deal-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete deal-files" ON storage.objects;

CREATE POLICY "deal_files_storage_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'deal-files'
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'fundador')
    OR EXISTS (
      SELECT 1 FROM public.crm_deal_files f
      JOIN public.crm_deals d ON d.id = f.deal_id
      WHERE f.storage_path = storage.objects.name
        AND (d.owner_user_id = auth.uid() OR f.uploaded_by = auth.uid())
    )
  )
);

CREATE POLICY "deal_files_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'deal-files' AND owner = auth.uid());

CREATE POLICY "deal_files_storage_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'deal-files'
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'fundador')
    OR EXISTS (
      SELECT 1 FROM public.crm_deal_files f
      JOIN public.crm_deals d ON d.id = f.deal_id
      WHERE f.storage_path = storage.objects.name AND d.owner_user_id = auth.uid()
    )
  )
);

-- 9. storage: email-attachments ownership
DROP POLICY IF EXISTS "auth_read_attachments" ON storage.objects;
DROP POLICY IF EXISTS "auth_insert_attachments" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_attachments" ON storage.objects;

CREATE POLICY "email_attachments_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'email-attachments'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'fundador'))
);

CREATE POLICY "email_attachments_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'email-attachments' AND owner = auth.uid());

CREATE POLICY "email_attachments_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'email-attachments'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'fundador'))
);
