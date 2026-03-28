import { useState } from "react";
import CeoFinResumo from "./CeoFinResumo";
import CeoFinLancamentos from "./CeoFinLancamentos";
import CeoFinDRE from "./CeoFinDRE";
import CeoFinFluxoCaixa from "./CeoFinFluxoCaixa";
import CeoFinBalanco from "./CeoFinBalanco";
import CeoFinCustosPE from "./CeoFinCustosPE";
import CeoFinIndicadores from "./CeoFinIndicadores";
import { CeoMetricsAndAlerts } from "@/components/ceo/CeoMetricsAndAlerts";

const tabs = [
  { key: "resumo", label: "📊 Resumo", emoji: "📊" },
  { key: "lancamentos", label: "📝 Lançamentos", emoji: "📝" },
  { key: "dre", label: "📈 DRE", emoji: "📈" },
  { key: "fluxo", label: "💰 Fluxo de Caixa", emoji: "💰" },
  { key: "balanco", label: "🏦 Balanço", emoji: "🏦" },
  { key: "custos", label: "📐 Custos & PE", emoji: "📐" },
  { key: "indicadores", label: "📏 Indicadores", emoji: "📏" },
];

export default function CeoFinanceiro() {
  const [tab, setTab] = useState("resumo");

  return (
    <div className="space-y-6">
      <CeoMetricsAndAlerts />

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
