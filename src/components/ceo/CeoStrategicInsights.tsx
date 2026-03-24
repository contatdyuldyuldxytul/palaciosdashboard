import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const AMBER = "hsl(45, 100%, 55%)";

interface Insight {
  prioridade: number;
  area: string;
  titulo: string;
  insight: string;
  acao: string;
  impacto: string;
}

const AREA_COLORS: Record<string, string> = {
  Vendas: "bg-green-500/20 text-green-400 border-green-500/30",
  Financeiro: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Operacional: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Time: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const AREA_BORDER: Record<string, string> = {
  Vendas: "border-l-green-500",
  Financeiro: "border-l-amber-500",
  Operacional: "border-l-blue-500",
  Time: "border-l-purple-500",
};

export function CeoStrategicInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ceo-insights");
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Erro ao gerar insights", description: data.error, variant: "destructive" });
        return;
      }
      setInsights(data?.insights || []);
      setLastUpdated(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      setHasLoaded(true);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-6 mt-4 glass-card p-5 border border-amber-500/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <h2 className="text-sm font-bold" style={{ color: AMBER }}>Direcionamentos Estratégicos</h2>
          {lastUpdated && <span className="text-[10px] text-muted-foreground">Atualizado às {lastUpdated}</span>}
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          {hasLoaded ? "Atualizar" : "Gerar Insights"}
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-3 p-4 rounded-xl bg-muted/20">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && !hasLoaded && (
        <p className="text-xs text-muted-foreground text-center py-6">
          Clique em "Gerar Insights" para receber direcionamentos estratégicos baseados nos dados atuais da empresa.
        </p>
      )}

      {!loading && hasLoaded && insights.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {insights.map((ins, i) => (
            <div key={i} className="p-4 rounded-xl bg-muted/10 border border-white/5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                  {ins.prioridade}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${AREA_COLORS[ins.area] || AREA_COLORS.Vendas}`}>
                  {ins.area}
                </span>
              </div>
              <h3 className="text-sm font-bold text-foreground">{ins.titulo}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{ins.insight}</p>
              <div className={`p-3 rounded-lg bg-white/5 border-l-2 ${AREA_BORDER[ins.area] || "border-l-amber-500"}`}>
                <p className="text-xs font-medium text-foreground">{ins.acao}</p>
              </div>
              <p className="text-[10px] text-muted-foreground italic">💡 {ins.impacto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
