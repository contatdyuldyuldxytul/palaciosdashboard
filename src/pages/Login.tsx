import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock login — will connect to Supabase auth
    setTimeout(() => {
      setLoading(false);
      navigate("/");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-xl">P3</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ lineHeight: "1.1" }}>RenderOS</h1>
          <p className="text-sm text-muted-foreground mt-1">Palacios 3D Studio</p>
        </div>

        <form onSubmit={handleLogin} className="glass-card p-6 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full h-10 px-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              className="w-full h-10 px-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Palacios 3D Studio © 2026
        </p>
      </div>
    </div>
  );
}
