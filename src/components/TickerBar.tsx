import { TrendingUp, Users, Calendar, Target, RefreshCw } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { useSyncSheets } from "@/hooks/useSyncSheets";
import { usePipedrive } from "@/hooks/usePipedrive";
import { format } from "date-fns";

export function TickerBar() {
  const { data: leads = [] } = useLeads();
  const { sync, isSyncing, lastSync, autoSync, toggleAutoSync } = useSyncSheets();
  const { minutesAgo: pipedriveMinAgo, isSyncing: pipedriveSyncing } = usePipedrive();

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

  const Item = ({ m }: { m: (typeof metrics)[number] }) => (
    <div className="flex items-center gap-2 flex-shrink-0 mr-10">
      <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">{m.label}:</span>
      <span className="font-semibold text-foreground">{m.value}</span>
    </div>
  );

  return (
    <div className="ticker-bar h-10 flex items-center px-4 gap-4 text-xs relative z-10 overflow-hidden">
      {/* Marquee — auto-scroll horizontal */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex w-max animate-[ticker-scroll_28s_linear_infinite] hover:[animation-play-state:paused]">
          {metrics.map((m, i) => <Item key={`a-${i}`} m={m} />)}
          {metrics.map((m, i) => <Item key={`b-${i}`} m={m} />)}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Pipedrive status */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${pipedriveSyncing ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`}
          />
          <span className="text-[10px] text-muted-foreground">
            Pipedrive — {pipedriveSyncing ? "Sincronizando..." : pipedriveMinAgo !== null ? `Sincronizado há ${pipedriveMinAgo} min` : "Aguardando sync"}
          </span>
        </div>

        <span className="text-muted-foreground/30">|</span>

        {lastSync && (
          <span className="text-[10px] text-muted-foreground">
            Sheets: {format(new Date(lastSync), "dd/MM HH:mm")}
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
