import { useState } from "react";
import { Lock, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface LockedCommissionProps {
  password: string;
  children: React.ReactNode;
}

export function LockedCommission({ password, children }: LockedCommissionProps) {
  const { isFundador } = useAuth();
  const [unlocked, setUnlocked] = useState(false);

  if (isFundador) return <>{children}</>;
  const [showModal, setShowModal] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (pin === password) {
      setUnlocked(true);
      setShowModal(false);
      setPin("");
      setError(false);
    } else {
      setError(true);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
        className="glass-card p-4 cursor-pointer hover:bg-white/[0.04] transition-all"
        onClick={() => setShowModal(true)}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.2)" }}>
            <TrendingUp className="w-4 h-4" style={{ color: "hsl(20,80%,55%)" }} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Comissão — Protegida</p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Clique para ver</p>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => { setShowModal(false); setPin(""); setError(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 w-80 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Digite a senha</h3>
              </div>
              <input
                type="password"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)" }}
                autoFocus
              />
              {error && <p className="text-xs text-destructive">Senha incorreta</p>}
              <button
                onClick={handleSubmit}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
              >
                Confirmar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
