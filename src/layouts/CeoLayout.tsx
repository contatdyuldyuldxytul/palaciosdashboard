import { Outlet, NavLink } from "react-router-dom";
import { CeoHealthScore } from "@/components/ceo/CeoHealthScore";
import { CeoStrategicInsights } from "@/components/ceo/CeoStrategicInsights";
import { DollarSign, Target, HeartPulse, TrendingUp, Scale, Settings, Brain } from "lucide-react";

const navItems = [
  { label: "Financeiro", path: "/ceo", icon: DollarSign, emoji: "💰" },
  { label: "Metas Comerciais", path: "/ceo/metas", icon: Target, emoji: "🎯" },
  { label: "Saúde da Empresa", path: "/ceo/saude", icon: HeartPulse, emoji: "🏥" },
  { label: "Pipeline & Forecast", path: "/ceo/pipeline", icon: TrendingUp, emoji: "📈" },
  { label: "Jurídico & Contratos", path: "/ceo/juridico", icon: Scale, emoji: "⚖️" },
  { label: "Processos & Operacional", path: "/ceo/processos", icon: Settings, emoji: "⚙️" },
  { label: "Memória Estratégica", path: "/ceo/memoria", icon: Brain, emoji: "🧠" },
];

export function CeoLayout() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <CeoHealthScore />
      <CeoStrategicInsights />

      <div className="flex flex-1 min-h-0 mt-4 mx-6 gap-4 mb-6">
        {/* Vertical nav */}
        <nav
          className="flex-shrink-0 w-[200px] rounded-2xl backdrop-blur-xl p-2 space-y-1 self-start sticky top-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-amber-500/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`
              }
            >
              <span className="text-base leading-none">{item.emoji}</span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
