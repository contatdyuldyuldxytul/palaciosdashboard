DROP POLICY IF EXISTS "flows_manage" ON public.flows;
CREATE POLICY "flows_manage" ON public.flows
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "flow_runs_manage" ON public.flow_runs;
CREATE POLICY "flow_runs_manage" ON public.flow_runs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);