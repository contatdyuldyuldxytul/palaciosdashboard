import { Clock } from "lucide-react";

export function AdminPlaceholder() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="glass-card rounded-2xl p-10 max-w-md text-center space-y-3 border border-white/10">
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Painel Admin · Em breve</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Vai permitir editar tudo que o cliente vê na página de acompanhamento do projeto
          (timeline, galeria, status, financeiro). Vamos construir essa parte logo depois
          que definirmos a página externa do cliente.
        </p>
      </div>
    </div>
  );
}
