import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, fullName);
      setLoading(false);
      if (error) {
        toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Conta criada!", description: "Verifique seu e-mail para confirmar." });
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'hsl(228, 16%, 6%)' }}>
      {/* Background blobs */}
      <div className="glass-bg-scene" />
      <div className="glass-bg-scene">
        <div className="glass-blob-3" />
      </div>
      <div className="glass-particles">
        {Array.from({ length: 12 }).map((_, i) => (
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

      <div className="w-full max-w-sm animate-slide-up relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'rgba(0, 200, 150, 0.15)',
              border: '1px solid rgba(0, 200, 150, 0.25)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 40px rgba(0, 200, 150, 0.15)',
            }}
          >
            <span className="text-primary font-bold text-xl">P3</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ lineHeight: "1.1" }}>RenderOS</h1>
          <p className="text-sm text-muted-foreground mt-1">Palacios 3D Studio</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          {isSignUp && (
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Nome completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                className="w-full h-10 px-3 rounded-xl glass-input text-sm text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full h-10 px-3 rounded-xl glass-input text-sm text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3 rounded-xl glass-input text-sm text-foreground placeholder:text-muted-foreground"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl text-sm font-semibold active:scale-[0.97] transition-all duration-300 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, hsla(160,100%,39%,0.8), hsla(160,100%,39%,0.6))',
              border: '1px solid hsla(160,100%,39%,0.3)',
              color: 'hsl(222, 20%, 5%)',
              boxShadow: '0 4px 20px rgba(0, 200, 150, 0.25)',
            }}
          >
            {loading ? (isSignUp ? "Criando..." : "Entrando...") : (isSignUp ? "Criar conta" : "Entrar")}
          </button>

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-all duration-300"
          >
            {isSignUp ? "Já tem conta? Entrar" : "Não tem conta? Criar agora"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Palacios 3D Studio © 2026
        </p>
      </div>
    </div>
  );
}
