import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export interface FlowActivity {
  key: string;
  deal_id: string;
  deal_titulo: string;
  deal_valor: number;
  pipeline_id: string;
  pipeline_nome: string;
  flow_id: string;
  node_id: string;
  node_kind: string;
  node_label: string;
  node_description?: string;
  dia_offset: number;
  due_date: string;
  days_until: number;
  owner_user_id: string | null;
  owner_label: string | null;
  concluido: boolean;
  completion_id?: string;
}

const KINDS_WITH_TASKS = new Set(["task", "email", "whatsapp", "custom", "milestone", "webhook"]);

function toLocalDateISO(d: Date) {
  // Strict São Paulo (UTC-3)
  const sp = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return sp.toISOString().slice(0, 10);
}
function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
function daysDiff(fromISO: string, toISO: string) {
  const f = new Date(fromISO + "T00:00:00Z").getTime();
  const t = new Date(toISO + "T00:00:00Z").getTime();
  return Math.round((t - f) / 86400000);
}

export function useFlowActivities(opts: { owner_label?: string | null }) {
  const today = toLocalDateISO(new Date());

  const query = useQuery({
    queryKey: ["flow_activities", opts.owner_label || "__all__"],
    queryFn: async () => {
      const { data: pipelines, error: pErr } = await supabase
        .from("crm_pipelines")
        .select("id, nome, flow_id, owner_label")
        .eq("ativo", true)
        .not("flow_id", "is", null);
      if (pErr) throw pErr;
      const flowIds = Array.from(new Set((pipelines || []).map((p: any) => p.flow_id).filter(Boolean)));
      if (flowIds.length === 0) return [] as FlowActivity[];

      const { data: flows, error: fErr } = await supabase
        .from("flows" as any)
        .select("id, nodes")
        .in("id", flowIds);
      if (fErr) throw fErr;
      const flowById = new Map<string, any>((flows || []).map((f: any) => [f.id, f]));

      const pipelineIds = (pipelines || []).map((p: any) => p.id);
      let dealsQuery = supabase
        .from("crm_deals")
        .select("id, titulo, valor, pipeline_id, owner_user_id, owner_label, flow_started_at, status")
        .in("pipeline_id", pipelineIds)
        .eq("status", "open");
      if (opts.owner_label) dealsQuery = dealsQuery.eq("owner_label", opts.owner_label);
      const { data: deals, error: dErr } = await dealsQuery;
      if (dErr) throw dErr;

      const dealIds = (deals || []).map((d: any) => d.id);
      let completions: any[] = [];
      if (dealIds.length > 0) {
        const { data: c, error: cErr } = await supabase
          .from("flow_task_completions" as any)
          .select("id, deal_id, flow_id, node_id")
          .in("deal_id", dealIds);
        if (cErr) throw cErr;
        completions = c || [];
      }
      const ck = (deal: string, flow: string, node: string) => `${deal}|${flow}|${node}`;
      const completionMap = new Map<string, string>(
        completions.map((c) => [ck(c.deal_id, c.flow_id, c.node_id), c.id]),
      );

      const items: FlowActivity[] = [];
      for (const deal of deals || []) {
        const pipeline = pipelines!.find((p: any) => p.id === deal.pipeline_id);
        if (!pipeline?.flow_id) continue;
        const flow = flowById.get(pipeline.flow_id);
        if (!flow) continue;
        const startedAt = deal.flow_started_at ? toLocalDateISO(new Date(deal.flow_started_at)) : today;
        const nodes: any[] = Array.isArray(flow.nodes) ? flow.nodes : [];
        for (const n of nodes) {
          const kind = n?.data?.kind;
          const offset = Number(n?.data?.config?.dia_offset);
          if (!KINDS_WITH_TASKS.has(kind)) continue;
          if (!Number.isFinite(offset)) continue;
          const dueDate = addDays(startedAt, offset);
          const compId = completionMap.get(ck(deal.id, flow.id, n.id));
          items.push({
            key: `${deal.id}|${n.id}`,
            deal_id: deal.id,
            deal_titulo: deal.titulo,
            deal_valor: Number(deal.valor || 0),
            pipeline_id: pipeline.id,
            pipeline_nome: pipeline.nome,
            flow_id: flow.id,
            node_id: n.id,
            node_kind: kind,
            node_label: n?.data?.label || kind,
            node_description: n?.data?.config?.description,
            dia_offset: offset,
            due_date: dueDate,
            days_until: daysDiff(today, dueDate),
            owner_user_id: deal.owner_user_id,
            owner_label: deal.owner_label,
            concluido: !!compId,
            completion_id: compId,
          });
        }
      }
      items.sort((a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : a.dia_offset - b.dia_offset));
      return items;
    },
    staleTime: 60_000,
  });

  const grouped = useMemo(() => {
    const items = query.data || [];
    const buckets: Record<"atrasadas" | "hoje" | "amanha" | "proximos", FlowActivity[]> = {
      atrasadas: [], hoje: [], amanha: [], proximos: [],
    };
    for (const it of items) {
      if (it.concluido) continue;
      if (it.days_until < 0) buckets.atrasadas.push(it);
      else if (it.days_until === 0) buckets.hoje.push(it);
      else if (it.days_until === 1) buckets.amanha.push(it);
      else buckets.proximos.push(it);
    }
    return buckets;
  }, [query.data]);

  return { ...query, grouped };
}

export function useToggleFlowTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: FlowActivity) => {
      if (item.concluido && item.completion_id) {
        const { error } = await supabase
          .from("flow_task_completions" as any)
          .delete()
          .eq("id", item.completion_id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.from("flow_task_completions" as any).insert({
          deal_id: item.deal_id,
          flow_id: item.flow_id,
          node_id: item.node_id,
          completed_by: userData?.user?.id ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flow_activities"] }),
  });
}

export function useDealFlowProgress(deal: { id: string; pipeline_id: string; flow_started_at?: string | null }) {
  return useQuery({
    queryKey: ["deal_flow_progress", deal.id, deal.pipeline_id, deal.flow_started_at],
    queryFn: async () => {
      const { data: pipe } = await supabase
        .from("crm_pipelines")
        .select("flow_id")
        .eq("id", deal.pipeline_id)
        .maybeSingle();
      if (!(pipe as any)?.flow_id) return null;
      const { data: flow } = await supabase
        .from("flows" as any)
        .select("nodes")
        .eq("id", (pipe as any).flow_id)
        .maybeSingle();
      const nodes: any[] = Array.isArray((flow as any)?.nodes) ? (flow as any).nodes : [];
      const offsets = nodes
        .map((n) => Number(n?.data?.config?.dia_offset))
        .filter((o) => Number.isFinite(o));
      if (offsets.length === 0) return null;
      const max = Math.max(...offsets);
      const today = toLocalDateISO(new Date());
      const started = deal.flow_started_at ? toLocalDateISO(new Date(deal.flow_started_at)) : today;
      const dayInFlow = daysDiff(started, today) + 1;
      return { dayInFlow, totalDays: max + 1 };
    },
    enabled: !!deal.id && !!deal.pipeline_id,
    staleTime: 5 * 60_000,
  });
}
