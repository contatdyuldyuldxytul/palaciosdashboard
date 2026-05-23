import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContatos, type Contato, type ContatoStatus } from "@/hooks/useContatos";
import { ContactStatusBadge, STATUS_OPTIONS } from "@/components/crm/contatos/ContactStatusBadge";
import { ContactDetailSheet } from "@/components/crm/contatos/ContactDetailSheet";

export default function Contatos() {
  const { data: contatos = [], isLoading } = useContatos();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [empresaFilter, setEmpresaFilter] = useState<string>("all");
  const [cargoFilter, setCargoFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Contato | null>(null);

  const empresas = useMemo(
    () => Array.from(new Set(contatos.map((c) => c.empresa).filter(Boolean))).sort() as string[],
    [contatos],
  );
  const cargos = useMemo(
    () => Array.from(new Set(contatos.map((c) => c.cargo).filter(Boolean))).sort() as string[],
    [contatos],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contatos.filter((c) => {
      if (statusFilter !== "all" && c.status !== (statusFilter as ContatoStatus)) return false;
      if (empresaFilter !== "all" && c.empresa !== empresaFilter) return false;
      if (cargoFilter !== "all" && c.cargo !== cargoFilter) return false;
      if (!q) return true;
      return (
        c.nome.toLowerCase().includes(q) ||
        c.empresa?.toLowerCase().includes(q) ||
        c.cargo?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.telefone?.toLowerCase().includes(q)
      );
    });
  }, [contatos, search, statusFilter, empresaFilter, cargoFilter]);

  const counts = useMemo(() => {
    const c: Record<ContatoStatus, number> = { cliente_ativo: 0, ex_cliente: 0, lead: 0, frio: 0 };
    for (const x of contatos) c[x.status] += 1;
    return c;
  }, [contatos]);

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-5">
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Contatos
          </h1>
          <p className="text-[11px] text-muted-foreground mt-1">
            {contatos.length} contatos · {counts.cliente_ativo} ativos · {counts.ex_cliente} ex-clientes ·{" "}
            {counts.lead} leads · {counts.frio} frios
          </p>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa, cargo, email ou telefone…"
            className="h-9 pl-9 bg-white/5 border-white/10 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Status"
          options={[
            { value: "all", label: "Todos os status" },
            ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
          ]}
        />
        <FilterSelect
          value={empresaFilter}
          onChange={setEmpresaFilter}
          placeholder="Empresa"
          options={[{ value: "all", label: "Todas as empresas" }, ...empresas.map((e) => ({ value: e, label: e }))]}
        />
        <FilterSelect
          value={cargoFilter}
          onChange={setCargoFilter}
          placeholder="Cargo"
          options={[{ value: "all", label: "Todos os cargos" }, ...cargos.map((c) => ({ value: c, label: c }))]}
        />
        {(statusFilter !== "all" || empresaFilter !== "all" || cargoFilter !== "all" || search) && (
          <button
            onClick={() => {
              setStatusFilter("all");
              setEmpresaFilter("all");
              setCargoFilter("all");
              setSearch("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground px-2 self-center"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1.3fr_1fr_1fr_1.4fr_auto] gap-3 px-4 py-2.5 border-b border-white/10 text-[10px] uppercase tracking-wider text-muted-foreground">
          <div>Nome</div>
          <div>Empresa</div>
          <div>Cargo</div>
          <div>Telefone</div>
          <div>E-mail</div>
          <div>Status</div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhum contato encontrado.</div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[calc(100vh-280px)] overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full grid grid-cols-[1.5fr_1.3fr_1fr_1fr_1.4fr_auto] gap-3 px-4 py-2.5 items-center text-left text-sm hover:bg-white/[0.04] transition-colors"
              >
                <div className="font-medium text-foreground truncate">{c.nome}</div>
                <div className="text-muted-foreground truncate">{c.empresa || "—"}</div>
                <div className="text-muted-foreground truncate">{c.cargo || "—"}</div>
                <div className="text-muted-foreground truncate">{c.telefone || "—"}</div>
                <div className="text-muted-foreground truncate">{c.email || "—"}</div>
                <div>
                  <ContactStatusBadge status={c.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <ContactDetailSheet contato={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-auto min-w-[160px] bg-white/5 border-white/10 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-background border-white/10 max-h-80">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
