import { Plus } from "lucide-react";
import { useClientes } from "@/hooks/useClientes";

export default function ClientesAtivos() {
  const { data: clients = [], isLoading } = useClientes();

  if (isLoading) {
    return (
      <div className="p-6 space-y-5 max-w-6xl">
        <div className="h-8 w-48 bg-muted/30 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="glass-card h-48 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Clientes Ativos</h1>
          <p className="text-sm text-muted-foreground mt-1">{clients.length} projetos em andamento</p>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhum cliente ativo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map((client, i) => (
            <div
              key={client.id}
              className="glass-card-hover p-5 cursor-pointer animate-slide-up"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">{client.empresa.substring(0, 2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{client.empresa}</p>
                  <p className="text-xs text-muted-foreground">{client.projeto}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  client.status === "concluido" ? "bg-primary/15 text-primary" :
                  client.status === "inicio" ? "bg-blue-500/15 text-blue-400" :
                  "bg-yellow-500/15 text-yellow-400"
                }`}>
                  {client.status}
                </span>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progresso do projeto</span>
                  <span className="font-medium text-foreground">{client.progresso}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${client.progresso}%` }} />
                </div>
              </div>

              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{client.qtd_imagens} imagens</span>
                {client.inclui_modelagem && <span>Modelagem 3D</span>}
                {client.segundos_animacao > 0 && <span>{client.segundos_animacao}s animação</span>}
              </div>

              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-sm font-semibold text-foreground">
                  R$ {(client.valor_total / 1000).toFixed(1)}k
                </p>
                <p className="text-[10px] text-muted-foreground">Valor do projeto</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
