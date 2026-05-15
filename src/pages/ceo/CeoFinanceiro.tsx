import { useState } from "react";
import { RefreshCw } from "lucide-react";
import CeoFinResumo from "./CeoFinResumo";
import CeoFinLancamentos from "./CeoFinLancamentos";
import CeoFinDRE from "./CeoFinDRE";
import CeoFinFluxoCaixa from "./CeoFinFluxoCaixa";
import CeoFinBalanco from "./CeoFinBalanco";
import CeoFinCustosPE from "./CeoFinCustosPE";
import CeoFinIndicadores from "./CeoFinIndicadores";
import { CeoMetricsAndAlerts } from "@/components/ceo/CeoMetricsAndAlerts";
import { useFinanceiroSync } from "@/hooks/useFinanceiroSync";

const tabs = [
  { key: "resumo", label: "📊 Resumo", emoji: "📊" },
  { key: "lancamentos", label: "📝 Lançamentos", emoji: "📝" },
  { key: "dre", label: "📈 DRE", emoji: "📈" },
  { key: "fluxo", label: "💰 Fluxo de Caixa", emoji: "💰" },
  { key: "balanco", label: "🏦 Balanço", emoji: "🏦" },
  { key: "custos", label: "📐 Custos & PE", emoji: "📐" },
  { key: "indicadores", label: "📏 Indicadores", emoji: "📏" },
];

function formatLastSync(iso: string | null): string {
  if (!iso) return "Nunca sincronizado";
  const d = new Date(iso);
  return `Última sync: ${d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
}

export default function CeoFinanceiro() {
  const [tab, setTab] = useState("resumo");
  const { sync, isSyncing, lastSync } = useFinanceiroSync();

  return (
    <div className="space-y-6">
      <CeoMetricsAndAlerts />

      {/* Sync planilha financeira */}
      <div className="flex items-center justify-between gap-3 glass-card px-4 py-3">
        <div className="text-xs text-muted-foreground">
          📊 Planilha financeira do Thiago — sync automático a cada 12h
          <span className="ml-2 opacity-70">• {formatLastSync(lastSync)}</span>
        </div>
        <button
          onClick={() => sync()}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Sincronizando..." : "Sincronizar agora"}
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 flex-wrap glass-card p-1.5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tab === t.key
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "resumo" && <CeoFinResumo />}
      {tab === "lancamentos" && <CeoFinLancamentos />}
      {tab === "dre" && <CeoFinDRE />}
      {tab === "fluxo" && <CeoFinFluxoCaixa />}
      {tab === "balanco" && <CeoFinBalanco />}
      {tab === "custos" && <CeoFinCustosPE />}
      {tab === "indicadores" && <CeoFinIndicadores />}
    </div>
  );
}
