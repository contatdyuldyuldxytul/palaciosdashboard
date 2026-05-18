import { Outlet, Link } from "react-router-dom";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import logoPalacios from "@/assets/logo-palacios.png";
import logoPalaciosLight from "@/assets/logo-palacios-light.png";

export function CrmLayout() {
  const { profile } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Animated background */}
      <div className="glass-bg-scene" />
      <div className="glass-bg-scene">
        <div className="glass-blob-3" />
      </div>
      <div className="glass-particles">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="glass-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${12 + Math.random() * 18}s`,
              animationDelay: `${Math.random() * 10}s`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header
        className="sticky top-0 z-30 h-14 flex items-center px-4 lg:px-6 glass-sidebar"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <div className="flex items-center gap-3">
          <img
            src={theme === "light" ? logoPalaciosLight : logoPalacios}
            alt="Palacios 3D Studio"
            className="h-6 w-auto object-contain opacity-90"
          />
          <span className="text-muted-foreground/40 text-sm">/</span>
          <span className="text-sm font-semibold text-foreground tracking-tight">CRM Integrado</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao app
          </Link>
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {profile && (
            <div className="hidden md:flex flex-col items-end pl-3 ml-1" style={{ borderLeft: "1px solid var(--glass-border)" }}>
              <span className="text-xs text-foreground font-medium truncate max-w-[180px]">
                {profile.full_name || profile.email}
              </span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">{profile.email}</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
