import { TrendingUp, Users, Calendar, Target, RefreshCw } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { useSyncSheets } from "@/hooks/useSyncSheets";
import { format } from "date-fns";

export function TickerBar() {
  const { data: leads = [] } = useLeads();
  const { sync, isSyncing, lastSync, autoSync, toggleAutoSync } = useSyncSheets();

  const leadsCount = leads.length;
  const reunioes = leads.filter((l) => ["reuniao_realizada", "proposta", "fechado"].includes(l.status)).length;
  const fechados = leads.filter((l) => l.status === "fechado");
  const receita = fechados.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);

  const metrics = [
    { label: "Leads do mês", value: String(leadsCount), icon: Users },
    { label: "Reuniões realizadas", value: String(reunioes), icon: Calendar },
    { label: "Contratos fechados", value: String(fechados.length), icon: Target },
    { label: "Pipeline", value: `R$ ${receita.toLocaleString("pt-BR")}`, icon: TrendingUp },
  ];

  return (
    <div className="ticker-bar h-10 flex items-center px-4 gap-6 overflow-x-auto text-xs relative z-10">
      {metrics.map((m) => (
        <div key={m.label} className="flex items-center gap-2 flex-shrink-0">
          <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{m.label}:</span>
          <span className="font-semibold text-foreground">{m.value}</span>
        </div>
      ))}

      <div className="ml-auto flex items-center gap-3 flex-shrink-0">
        {lastSync && (
          <span className="text-[10px] text-muted-foreground">
            Sync: {format(new Date(lastSync), "dd/MM HH:mm")}
          </span>
        )}
        <button
          onClick={() => toggleAutoSync(!autoSync)}
          className={`text-[10px] px-2 py-0.5 rounded-md transition-all duration-300 ${
            autoSync
              ? "bg-primary/15 text-primary"
              : "glass-button text-muted-foreground"
          }`}
          style={autoSync ? { border: '1px solid rgba(0,200,150,0.2)' } : undefined}
        >
          Auto {autoSync ? "ON" : "OFF"}
        </button>
        <button
          onClick={() => sync()}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-primary text-[11px] font-medium active:scale-[0.96] transition-all duration-300 disabled:opacity-50"
          style={{
            background: 'rgba(0, 200, 150, 0.1)',
            border: '1px solid rgba(0, 200, 150, 0.2)',
          }}
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Sincronizando..." : "Sync"}
        </button>
      </div>
    </div>
  );
}
