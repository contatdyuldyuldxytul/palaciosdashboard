import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { DollarSign, Rocket, Users, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CEO_PASSWORD = "Cristine#1972#";

const navItems = [
  { label: "Financeiro", path: "/ceo", icon: DollarSign },
  { label: "Estratégias", path: "/ceo/estrategias", icon: Rocket },
  { label: "Clientes", path: "/ceo/clientes", icon: Users },
];

export function CeoLayout() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (pin === CEO_PASSWORD) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!unlocked) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 w-full max-w-sm space-y-5 text-center"
        >
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <Lock className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Painel CEO</h2>
            <p className="text-sm text-muted-foreground mt-1">Digite a senha para acessar</p>
          </div>
          <input
            type="password"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)" }}
            autoFocus
          />
          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-destructive">
                Senha incorreta
              </motion.p>
            )}
          </AnimatePresence>
          <button
            onClick={handleSubmit}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{ background: "rgba(245,158,11,0.2)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}
          >
            Confirmar
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <nav
        className="mx-6 mt-4 rounded-2xl backdrop-blur-xl p-2 flex flex-wrap gap-1"
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
              `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-amber-500/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex-1 min-w-0 mx-6 mt-4 mb-6 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
