import { useMemo, useState } from "react";
import { Search, Users, Mail, Trash2, X, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useContatos, type Contato, type ContatoStatus } from "@/hooks/useContatos";
import { ContactStatusBadge, STATUS_OPTIONS } from "@/components/crm/contatos/ContactStatusBadge";
import { ContactDetailSheet } from "@/components/crm/contatos/ContactDetailSheet";
import { Composer } from "@/components/crm/email/Composer";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Contatos() {
  const { data: contatos = [], isLoading } = useContatos();
  const qc = useQueryClient();
  const { isFundador } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [empresaFilter, setEmpresaFilter] = useState<string>("all");
  const [cargoFilter, setCargoFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Contato | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerTo, setComposerTo] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const selectedContatos = useMemo(
    () => contatos.filter((c) => selectedIds.has(c.id)),
    [contatos, selectedIds],
  );
  const visibleAllSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const visibleSomeSelected = filtered.some((c) => selectedIds.has(c.id));

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (visibleAllSelected) filtered.forEach((c) => next.delete(c.id));
      else filtered.forEach((c) => next.add(c.id));
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkEmail = () => {
    const emails = Array.from(
      new Set(selectedContatos.map((c) => c.email?.trim()).filter(Boolean) as string[]),
    );
    if (emails.length === 0) {
      toast.error("Nenhum dos contatos selecionados tem e-mail");
      return;
    }
    const ignored = selectedContatos.length - emails.length;
    if (ignored > 0) toast.info(`${ignored} contato(s) sem e-mail foram ignorados`);
    setComposerTo(emails.join(", "));
    setComposerOpen(true);
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const personIds = selectedContatos.filter((c) => !c.id.startsWith("cliente-")).map((c) => c.id);
      const clienteIds = selectedContatos
        .filter((c) => c.id.startsWith("cliente-"))
        .map((c) => c.id.replace("cliente-", ""));

      if (personIds.length > 0) {
        const { error } = await supabase.from("crm_persons").delete().in("id", personIds);
        if (error) throw error;
      }
      if (clienteIds.length > 0) {
        const { error } = await supabase.from("clientes_ativos").delete().in("id", clienteIds);
        if (error) throw error;
      }
      toast.success(`${selectedContatos.length} contato(s) excluído(s)`);
      clearSelection();
      qc.invalidateQueries({ queryKey: ["contatos"] });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao excluir");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleExportCsv = () => {
    const rows = selectedContatos.length > 0 ? selectedContatos : filtered;
    const header = ["Nome", "Empresa", "Cargo", "Telefone", "E-mail", "Status"];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [r.nome, r.empresa || "", r.cargo || "", r.telefone || "", r.email || "", r.status]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contatos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

      {selectedIds.size > 0 && (
        <div className="glass-card rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 border border-primary/30">
          <div className="text-sm font-medium text-foreground">
            {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
          </div>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={handleBulkEmail} className="h-8">
            <Mail className="w-3.5 h-3.5 mr-1.5" /> Enviar e-mail
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCsv} className="h-8">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar CSV
          </Button>
          {isFundador && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              className="h-8 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Excluir
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={clearSelection} className="h-8">
            <X className="w-3.5 h-3.5 mr-1.5" /> Limpar
          </Button>
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="grid grid-cols-[auto_1.5fr_1.3fr_1fr_1fr_1.4fr_auto] gap-3 px-4 py-2.5 border-b border-white/10 text-[10px] uppercase tracking-wider text-muted-foreground items-center">
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={visibleAllSelected ? true : visibleSomeSelected ? "indeterminate" : false}
              onCheckedChange={toggleAllVisible}
              aria-label="Selecionar todos"
            />
          </div>
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
            {filtered.map((c) => {
              const checked = selectedIds.has(c.id);
              return (
                <div
                  key={c.id}
                  className={`grid grid-cols-[auto_1.5fr_1.3fr_1fr_1fr_1.4fr_auto] gap-3 px-4 py-2.5 items-center text-sm hover:bg-white/[0.04] transition-colors ${
                    checked ? "bg-primary/5" : ""
                  }`}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleOne(c.id)}
                      aria-label={`Selecionar ${c.nome}`}
                    />
                  </div>
                  <button onClick={() => setSelected(c)} className="text-left font-medium text-foreground truncate">
                    {c.nome}
                  </button>
                  <button onClick={() => setSelected(c)} className="text-left text-muted-foreground truncate">
                    {c.empresa || "—"}
                  </button>
                  <button onClick={() => setSelected(c)} className="text-left text-muted-foreground truncate">
                    {c.cargo || "—"}
                  </button>
                  <button onClick={() => setSelected(c)} className="text-left text-muted-foreground truncate">
                    {c.telefone || "—"}
                  </button>
                  <button onClick={() => setSelected(c)} className="text-left text-muted-foreground truncate">
                    {c.email || "—"}
                  </button>
                  <button onClick={() => setSelected(c)} className="text-left">
                    <ContactStatusBadge status={c.status} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ContactDetailSheet contato={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />

      <Composer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        initialTo={composerTo}
        variant="modal"
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} contato(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e não pode ser desfeita. Negócios associados poderão perder a referência ao
              contato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
