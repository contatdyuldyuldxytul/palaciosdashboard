import { UserCheck } from "lucide-react";

const clients = [
  { name: "Construtora Alphaville", project: "Residencial Jardins", progress: 75, status: "Em andamento", images: 15, modeling: true, animation: 30 },
  { name: "Incorporadora Horizonte", project: "Torre Norte Premium", progress: 40, status: "Em andamento", images: 20, modeling: true, animation: 0 },
  { name: "MRV Engenharia", project: "Parque das Flores", progress: 95, status: "Finalização", images: 10, modeling: true, animation: 15 },
  { name: "Even Construtora", project: "Vivaz Butantã", progress: 20, status: "Início", images: 8, modeling: true, animation: 0 },
];

export default function ClientesAtivos() {
  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Clientes Ativos</h1>
        <p className="text-sm text-muted-foreground mt-1">{clients.length} projetos em andamento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.map((client, i) => (
          <div
            key={client.name}
            className="glass-card-hover p-5 cursor-pointer animate-slide-up"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">{client.name.substring(0, 2).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{client.name}</p>
                <p className="text-xs text-muted-foreground">{client.project}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                client.status === "Finalização" ? "bg-primary/15 text-primary" :
                client.status === "Início" ? "bg-blue-500/15 text-blue-400" :
                "bg-yellow-500/15 text-yellow-400"
              }`}>
                {client.status}
              </span>
            </div>

            {/* Progress */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progresso do projeto</span>
                <span className="font-medium text-foreground">{client.progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${client.progress}%` }}
                />
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{client.images} imagens</span>
              {client.modeling && <span>Modelagem 3D</span>}
              {client.animation > 0 && <span>{client.animation}s animação</span>}
            </div>

            {/* Value */}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm font-semibold text-foreground">
                R$ {((client.images * 800 + (client.modeling ? 4000 : 0) + client.animation * 120) / 1000).toFixed(1)}k
              </p>
              <p className="text-[10px] text-muted-foreground">Valor do projeto</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
