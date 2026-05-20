import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, MessageSquare, Inbox, AlertCircle } from "lucide-react";

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
      const { data, error } = await (supabase as any)
        .from("leads_qualified")
        .select("id, username, score, razao, tipo_lead, mensagem_rascunho, status, processado_em")
        .eq("status", "aguardando_revisao")
        .order("score", { ascending: false });
      if (error) throw error;
      return (data || []) as InstagramLead[];
    },
  });
}

const scoreColor = (s: number) => {
  if (s >= 80) return "text-primary bg-primary/10 border-primary/30";
  if (s >= 60) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
  return "text-muted-foreground bg-white/[0.04] border-white/10";
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 glass-card rounded-xl animate-pulse" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {leads.map((lead) => (
            <article
              key={lead.id}
              className="glass-card rounded-xl p-4 flex flex-col gap-3 hover:bg-white/[0.06] transition-colors"
            >
              <header className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">@{lead.username}</h3>
                  {lead.tipo_lead && (
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                      {lead.tipo_lead}
                    </p>
                  )}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums border ${scoreColor(lead.score)}`}
                >
                  {lead.score}
                </span>
              </header>

              {lead.razao && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{lead.razao}</p>
              )}

              {lead.mensagem_rascunho && (
                <div className="mt-auto rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="w-3 h-3 text-primary" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Mensagem rascunho
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {lead.mensagem_rascunho}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
