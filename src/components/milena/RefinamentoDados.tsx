import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Copy, Loader2, Plus, Check, Calendar as CalendarIcon } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { writeToSheets } from "@/hooks/useWriteSheets";

interface Empresa {
  nome: string;
  descricao: string;
  bairro: string;
  classificacao: "QUALIFICADO" | "NAO_QUALIFICADO" | "INCERTO";
  motivo: string;
  endereco?: string;
}

interface Resumo {
  total: number;
  qualificados: number;
  nao_qualificados: number;
  incertos: number;
}

interface LeadForm {
  empresa: string;
  contato_nome: string;
  cargo: string;
  telefone: string;
  email: string;
  cidade: string;
  responsavel: string;
  status: string;
  data_descoberta: Date;
  data_ultima_interacao: string;
  data_reuniao: string;
  valor_contrato: string;
  observacoes: string;
  origem_lead: string;
  perdido_motivo: string;
  bairro: string;
  endereco: string;
}

type FilterType = "todos" | "QUALIFICADO" | "INCERTO" | "NAO_QUALIFICADO";

const STATUS_OPTIONS = [
  "Lead", "Contatado", "Reunião Agendada", "Reunião Realizada", "Proposta", "Fechado", "Perdido"
];

function generateLeadId() {
  const now = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return `LEAD${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function createDefaultForm(empresa?: Empresa): LeadForm {
  return {
    empresa: empresa?.nome || "",
    contato_nome: "",
    cargo: "",
    telefone: "",
    email: "",
    cidade: "São Paulo",
    responsavel: "Milena",
    status: "Lead",
    data_descoberta: new Date(),
    data_ultima_interacao: "",
    data_reuniao: "",
    valor_contrato: "",
    observacoes: "",
    origem_lead: "Alvará Prefeitura SP",
    perdido_motivo: "",
    bairro: empresa?.bairro || "",
    endereco: empresa?.endereco || "",
  };
}

function formToSheetRecord(form: LeadForm) {
  return {
    id: generateLeadId(),
    empresa: form.empresa,
    contato_nome: form.contato_nome,
    cargo: form.cargo,
    telefone: form.telefone,
    email: form.email,
    cidade: form.cidade,
    responsavel: form.responsavel,
    status: form.status,
    data_primeiro_contato: format(form.data_descoberta, "yyyy-MM-dd"),
    data_ultima_interacao: form.data_ultima_interacao,
    data_reuniao: form.data_reuniao,
    valor_contrato: form.valor_contrato,
    observacoes: form.observacoes,
    origem_lead: form.origem_lead,
    perdido_motivo: form.perdido_motivo,
  };
}

export function RefinamentoDados() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [filter, setFilter] = useState<FilterType>("todos");
  const [addedLeads, setAddedLeads] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEmpresa, setModalEmpresa] = useState<Empresa | null>(null);
  const [form, setForm] = useState<LeadForm>(createDefaultForm());
  const [saving, setSaving] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const parseFile = useCallback(async (f: File): Promise<Empresa[]> => {
    const buffer = await f.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { range: 10 });
    const normalize = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const findCol = (row: Record<string, any>, candidates: string[]) => {
      for (const key of Object.keys(row)) {
        const norm = normalize(key);
        if (candidates.some(c => norm.includes(c))) return key;
      }
      return null;
    };
    if (rows.length === 0) return [];
    const sample = rows[0];
    const colProprietario = findCol(sample, ["proprietario"]);
    const colDescricao = findCol(sample, ["descricao"]);
    const colBairro = findCol(sample, ["bairro"]);
    const colEndereco = findCol(sample, ["endereco"]);

    return rows
      .filter(r => {
        const prop = colProprietario ? String(r[colProprietario] || "").trim() : "";
        return prop.length > 0;
      })
      .map(r => ({
        nome: colProprietario ? String(r[colProprietario] || "").trim() : "",
        descricao: colDescricao ? String(r[colDescricao] || "").trim() : "",
        bairro: colBairro ? String(r[colBairro] || "").trim() : "",
        endereco: colEndereco ? String(r[colEndereco] || "").trim() : "",
        classificacao: "INCERTO" as const,
        motivo: "",
      }));
  }, []);

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error("Apenas arquivos CSV ou XLSX são aceitos.");
      return;
    }
    setFile(f);
    setLoading(true);
    setEmpresas([]);
    setResumo(null);
    setAddedLeads(new Set());

    try {
      const parsed = await parseFile(f);
      if (parsed.length === 0) {
        toast.error("Nenhuma empresa encontrada. Verifique se a coluna 'Proprietário' existe na linha 11.");
        setLoading(false);
        return;
      }
      setLoadingCount(parsed.length);

      const dataForAI = parsed.map((p, i) =>
        `${i + 1}. Proprietário: ${p.nome} | Descrição: ${p.descricao}`
      ).join("\n");

      const { data, error } = await supabase.functions.invoke("qualify-leads", {
        body: { data: dataForAI },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao qualificar leads");

      const result = data.result;
      const aiEmpresas: any[] = result.empresas || [];
      const enriched: Empresa[] = aiEmpresas.map((ai: any) => {
        const match = parsed.find(p =>
          p.nome.toLowerCase().includes(ai.nome?.toLowerCase()) ||
          ai.nome?.toLowerCase().includes(p.nome.toLowerCase())
        );
        return {
          nome: ai.nome || "",
          descricao: ai.descricao || match?.descricao || "",
          bairro: ai.bairro || match?.bairro || "",
          endereco: match?.endereco || "",
          classificacao: ai.classificacao || "INCERTO",
          motivo: ai.motivo || "",
        };
      });

      setEmpresas(enriched);
      setResumo(result.resumo);
      setFilter("todos");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao processar arquivo");
    } finally {
      setLoading(false);
    }
  }, [parseFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const defaultFiltered = filter === "todos"
    ? empresas.filter(e => e.classificacao === "QUALIFICADO" || e.classificacao === "INCERTO")
    : empresas.filter(e => e.classificacao === filter);

  const visibleEmpresas = defaultFiltered;

  const copyQualificados = () => {
    const quals = empresas.filter(e => e.classificacao === "QUALIFICADO");
    const header = "Nome da Empresa\tBairro\tEndereço\tTipo de Alvará";
    const lines = quals.map(e => `${e.nome}\t${e.bairro}\t${e.endereco || ""}\t${e.descricao}`);
    navigator.clipboard.writeText([header, ...lines].join("\n"));
    toast.success(`${quals.length} empresas qualificadas copiadas!`);
  };

  const copyFiltered = () => {
    const header = "Nome da Empresa\tBairro\tEndereço\tTipo de Alvará\tClassificação\tMotivo";
    const lines = visibleEmpresas.map(e =>
      `${e.nome}\t${e.bairro}\t${e.endereco || ""}\t${e.descricao}\t${e.classificacao}\t${e.motivo}`
    );
    navigator.clipboard.writeText([header, ...lines].join("\n"));
    toast.success(`${visibleEmpresas.length} empresas copiadas!`);
  };

  // Open modal for a specific empresa
  const openAddModal = (empresa: Empresa) => {
    setModalEmpresa(empresa);
    setForm(createDefaultForm(empresa));
    setModalOpen(true);
  };

  const updateForm = (field: keyof LeadForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Save single lead to Google Sheets
  const saveLead = async () => {
    setSaving(true);
    try {
      const record = formToSheetRecord(form);
      await writeToSheets({
        tab: "leads",
        action: "append",
        record,
      });
      toast.success("✅ Lead adicionado ao Google Sheets!");
      setAddedLeads(prev => new Set(prev).add(modalEmpresa?.nome || ""));
      setModalOpen(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Bulk add all qualificados
  const qualificadosNotAdded = empresas.filter(
    e => e.classificacao === "QUALIFICADO" && !addedLeads.has(e.nome)
  );

  const bulkAdd = async () => {
    setBulkConfirmOpen(false);
    setBulkSaving(true);
    const toAdd = qualificadosNotAdded;
    setBulkProgress({ current: 0, total: toAdd.length });

    try {
      for (let i = 0; i < toAdd.length; i++) {
        const empresa = toAdd[i];
        const record = formToSheetRecord({
          ...createDefaultForm(empresa),
          data_descoberta: new Date(),
        });
        await writeToSheets({
          tab: "leads",
          action: "append",
          record,
        });
        setBulkProgress({ current: i + 1, total: toAdd.length });
        setAddedLeads(prev => new Set(prev).add(empresa.nome));
      }
      toast.success(`✅ ${toAdd.length} leads adicionados ao Google Sheets com sucesso!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao adicionar leads. ${bulkProgress.current} de ${bulkProgress.total} foram adicionados.`);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Upload */}
      {!loading && !resumo && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
          className="glass-card p-8 border-2 border-dashed border-white/10 hover:border-primary/30 transition-colors cursor-pointer text-center"
          onClick={() => document.getElementById("file-input-refine")?.click()}>
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-foreground font-medium">Suba o relatório de alvarás da Prefeitura (XLSX)</p>
          <p className="text-xs text-muted-foreground mt-1">Headers na linha 11 · Coluna "Proprietário" será analisada</p>
          {file && <p className="text-xs text-primary mt-2 flex items-center justify-center gap-1"><FileSpreadsheet className="w-3 h-3" />{file.name}</p>}
          <input id="file-input-refine" type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <button className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
            onClick={(e) => { e.stopPropagation(); document.getElementById("file-input-refine")?.click(); }}>
            Selecionar arquivo
          </button>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
          <p className="text-sm text-foreground font-medium">🔍 Analisando {loadingCount} empresas...</p>
          <p className="text-xs text-muted-foreground mt-1">Classificando pelo ICP da Palacios 3D Studio</p>
        </div>
      )}

      {/* Bulk saving progress */}
      {bulkSaving && (
        <div className="glass-card p-6 text-center">
          <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-primary" />
          <p className="text-sm text-foreground font-medium">
            Adicionando {bulkProgress.current} de {bulkProgress.total} leads...
          </p>
        </div>
      )}

      {/* Results */}
      {resumo && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 text-center" style={{ borderColor: "rgba(34,197,94,0.2)" }}>
              <CheckCircle2 className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(142,71%,45%)" }} />
              <p className="text-2xl font-bold text-foreground">{resumo.qualificados}</p>
              <p className="text-xs text-muted-foreground">Qualificados</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="glass-card p-4 text-center" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
              <XCircle className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(0,84%,60%)" }} />
              <p className="text-2xl font-bold text-foreground">{resumo.nao_qualificados}</p>
              <p className="text-xs text-muted-foreground">Não Qualificados</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass-card p-4 text-center" style={{ borderColor: "rgba(245,158,11,0.2)" }}>
              <AlertTriangle className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(38,92%,50%)" }} />
              <p className="text-2xl font-bold text-foreground">{resumo.incertos}</p>
              <p className="text-xs text-muted-foreground">Incertos</p>
            </motion.div>
          </div>

          {/* Filters + Copy + Bulk Add */}
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: "todos", label: "Todos" },
              { key: "QUALIFICADO", label: "✅ Qualificados" },
              { key: "INCERTO", label: "⚠️ Incertos" },
              { key: "NAO_QUALIFICADO", label: "❌ Não Qualificados" },
            ] as { key: FilterType; label: string }[]).map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {f.label}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              {qualificadosNotAdded.length > 0 && (
                <button onClick={() => setBulkConfirmOpen(true)}
                  disabled={bulkSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-xs font-medium text-green-400 border border-green-500/20 hover:bg-green-500/30 transition-all disabled:opacity-50">
                  <Plus className="w-3 h-3" /> Adicionar Todos Qualificados ({qualificadosNotAdded.length})
                </button>
              )}
              <button onClick={copyQualificados}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                <Copy className="w-3 h-3" /> Copiar Qualificados
              </button>
              <button onClick={copyFiltered}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                <Copy className="w-3 h-3" /> Copiar Filtrados
              </button>
            </div>
          </div>

          {/* Upload new */}
          <div className="flex justify-end">
            <button onClick={() => { setFile(null); setResumo(null); setEmpresas([]); setAddedLeads(new Set()); }}
              className="text-xs text-primary hover:underline">Enviar outro arquivo</button>
          </div>

          {/* Table */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left p-4 font-medium">Empresa</th>
                    <th className="text-left p-4 font-medium">Bairro</th>
                    <th className="text-left p-4 font-medium">Tipo de Alvará</th>
                    <th className="text-left p-4 font-medium">Classificação</th>
                    <th className="text-left p-4 font-medium">Motivo</th>
                    <th className="text-right p-4 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleEmpresas.map((e, i) => {
                    const isAdded = addedLeads.has(e.nome);
                    const canAdd = e.classificacao === "QUALIFICADO" || e.classificacao === "INCERTO";
                    return (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-medium text-foreground">{e.nome}</td>
                        <td className="p-4 text-muted-foreground">{e.bairro}</td>
                        <td className="p-4 text-muted-foreground text-xs">{e.descricao}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            e.classificacao === "QUALIFICADO" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                            e.classificacao === "INCERTO" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}>
                            {e.classificacao === "QUALIFICADO" ? "✅" : e.classificacao === "INCERTO" ? "⚠️" : "❌"}
                            {e.classificacao === "QUALIFICADO" ? "Qualificado" : e.classificacao === "INCERTO" ? "Incerto" : "Não Qualificado"}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs">{e.motivo}</td>
                        <td className="p-4 text-right">
                          {canAdd && (
                            isAdded ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium">
                                <Check className="w-3 h-3" /> Adicionado
                              </span>
                            ) : (
                              <button onClick={() => openAddModal(e)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-all">
                                <Plus className="w-3 h-3" /> Adicionar Lead
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}

      {/* Add Lead Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-background border-border max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Lead — {modalEmpresa?.nome}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Pre-filled fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Empresa</Label>
                <Input value={form.empresa} onChange={e => updateForm("empresa", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Origem</Label>
                <Input value={form.origem_lead} onChange={e => updateForm("origem_lead", e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Bairro</Label>
                <Input value={form.bairro} onChange={e => updateForm("bairro", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Endereço</Label>
                <Input value={form.endereco} onChange={e => updateForm("endereco", e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="border-t border-border my-1" />

            {/* Contact fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Nome do Contato</Label>
                <Input value={form.contato_nome} onChange={e => updateForm("contato_nome", e.target.value)} className="mt-1" placeholder="Nome completo" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cargo</Label>
                <Input value={form.cargo} onChange={e => updateForm("cargo", e.target.value)} className="mt-1" placeholder="Diretor, Gerente..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <Input value={form.telefone} onChange={e => updateForm("telefone", e.target.value)} className="mt-1" placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value={form.email} onChange={e => updateForm("email", e.target.value)} className="mt-1" placeholder="email@empresa.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Cidade</Label>
                <Input value={form.cidade} onChange={e => updateForm("cidade", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Responsável</Label>
                <Input value={form.responsavel} onChange={e => updateForm("responsavel", e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select value={form.status} onChange={e => updateForm("status", e.target.value)}
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Valor Contrato (R$)</Label>
                <Input type="number" value={form.valor_contrato} onChange={e => updateForm("valor_contrato", e.target.value)} className="mt-1" placeholder="0" />
              </div>
            </div>

            {/* Date fields */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Data Descoberta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn("mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-left flex items-center gap-2",
                      !form.data_descoberta && "text-muted-foreground")}>
                      <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      {format(form.data_descoberta, "dd/MM/yyyy")}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.data_descoberta} onSelect={d => d && updateForm("data_descoberta", d)}
                      className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Última Interação</Label>
                <Input type="date" value={form.data_ultima_interacao} onChange={e => updateForm("data_ultima_interacao", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data Reunião</Label>
                <Input type="date" value={form.data_reuniao} onChange={e => updateForm("data_reuniao", e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Observações</Label>
              <textarea value={form.observacoes} onChange={e => updateForm("observacoes", e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[60px] resize-none"
                placeholder="Notas sobre o lead..." />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Motivo de Perda</Label>
              <Input value={form.perdido_motivo} onChange={e => updateForm("perdido_motivo", e.target.value)} className="mt-1" placeholder="Se aplicável" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
              Cancelar
            </button>
            <button onClick={saveLead} disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar no Google Sheets
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Confirm Dialog */}
      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="bg-background border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar {qualificadosNotAdded.length} leads qualificados?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Eles aparecerão no dashboard em até 5 minutos.
            Apenas empresa, bairro, endereço e origem serão preenchidos.
            Campos de contato ficarão em branco para preenchimento posterior.
          </p>
          <DialogFooter>
            <button onClick={() => setBulkConfirmOpen(false)}
              className="px-4 py-2 rounded-lg bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
              Cancelar
            </button>
            <button onClick={bulkAdd}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all">
              Confirmar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
