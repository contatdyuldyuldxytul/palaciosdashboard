import { useState, ReactNode } from "react";
import { Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PASSWORD = "Cristine#1972#";

interface PasswordGateProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function PasswordGate({ title, subtitle = "Digite a senha para acessar", children }: PasswordGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (pin === PASSWORD) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 w-full max-w-sm space-y-5 text-center"
      >
        <div
          className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <Lock className="w-7 h-7 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
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
