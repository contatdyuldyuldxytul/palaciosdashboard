import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, MessageSquare, Inbox, AlertCircle, ExternalLink, User } from "lucide-react";

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

function useInstagramLeads() {
  return useQuery<InstagramLead[]>({
    queryKey: ["instagram-leads", "aguardando_revisao"],
    queryFn: async () => {
      const filtered = await (supabase as any)
        .from("leads_qualified")
        .select("id, username, score, razao, tipo_lead, mensagem_rascunho, status, processado_em")
        .eq("status", "aguardando_revisao")
        .order("score", { ascending: false });

      const all = await (supabase as any)
        .from("leads_qualified")
        .select("id, status")
        .limit(20);

      console.log("[InstagramLeads] filtered (status=aguardando_revisao):", filtered);
      console.log("[InstagramLeads] sample of all rows (sem filtro):", all);

      if (filtered.error) throw filtered.error;
      return (filtered.data || []) as InstagramLead[];
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

export default function InstagramLeads() {
  const { data: leads, isLoading, error } = useInstagramLeads();

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
      ) : !leads || leads.length === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Inbox className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">Nenhum lead aguardando revisão</h3>
          <p className="text-xs text-muted-foreground">Os próximos leads qualificados pela IA aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {leads.map((lead) => (
            <article
              key={lead.id}
              className="glass-card rounded-xl p-5 flex flex-col gap-4 hover:bg-white/[0.06] transition-all duration-300"
            >
              {/* Header: username + badges */}
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

              {/* Razão */}
              {lead.razao && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Por quê qualificou
                  </span>
                  <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">{lead.razao}</p>
                </div>
              )}

              {/* Mensagem rascunho — estilo DM */}
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
