import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, MessageSquare, Inbox, AlertCircle, ExternalLink, Search, ArrowUpDown } from "lucide-react";

interface InstagramLead {
  id: string;
  username: string;
  score: number;
  razao: string | null;
  tipo_lead: string | null;
  mensagem_rascunho: string | null;
  status: string;
  processado_em: string | null;
}

type StatusKey = "aguardando_revisao" | "aprovado" | "contatado" | "descartado";

const TABS: { key: StatusKey; label: string }[] = [
  { key: "aguardando_revisao", label: "Aguardando Revisão" },
  { key: "aprovado", label: "Aprovados" },
  { key: "contatado", label: "Contatados" },
  { key: "descartado", label: "Descartados" },
];

const TIPO_OPTIONS = [
  { value: "todos", label: "Todos os tipos" },
  { value: "arquiteto", label: "Arquiteto" },
  { value: "incorporadora", label: "Incorporadora" },
  { value: "construtora", label: "Construtora" },
  { value: "outro", label: "Outro" },
];

function useInstagramLeads(status: StatusKey) {
  return useQuery<InstagramLead[]>({
    queryKey: ["instagram-leads", status],
    queryFn: async () => {
      const res = await (supabase as any)
        .from("leads_qualified")
        .select("id, username, score, razao, tipo_lead, mensagem_rascunho, status, processado_em")
        .eq("status", status)
        .order("score", { ascending: false });

      if (res.error) throw res.error;
      return (res.data || []) as InstagramLead[];
    },
  });
}

function useStatusCounts() {
  return useQuery<Record<StatusKey, number>>({
    queryKey: ["instagram-leads", "counts"],
    queryFn: async () => {
      const res = await (supabase as any)
        .from("leads_qualified")
        .select("status");
      if (res.error) throw res.error;
      const counts: Record<StatusKey, number> = {
        aguardando_revisao: 0,
        aprovado: 0,
        contatado: 0,
        descartado: 0,
      };
      (res.data || []).forEach((r: { status: string }) => {
        if (r.status in counts) counts[r.status as StatusKey]++;
      });
      return counts;
    },
  });
}

const scoreBadge = (s: number) => {
  if (s >= 8) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (s >= 6) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
};

const tipoBadge = (tipo: string | null) => {
  const map: Record<string, string> = {
    arquiteto: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    incorporadora: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    construtora: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    outro: "bg-white/5 text-muted-foreground border-white/10",
  };
  return map[tipo?.toLowerCase() || "outro"] || map.outro;
};

const tipoLabel = (tipo: string | null) => {
  const map: Record<string, string> = {
    arquiteto: "Arquiteto",
    incorporadora: "Incorporadora",
    construtora: "Construtora",
    outro: "Outro",
  };
  return map[tipo?.toLowerCase() || "outro"] || (tipo || "Outro");
};

const emptyMessages: Record<StatusKey, string> = {
  aguardando_revisao: "Nenhum lead aguardando revisão",
  aprovado: "Nenhum lead aprovado",
  contatado: "Nenhum lead contatado",
  descartado: "Nenhum lead descartado",
};

export default function InstagramLeads() {
  const [activeTab, setActiveTab] = useState<StatusKey>("aguardando_revisao");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const { data: leads, isLoading, error } = useInstagramLeads(activeTab);
  const { data: counts } = useStatusCounts();

  const filtered = useMemo(() => {
    if (!leads) return [];
    let out = leads;
    if (tipoFilter !== "todos") {
      out = out.filter((l) => (l.tipo_lead || "outro").toLowerCase() === tipoFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase().replace(/^@/, "");
      out = out.filter((l) => l.username.toLowerCase().includes(q));
    }
    out = [...out].sort((a, b) => (sortDesc ? b.score - a.score : a.score - b.score));
    return out;
  }, [leads, tipoFilter, search, sortDesc]);

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/10">
          <Instagram className="w-5 h-5 text-pink-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Leads do Instagram</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prospecção qualificada por IA de escritórios de arquitetura e incorporadoras
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] overflow-x-auto">
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          const count = counts?.[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`relative px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {t.label}
                {typeof count === "number" && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      isActive ? "bg-primary/15 text-primary" : "bg-white/5 text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </span>
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-px bg-primary" />}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por @username..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:bg-white/[0.06] transition-colors"
          />
        </div>
        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
          className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-foreground focus:outline-none focus:border-primary/40 transition-colors min-w-[160px]"
        >
          {TIPO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-background">
              {o.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setSortDesc((v) => !v)}
          className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-foreground hover:bg-white/[0.06] transition-colors inline-flex items-center gap-1.5"
          title={sortDesc ? "Maior score primeiro" : "Menor score primeiro"}
        >
          <ArrowUpDown className="w-3 h-3" />
          Score {sortDesc ? "↓" : "↑"}
        </button>
      </div>

      {/* States */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 glass-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-xl p-8 flex flex-col items-center text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-destructive mb-3" />
          <h3 className="text-sm font-medium text-foreground mb-1">Erro ao carregar leads</h3>
          <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Inbox className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">
            {leads && leads.length > 0 ? "Nenhum resultado para os filtros" : emptyMessages[activeTab]}
          </h3>
          <p className="text-xs text-muted-foreground">
            {leads && leads.length > 0
              ? "Tente ajustar a busca ou o tipo selecionado."
              : "Os próximos leads aparecerão aqui."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((lead) => (
            <article
              key={lead.id}
              className="glass-card rounded-xl p-5 flex flex-col gap-4 hover:bg-white/[0.06] transition-all duration-300"
            >
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <a
                    href={`https://instagram.com/${lead.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 group"
                  >
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      @{lead.username}
                    </span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </a>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${scoreBadge(lead.score)}`}>
                      Score {lead.score}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${tipoBadge(lead.tipo_lead)}`}>
                      {tipoLabel(lead.tipo_lead)}
                    </span>
                  </div>
                </div>
              </header>

              {lead.razao && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Por quê qualificou
                  </span>
                  <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">{lead.razao}</p>
                </div>
              )}

              {lead.mensagem_rascunho && (
                <div className="mt-auto">
                  <div className="flex items-center gap-1.5 mb-2">
                    <MessageSquare className="w-3 h-3 text-primary" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Mensagem rascunho
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-3.5">
                    <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {lead.mensagem_rascunho}
                    </p>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
