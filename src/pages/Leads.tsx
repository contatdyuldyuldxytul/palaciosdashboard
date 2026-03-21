import { useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

const mockLeads = [
  { id: 1, empresa: "MRV Engenharia", contato: "Ricardo Almeida", cargo: "Gerente de Marketing", cidade: "São Paulo", telefone: "(11) 99876-5432", status: "Reunião Agendada", responsavel: "Carlos", notas: "Lançamento previsto Q2", data: "15/03/2026" },
  { id: 2, empresa: "Cyrela Brazil Realty", contato: "Fernanda Souza", cargo: "Coord. de Projetos", cidade: "Rio de Janeiro", telefone: "(21) 98765-4321", status: "Proposta", responsavel: "Ana", notas: "Pediu portfólio", data: "12/03/2026" },
  { id: 3, empresa: "Tenda Construtora", contato: "Marcos Lima", cargo: "Diretor Comercial", cidade: "Belo Horizonte", telefone: "(31) 97654-3210", status: "Contatado", responsavel: "Carlos", notas: "", data: "14/03/2026" },
  { id: 4, empresa: "Direcional Engenharia", contato: "Patricia Costa", cargo: "Gerente de Marketing", cidade: "Goiânia", telefone: "(62) 96543-2109", status: "Lead", responsavel: "Pedro", notas: "Prospecção LDR", data: "16/03/2026" },
  { id: 5, empresa: "Even Construtora", contato: "Rafael Santos", cargo: "Coord. de Lançamento", cidade: "São Paulo", telefone: "(11) 95432-1098", status: "Fechado", responsavel: "Ana", notas: "Contrato 20 imagens + modelagem", data: "10/03/2026" },
  { id: 6, empresa: "Gafisa", contato: "Juliana Mendes", cargo: "Gerente de Projetos", cidade: "São Paulo", telefone: "(11) 94321-0987", status: "Reunião Realizada", responsavel: "Carlos", notas: "Interesse em animação", data: "13/03/2026" },
  { id: 7, empresa: "Viver Incorporadora", contato: "Bruno Oliveira", cargo: "Diretor", cidade: "Curitiba", telefone: "(41) 93210-9876", status: "Perdido", responsavel: "Ana", notas: "Sem orçamento no momento", data: "08/03/2026" },
];

const statusOptions = ["Todos", "Lead", "Contatado", "Reunião Agendada", "Reunião Realizada", "Proposta", "Fechado", "Perdido"];

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const filtered = mockLeads.filter((l) => {
    const matchSearch = l.empresa.toLowerCase().includes(search.toLowerCase()) ||
      l.contato.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Todos" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Meus Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} leads encontrados</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all">
          <Plus className="w-4 h-4" />
          Adicionar Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar empresa ou contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left p-4 font-medium">Empresa</th>
                <th className="text-left p-4 font-medium">Contato</th>
                <th className="text-left p-4 font-medium">Cidade</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Responsável</th>
                <th className="text-left p-4 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-muted/20 transition-colors cursor-pointer">
                  <td className="p-4">
                    <p className="font-medium text-foreground">{lead.empresa}</p>
                    <p className="text-xs text-muted-foreground">{lead.cargo}</p>
                  </td>
                  <td className="p-4 text-muted-foreground">{lead.contato}</td>
                  <td className="p-4 text-muted-foreground">{lead.cidade}</td>
                  <td className="p-4"><StatusBadge status={lead.status} /></td>
                  <td className="p-4 text-muted-foreground">{lead.responsavel}</td>
                  <td className="p-4 text-muted-foreground">{lead.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
