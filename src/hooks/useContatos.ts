import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ContatoStatus = "cliente_ativo" | "ex_cliente" | "lead" | "frio";

export interface Contato {
  id: string;
  nome: string;
  empresa: string | null;
  cargo: string | null;
  telefone: string | null;
  email: string | null;
  status: ContatoStatus;
  organization_id: string | null;
  cliente_id?: string | null;
  deals_count: number;
  open_deals: number;
  won_deals: number;
}

export function useContatos() {
  return useQuery({
    queryKey: ["contatos", "unified"],
    queryFn: async (): Promise<Contato[]> => {
      const [personsRes, orgsRes, dealsRes, clientesRes] = await Promise.all([
        supabase.from("crm_persons").select("id, nome, cargo, email, telefone, organization_id"),
        supabase.from("crm_organizations").select("id, nome"),
        supabase.from("crm_deals").select("id, person_id, status"),
        supabase.from("clientes_ativos").select("id, empresa, contato, email, telefone, status"),
      ]);

      if (personsRes.error) throw personsRes.error;
      if (orgsRes.error) throw orgsRes.error;
      if (dealsRes.error) throw dealsRes.error;
      if (clientesRes.error) throw clientesRes.error;

      const orgMap = new Map((orgsRes.data || []).map((o: any) => [o.id, o.nome]));
      const dealsByPerson = new Map<string, { open: number; won: number; total: number }>();
      for (const d of dealsRes.data || []) {
        if (!d.person_id) continue;
        const cur = dealsByPerson.get(d.person_id) || { open: 0, won: 0, total: 0 };
        cur.total += 1;
        if (d.status === "open") cur.open += 1;
        if (d.status === "won") cur.won += 1;
        dealsByPerson.set(d.person_id, cur);
      }

      const clientesByEmail = new Map<string, any>();
      const clientesByName = new Map<string, any>();
      for (const c of clientesRes.data || []) {
        if (c.email) clientesByEmail.set(c.email.toLowerCase().trim(), c);
        if (c.contato) clientesByName.set(c.contato.toLowerCase().trim(), c);
      }

      const seenEmails = new Set<string>();
      const out: Contato[] = [];

      // Map crm_persons
      for (const p of personsRes.data || []) {
        const emailKey = p.email?.toLowerCase().trim() || "";
        if (emailKey) seenEmails.add(emailKey);
        const cliente =
          (emailKey && clientesByEmail.get(emailKey)) ||
          (p.nome && clientesByName.get(p.nome.toLowerCase().trim()));
        const deals = dealsByPerson.get(p.id) || { open: 0, won: 0, total: 0 };

        let status: ContatoStatus = "frio";
        if (cliente?.status === "ativo") status = "cliente_ativo";
        else if (cliente) status = "ex_cliente";
        else if (deals.won > 0) status = "ex_cliente";
        else if (deals.open > 0) status = "lead";

        out.push({
          id: p.id,
          nome: p.nome || "(sem nome)",
          empresa: (p.organization_id ? orgMap.get(p.organization_id) : null) || cliente?.empresa || null,
          cargo: p.cargo || null,
          telefone: p.telefone || cliente?.telefone || null,
          email: p.email || cliente?.email || null,
          status,
          organization_id: p.organization_id || null,
          cliente_id: cliente?.id || null,
          deals_count: deals.total,
          open_deals: deals.open,
          won_deals: deals.won,
        });
      }

      // Add clientes_ativos that aren't linked to any crm_person
      for (const c of clientesRes.data || []) {
        const emailKey = c.email?.toLowerCase().trim() || "";
        if (emailKey && seenEmails.has(emailKey)) continue;
        if (!c.contato && !c.empresa) continue;
        out.push({
          id: `cliente-${c.id}`,
          nome: c.contato || c.empresa || "(sem nome)",
          empresa: c.empresa || null,
          cargo: null,
          telefone: c.telefone || null,
          email: c.email || null,
          status: c.status === "ativo" ? "cliente_ativo" : "ex_cliente",
          organization_id: null,
          cliente_id: c.id,
          deals_count: 0,
          open_deals: 0,
          won_deals: 0,
        });
      }

      out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      return out;
    },
  });
}

export interface ContatoDetalhes {
  deals: Array<{
    id: string;
    titulo: string;
    valor: number;
    status: string;
    stage_nome: string | null;
    updated_at: string;
  }>;
  atividades: Array<{
    id: string;
    tipo: string;
    titulo: string;
    scheduled_at: string | null;
    concluida: boolean;
    created_at: string;
  }>;
}

export function useContatoDetalhes(personId: string | null) {
  return useQuery({
    queryKey: ["contatos", "detalhes", personId],
    enabled: !!personId && !personId.startsWith("cliente-"),
    queryFn: async (): Promise<ContatoDetalhes> => {
      if (!personId) return { deals: [], atividades: [] };
      const [dealsRes, actsRes, stagesRes] = await Promise.all([
        supabase
          .from("crm_deals")
          .select("id, titulo, valor, status, stage_id, updated_at")
          .eq("person_id", personId)
          .order("updated_at", { ascending: false }),
        supabase
          .from("crm_activities")
          .select("id, tipo, titulo, scheduled_at, concluida, created_at")
          .eq("person_id", personId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("crm_stages").select("id, nome"),
      ]);
      const stageMap = new Map((stagesRes.data || []).map((s: any) => [s.id, s.nome]));
      return {
        deals: (dealsRes.data || []).map((d: any) => ({
          id: d.id,
          titulo: d.titulo,
          valor: Number(d.valor || 0),
          status: d.status,
          stage_nome: stageMap.get(d.stage_id) || null,
          updated_at: d.updated_at,
        })),
        atividades: (actsRes.data || []) as any,
      };
    },
  });
}
