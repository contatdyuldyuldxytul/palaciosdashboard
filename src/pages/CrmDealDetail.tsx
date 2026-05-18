import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Building2, Mail, Phone, Calendar, User, Trophy, X, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

export default function CrmDealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: deal, isLoading } = useQuery({
    queryKey: ["crm", "deal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_deals")
        .select("*, organization:crm_organizations(*), person:crm_persons(*), pipeline:crm_pipelines(nome), stage:crm_stages(nome,cor,ordem)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: allStages = [] } = useQuery({
    queryKey: ["crm", "stages", deal?.pipeline_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_stages").select("*").eq("pipeline_id", deal!.pipeline_id).order("ordem");
      return data || [];
    },
    enabled: !!deal?.pipeline_id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["crm", "activities", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_activities").select("*").eq("deal_id", id!).order("scheduled_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const currentStageIdx = useMemo(
    () => allStages.findIndex(s => s.id === deal?.stage_id),
    [allStages, deal?.stage_id]
  );

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando deal…</div>;
  if (!deal) return <div className="p-6 text-sm text-muted-foreground">Deal não encontrado.</div>;

  const daysIn = Math.floor((Date.now() - new Date(deal.stage_entered_at).getTime()) / 86400000);

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Top bar */}
      <button onClick={() => navigate("/crm")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao CRM
      </button>

      {/* Header */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{(deal as any).pipeline?.nome}</div>
            <h1 className="text-2xl font-semibold text-foreground leading-tight">{deal.titulo}</h1>
            {deal.organization && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1">
                <Building2 className="w-3.5 h-3.5" />
                {(deal.organization as any).nome}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor</div>
            <div className="text-3xl font-bold text-primary tabular-nums">{fmt(Number(deal.valor) || 0)}</div>
          </div>
        </div>

        {/* Stage progress */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1">
            {allStages.map((s, idx) => (
              <div key={s.id} className="flex-1 group relative">
                <div
                  className={`h-1.5 rounded-full transition-all ${idx <= currentStageIdx ? "" : "bg-white/5"}`}
                  style={idx <= currentStageIdx ? { background: s.cor || "hsl(var(--primary))" } : undefined}
                />
                <div className={`text-[9px] mt-1.5 text-center truncate ${idx === currentStageIdx ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {s.nome}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Trophy className="w-3.5 h-3.5 mr-1.5" /> Marcar como Ganho
          </Button>
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-300 hover:bg-red-500/10">
            <X className="w-3.5 h-3.5 mr-1.5" /> Marcar como Perdido
          </Button>
          <Button size="sm" variant="ghost">
            <Edit className="w-3.5 h-3.5 mr-1.5" /> Editar
          </Button>
          {daysIn >= 7 && (
            <div className={`ml-auto text-[10px] px-2.5 py-1 rounded-full self-center ${daysIn >= 14 ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"}`}>
              {daysIn} dias no estágio atual
            </div>
          )}
        </div>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="timeline">
            <TabsList className="glass-card border border-white/10">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="atividades">Atividades</TabsTrigger>
              <TabsTrigger value="notas">Notas</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4">
              <div className="glass-card rounded-xl p-5 space-y-4">
                <TimelineRow icon={<Calendar className="w-3.5 h-3.5" />} title="Deal criado" date={deal.created_at} />
                <TimelineRow icon={<Edit className="w-3.5 h-3.5" />} title="Entrou no estágio atual" date={deal.stage_entered_at} />
                {activities.slice(0, 5).map((a: any) => (
                  <TimelineRow key={a.id} icon={<Calendar className="w-3.5 h-3.5" />} title={a.titulo} date={a.scheduled_at} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="atividades" className="mt-4">
              <div className="glass-card rounded-xl p-5">
                {activities.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-8">Sem atividades agendadas</div>
                ) : (
                  <div className="space-y-2">
                    {activities.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
                        <div>
                          <div className="text-foreground">{a.titulo}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{a.tipo}</div>
                        </div>
                        {a.scheduled_at && (
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(a.scheduled_at).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notas" className="mt-4">
              <div className="glass-card rounded-xl p-5 text-xs text-muted-foreground text-center py-8">
                Sem notas. (CRUD em breve.)
              </div>
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              <div className="glass-card rounded-xl p-5 text-xs text-muted-foreground text-center py-8">
                Histórico de mudanças aparecerá aqui.
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Responsável</div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{deal.owner_label || "—"}</span>
            </div>
          </div>

          {deal.person && (
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Contato</div>
              <div className="text-sm font-medium text-foreground">{(deal.person as any).nome}</div>
              {(deal.person as any).email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3" /> {(deal.person as any).email}
                </div>
              )}
              {(deal.person as any).telefone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3" /> {(deal.person as any).telefone}
                </div>
              )}
            </div>
          )}

          {deal.organization && (
            <div className="glass-card rounded-xl p-4 space-y-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Empresa</div>
              <div className="text-sm font-medium text-foreground">{(deal.organization as any).nome}</div>
            </div>
          )}

          <div className="glass-card rounded-xl p-4 space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Datas</div>
            <div className="text-xs text-muted-foreground">
              Criado: {new Date(deal.created_at).toLocaleDateString("pt-BR")}
            </div>
            {deal.expected_close_date && (
              <div className="text-xs text-muted-foreground">
                Fechamento esperado: {new Date(deal.expected_close_date).toLocaleDateString("pt-BR")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineRow({ icon, title, date }: { icon: React.ReactNode; title: string; date: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground">{title}</div>
        <div className="text-[10px] text-muted-foreground">
          {new Date(date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
        </div>
      </div>
    </div>
  );
}
