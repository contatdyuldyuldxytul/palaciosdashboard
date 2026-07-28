-- 1) STORAGE: ai-exports uploads devem pertencer ao usuário
DROP POLICY IF EXISTS "Authenticated upload AI exports" ON storage.objects;
CREATE POLICY "ai_exports_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ai-exports' AND owner = auth.uid());
CREATE POLICY "ai_exports_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ai-exports' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'fundador')))
  WITH CHECK (bucket_id = 'ai-exports' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'fundador')));
CREATE POLICY "ai_exports_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ai-exports' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'fundador')));

-- 2) STORAGE: email-inline-images write scoping
DROP POLICY IF EXISTS "auth_insert_inline" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_inline" ON storage.objects;
CREATE POLICY "inline_images_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'email-inline-images' AND owner = auth.uid());
CREATE POLICY "inline_images_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'email-inline-images' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'fundador')))
  WITH CHECK (bucket_id = 'email-inline-images' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'fundador')));
CREATE POLICY "inline_images_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'email-inline-images' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'fundador')));

-- 3) crm_deals: impedir reatribuição/limpeza de owner_user_id por não-fundador
DROP POLICY IF EXISTS "crm_deals_update" ON public.crm_deals;
CREATE POLICY "crm_deals_update" ON public.crm_deals FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'fundador')
    OR owner_user_id = auth.uid()
    OR owner_user_id IS NULL
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'fundador')
    OR owner_user_id = auth.uid()
    OR owner_user_id IS NULL
  );

DROP POLICY IF EXISTS "crm_deals_insert" ON public.crm_deals;
CREATE POLICY "crm_deals_insert" ON public.crm_deals FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'fundador')
    OR owner_user_id IS NULL
    OR owner_user_id = auth.uid()
  );

-- 4) Sequências de e-mail: escopo por dono ou fundador
ALTER TABLE public.email_sequences ALTER COLUMN owner_user_id SET DEFAULT auth.uid();
ALTER TABLE public.email_sequence_enrollments ALTER COLUMN owner_user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "auth all email_sequences" ON public.email_sequences;
CREATE POLICY "email_sequences_owner_all" ON public.email_sequences FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'fundador'))
  WITH CHECK (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'fundador'));

DROP POLICY IF EXISTS "auth all email_sequence_steps" ON public.email_sequence_steps;
CREATE POLICY "email_sequence_steps_owner_all" ON public.email_sequence_steps FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.email_sequences s
    WHERE s.id = email_sequence_steps.sequence_id
      AND (s.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'fundador'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.email_sequences s
    WHERE s.id = email_sequence_steps.sequence_id
      AND (s.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'fundador'))
  ));

DROP POLICY IF EXISTS "auth all email_sequence_enrollments" ON public.email_sequence_enrollments;
CREATE POLICY "email_sequence_enrollments_owner_all" ON public.email_sequence_enrollments FOR ALL TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'fundador')
    OR EXISTS (
      SELECT 1 FROM public.email_sequences s
      WHERE s.id = email_sequence_enrollments.sequence_id AND s.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'fundador')
    OR EXISTS (
      SELECT 1 FROM public.email_sequences s
      WHERE s.id = email_sequence_enrollments.sequence_id AND s.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "auth all email_sequence_drafts" ON public.email_sequence_drafts;
CREATE POLICY "email_sequence_drafts_owner_all" ON public.email_sequence_drafts FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.email_sequence_enrollments e
    LEFT JOIN public.email_sequences s ON s.id = e.sequence_id
    WHERE e.id = email_sequence_drafts.enrollment_id
      AND (e.owner_user_id = auth.uid() OR s.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'fundador'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.email_sequence_enrollments e
    LEFT JOIN public.email_sequences s ON s.id = e.sequence_id
    WHERE e.id = email_sequence_drafts.enrollment_id
      AND (e.owner_user_id = auth.uid() OR s.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'fundador'))
  ));

-- 5) Políticas de gestão do fundador: restringir ao papel authenticated
DROP POLICY IF EXISTS "Fundador can manage fin clientes" ON public.financeiro_clientes;
CREATE POLICY "Fundador can manage fin clientes" ON public.financeiro_clientes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'fundador'))
  WITH CHECK (public.has_role(auth.uid(), 'fundador'));

DROP POLICY IF EXISTS "Fundador can manage relatorios_meta" ON public.relatorios_meta;
CREATE POLICY "Fundador can manage relatorios_meta" ON public.relatorios_meta FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'fundador'))
  WITH CHECK (public.has_role(auth.uid(), 'fundador'));

DROP POLICY IF EXISTS "Fundador can manage scripts" ON public.scripts;
CREATE POLICY "Fundador can manage scripts" ON public.scripts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'fundador'))
  WITH CHECK (public.has_role(auth.uid(), 'fundador'));

DROP POLICY IF EXISTS "Fundador can manage metas" ON public.metas;
CREATE POLICY "Fundador can manage metas" ON public.metas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'fundador'))
  WITH CHECK (public.has_role(auth.uid(), 'fundador'));

DROP POLICY IF EXISTS "Fundador can manage comissoes" ON public.comissoes;
CREATE POLICY "Fundador can manage comissoes" ON public.comissoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'fundador'))
  WITH CHECK (public.has_role(auth.uid(), 'fundador'));

-- 6) Garantir que anon não tenha grants nessas tabelas
REVOKE ALL ON public.financeiro_clientes FROM anon;
REVOKE ALL ON public.relatorios_meta FROM anon;
REVOKE ALL ON public.scripts FROM anon;
REVOKE ALL ON public.metas FROM anon;
REVOKE ALL ON public.comissoes FROM anon;
REVOKE ALL ON public.email_sequences FROM anon;
REVOKE ALL ON public.email_sequence_steps FROM anon;
REVOKE ALL ON public.email_sequence_enrollments FROM anon;
REVOKE ALL ON public.email_sequence_drafts FROM anon;