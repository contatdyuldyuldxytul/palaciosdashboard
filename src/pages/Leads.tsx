import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useLeads, useAddLead, useUpdateLead, getStatusDisplay, LeadStatus } from "@/hooks/useLeads";
import { format } from "date-fns";

const statusOptions: Array<"Todos" | LeadStatus> = ["Todos", "lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado", "perdido"];

const statusDisplayForFilter: Record<string, string> = {
  Todos: "Todos",
  lead: "Lead",
  contatado: "Contatado",
  reuniao_agendada: "Reunião Agendada",
  reuniao_realizada: "Reunião Realizada",
  proposta: "Proposta",
  fechado: "Fechado",
  perdido: "Perdido",
};

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [showForm, setShowForm] = useState(false);
  const [newLead, setNewLead] = useState({ empresa: "", contato: "", cargo: "", cidade: "", telefone: "", email: "" });

  const { data: leads = [], isLoading } = useLeads();
  const addLead = useAddLead();
  const updateLead = useUpdateLead();

  const filtered = leads.filter((l) => {
    const matchSearch = l.empresa.toLowerCase().includes(search.toLowerCase()) ||
      (l.contato || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Todos" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAddLead = () => {
    if (!newLead.empresa) return;
    addLead.mutate({
      empresa: newLead.empresa,
      contato: newLead.contato || null,
      cargo: newLead.cargo || null,
      cidade: newLead.cidade || null,
      telefone: newLead.telefone || null,
      email: newLead.email || null,
      status: "lead",
    });
    setNewLead({ empresa: "", contato: "", cargo: "", cidade: "", telefone: "", email: "" });
    setShowForm(false);
  };

  const handleStatusChange = (id: string, status: LeadStatus) => {
    updateLead.mutate({ id, status });
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Meus Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} leads encontrados</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all"
        >
          <Plus className="w-4 h-4" />
          Adicionar Lead
        </button>
      </div>

      {/* Add Lead Form */}
      {showForm && (
        <div className="glass-card p-4 space-y-3 animate-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: "empresa", label: "Empresa *", placeholder: "Nome da empresa" },
              { key: "contato", label: "Contato", placeholder: "Nome do contato" },
              { key: "cargo", label: "Cargo", placeholder: "Cargo" },
              { key: "cidade", label: "Cidade", placeholder: "Cidade" },
              { key: "telefone", label: "Telefone", placeholder: "(11) 99999-0000" },
              { key: "email", label: "E-mail", placeholder: "email@empresa.com" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">{field.label}</label>
                <input
                  type="text"
                  value={newLead[field.key as keyof typeof newLead]}
                  onChange={(e) => setNewLead({ ...newLead, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full h-9 px-3 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button onClick={handleAddLead} disabled={addLead.isPending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50">
              {addLead.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

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
              {statusDisplayForFilter[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden animate-slide-up">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-sm">Nenhum lead encontrado</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-primary hover:underline">
              Adicionar primeiro lead
            </button>
          </div>
        ) : (
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
                  <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-foreground">{lead.empresa}</p>
                      <p className="text-xs text-muted-foreground">{lead.cargo}</p>
                    </td>
                    <td className="p-4 text-muted-foreground">{lead.contato}</td>
                    <td className="p-4 text-muted-foreground">{lead.cidade}</td>
                    <td className="p-4">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                        className="bg-transparent text-xs border-0 focus:outline-none cursor-pointer"
                      >
                        {(["lead", "contatado", "reuniao_agendada", "reuniao_realizada", "proposta", "fechado", "perdido"] as LeadStatus[]).map((s) => (
                          <option key={s} value={s} className="bg-card text-foreground">{getStatusDisplay(s)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-muted-foreground">{lead.responsavel_nome || "—"}</td>
                    <td className="p-4 text-muted-foreground">
                      {format(new Date(lead.data_criacao), "dd/MM/yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
