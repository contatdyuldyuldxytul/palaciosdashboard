import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import logoPalacios from "@/assets/logo-palacios-white.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setMode("update");
    }
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
      toast({ title: "E-mail enviado", description: "Verifique sua caixa de entrada para redefinir a senha." });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Senhas não conferem", description: "Digite a mesma senha nos dois campos.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha atualizada", description: "Sua senha foi redefinida com sucesso." });
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'hsl(228, 16%, 6%)' }}>
      <div className="glass-bg-scene" />
      <div className="glass-bg-scene">
        <div className="glass-blob-3" />
      </div>

      <div className="w-full max-w-sm animate-slide-up relative z-10">
        <div className="flex flex-col items-center mb-8">
          <img src={logoPalacios} alt="Palacios 3D Studio" className="w-20 h-20 mb-4 opacity-90" />
          <p className="text-sm text-muted-foreground mt-1">Palacios 3D Studio</p>
        </div>

        <div className="glass-card p-6 space-y-4">
          {mode === "request" && !sent && (
            <>
              <h2 className="text-lg font-semibold text-foreground text-center">Redefinir senha</h2>
              <p className="text-xs text-muted-foreground text-center">Digite seu e-mail para receber o link de redefinição.</p>
              <form onSubmit={handleRequest} className="space-y-4">
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
                  {loading ? "Enviando..." : "Enviar link"}
                </button>
              </form>
            </>
          )}

          {mode === "request" && sent && (
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold text-foreground">E-mail enviado!</h2>
              <p className="text-xs text-muted-foreground">Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para o login
              </button>
            </div>
          )}

          {mode === "update" && (
            <>
              <h2 className="text-lg font-semibold text-foreground text-center">Nova senha</h2>
              <p className="text-xs text-muted-foreground text-center">Digite sua nova senha abaixo.</p>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 px-3 pr-10 rounded-xl glass-input text-sm text-foreground placeholder:text-muted-foreground"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Confirmar senha</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 px-3 pr-10 rounded-xl glass-input text-sm text-foreground placeholder:text-muted-foreground"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                  {loading ? "Salvando..." : "Redefinir senha"}
                </button>
              </form>
            </>
          )}

          <button
            onClick={() => navigate("/login")}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-all duration-300"
          >
            Voltar para o login
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Palacios 3D Studio © 2026
        </p>
      </div>
    </div>
  );
}
