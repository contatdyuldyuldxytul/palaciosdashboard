import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logoPalacios from "@/assets/logo-palacios-white.png";

export default function AccessPending({ rejected = false }: { rejected?: boolean }) {
  const { signOut, profile } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "hsl(228,16%,6%)" }}>
      <div className="glass-card p-8 max-w-md w-full text-center space-y-5">
        <img src={logoPalacios} alt="Palacios" className="w-16 h-16 mx-auto opacity-90" />
        <div
          className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <Clock className="w-7 h-7 text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {rejected ? "Acesso negado" : "Aguardando aprovação"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {rejected
              ? "Seu acesso à plataforma foi negado pelo CEO. Entre em contato se acreditar que é um engano."
              : "Sua conta foi criada e está aguardando aprovação do CEO. Você será notificado assim que liberar o acesso."}
          </p>
          {profile?.email && (
            <p className="text-xs text-muted-foreground mt-3">Conta: {profile.email}</p>
          )}
        </div>
        <button
          onClick={signOut}
          className="w-full h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)", color: "hsl(var(--foreground))" }}
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
    </div>
  );
}
