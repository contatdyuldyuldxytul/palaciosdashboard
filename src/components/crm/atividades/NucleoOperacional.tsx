import { useState } from "react";
import { Users } from "lucide-react";
import TeamMemberDashboard from "@/pages/TeamMemberDashboard";
import LdrMemberDashboard from "@/pages/LdrMemberDashboard";
import ThiagoDashboard from "@/pages/ThiagoDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { Lock } from "lucide-react";

type Colaborador = "aline" | "milena" | "thiago" | "felipe";

const COLABS: { key: Colaborador; label: string; initials: string; color?: string }[] = [
  { key: "aline", label: "Aline", initials: "AL" },
  { key: "milena", label: "Milena", initials: "MI", color: "hsl(45,80%,45%)" },
  { key: "thiago", label: "Thiago", initials: "TH", color: "#0a3a5c" },
  { key: "felipe", label: "Felipe", initials: "FE", color: "#f97316" },
];

export function NucleoOperacional() {
  const { profile, hasRole } = useAuth();
  const [colab, setColab] = useState<Colaborador>("geral");
  const [geralTab, setGeralTab] = useState<GeralTab>("funil");

  const canSeeThiago = hasRole("fundador") || profile?.colaborador_slug === "thiago";

  return (
    <div className="flex flex-col">
      {/* Colaborador selector */}
      <div
        className="flex items-center gap-2 px-6 py-3 backdrop-blur-xl flex-wrap"
        style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--glass-border)" }}
      >
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider mr-2">Ver como</span>
        {COLABS.map((c) => {
          if (c.key === "thiago" && !canSeeThiago) return null;
          const active = colab === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setColab(c.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all border ${
                active
                  ? "bg-primary/15 border-primary/40 text-primary font-medium"
                  : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              }`}
            >
              {c.key !== "geral" && (
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: c.color || "hsl(160,60%,38%)" }}
                >
                  {c.initials}
                </span>
              )}
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Inner content */}
      <div className="flex-1 overflow-y-auto">
        {colab === "geral" ? (
          <>
            <div
              className="flex items-center gap-1 px-6 overflow-x-auto backdrop-blur-xl"
              style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--glass-border)" }}
            >
              {GERAL_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setGeralTab(t.key)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                    geralTab === t.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-white/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div>
              {geralTab === "funil" && <Funil />}
              {geralTab === "leads" && <Leads />}
              {geralTab === "scripts" && <Scripts />}
              {geralTab === "ligacoes" && <Placeholder title="Ligações" />}
              {geralTab === "assistente" && <AssistenteVendas />}
            </div>
          </>
        ) : colab === "aline" ? (
          <TeamMemberDashboard memberName="Aline" initials="AL" />
        ) : colab === "milena" ? (
          <LdrMemberDashboard memberName="Milena" initials="MI" avatarColor="hsl(45,80%,45%)" />
        ) : colab === "thiago" ? (
          canSeeThiago ? <ThiagoDashboard /> : (
            <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
              <Lock className="w-4 h-4" /> Acesso restrito.
            </div>
          )
        ) : colab === "felipe" ? (
          <TeamMemberDashboard memberName="Felipe" initials="FE" />
        ) : null}
      </div>
    </div>
  );
}
