import { useState, useEffect, useCallback } from "react";
import { Search, Copy, Loader2, CircleAlert, CircleCheck, CircleDot, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface SheetLead {
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  _raw: string[];
}

interface LeadResult {
  nome: string;
  empresa: string;
  email: string;
  status: "JA_PROSPECTADO" | "POSSIVEL_DUPLICATA" | "NOVO";
  pipedrive_info: {
    added: string;
    stage: string;
    deal_status: string;
  } | null;
}

interface Summary {
  total: number;
  ja_prospectados: number;
  possiveis_duplicatas: number;
  novos: number;
}

type FilterType = "todos" | "NOVO" | "POSSIVEL_DUPLICATA" | "JA_PROSPECTADO";

export function HistoricoPipedrive() {
  const [leads, setLeads] = useState<SheetLead[]>([]);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [results, setResults] = useState<LeadResult[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState<FilterType>("todos");

  const fetchLeads = useCallback(async () => {
    setLoadingSheets(true);
    try {
      const { data, error } = await supabase.functions.invoke("milena-leads-sheets");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao buscar leads");
      setLeads(data.leads || []);
      setSheetHeaders(data.headers || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao buscar leads do Google Sheets");
    } finally {
      setLoadingSheets(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const analyzeInPipedrive = useCallback(async () => {
    if (leads.length === 0) return;
    setLoadingAnalysis(true);
    setResults([]);
    setSummary(null);

    try {
      const leadsToCheck = leads.map(l => ({
        nome: l.nome,
        empresa: l.empresa,
        email: l.email,
      }));

      const { data, error } = await supabase.functions.invoke("check-pipedrive-history", {
        body: { leads: leadsToCheck },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao verificar histórico");

      setResults(data.results);
      setSummary(data.summary);
      setFilter("todos");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao analisar no Pipedrive");
    } finally {
      setLoadingAnalysis(false);
    }
  }, [leads]);

  const filteredResults = summary
    ? filter === "todos"
      ? results.filter(r => r.status === "NOVO" || r.status === "POSSIVEL_DUPLICATA")
      : results.filter(r => r.status === filter)
    : [];

  const copyNovos = () => {
    const novos = results.filter(r => r.status === "NOVO");
    const lines = novos.map(n => {
      const lead = leads.find(l => l.nome === n.nome || l.empresa === n.empresa);
      if (lead) return lead._raw.join("\t");
      return [n.nome, n.empresa, n.email].join("\t");
    });
    const header = sheetHeaders.length > 0 ? sheetHeaders.join("\t") : "Nome\tEmpresa\tEmail";
    navigator.clipboard.writeText([header, ...lines].join("\n"));
    toast.success(`${novos.length} novos leads copiados!`);
  };

  const statusConfig = {
    JA_PROSPECTADO: { label: "Já Prospectado", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: "🔴" },
    POSSIVEL_DUPLICATA: { label: "Possível Duplicata", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: "🟡" },
    NOVO: { label: "Novo Lead", color: "bg-green-500/10 text-green-400 border-green-500/20", icon: "🟢" },
  };

  return (
    <div className="space-y-5">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {loadingSheets ? "Carregando leads..." : `${leads.length} leads da Milena com status "Lead" no Google Sheets`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchLeads} disabled={loadingSheets}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
            <RefreshCw className={`w-3 h-3 ${loadingSheets ? "animate-spin" : ""}`} /> Atualizar
          </button>
          <button onClick={analyzeInPipedrive} disabled={loadingAnalysis || loadingSheets || leads.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50">
            {loadingAnalysis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loadingAnalysis ? `Comparando ${leads.length} leads...` : "🔍 Analisar no Pipedrive"}
          </button>
        </div>
      </div>

      {/* Loading sheets */}
      {loadingSheets && (
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
          <p className="text-sm text-foreground font-medium">Buscando leads do Google Sheets...</p>
        </div>
      )}

      {/* Loading analysis */}
      {loadingAnalysis && (
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
          <p className="text-sm text-foreground font-medium">🔍 Comparando {leads.length} leads com o Pipedrive...</p>
          <p className="text-xs text-muted-foreground mt-1">Buscando todos os deals do pipeline</p>
        </div>
      )}

      {/* Summary Cards */}
      {summary && !loadingAnalysis && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 text-center" style={{ borderColor: "rgba(34,197,94,0.2)" }}>
              <CircleCheck className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(142,71%,45%)" }} />
              <p className="text-2xl font-bold text-foreground">{summary.novos}</p>
              <p className="text-xs text-muted-foreground">Novos Leads</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="glass-card p-4 text-center" style={{ borderColor: "rgba(245,158,11,0.2)" }}>
              <CircleDot className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(38,92%,50%)" }} />
              <p className="text-2xl font-bold text-foreground">{summary.possiveis_duplicatas}</p>
              <p className="text-xs text-muted-foreground">Possíveis Duplicatas</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass-card p-4 text-center" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
              <CircleAlert className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(0,84%,60%)" }} />
              <p className="text-2xl font-bold text-foreground">{summary.ja_prospectados}</p>
              <p className="text-xs text-muted-foreground">Já Prospectados</p>
            </motion.div>
          </div>

          {/* Filters + Copy */}
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: "todos", label: "Todos" },
              { key: "NOVO", label: "🟢 Novos" },
              { key: "POSSIVEL_DUPLICATA", label: "🟡 Duplicatas" },
              { key: "JA_PROSPECTADO", label: "🔴 Prospectados" },
            ] as { key: FilterType; label: string }[]).map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {f.label}
              </button>
            ))}
            <div className="ml-auto">
              <button onClick={copyNovos}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                <Copy className="w-3 h-3" /> Copiar Novos Leads
              </button>
            </div>
          </div>
        </>
      )}

      {/* Leads Table (before or after analysis) */}
      {!loadingSheets && !loadingAnalysis && leads.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left p-4 font-medium">Nome</th>
                  <th className="text-left p-4 font-medium">Empresa</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">{summary ? "Status Pipedrive" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary ? (
                  filteredResults.map((r, i) => {
                    const cfg = statusConfig[r.status];
                    return (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-medium text-foreground">{r.nome}</td>
                        <td className="p-4 text-muted-foreground">{r.empresa}</td>
                        <td className="p-4 text-muted-foreground text-xs">{r.email}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                          {r.pipedrive_info && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Adicionado em {format(new Date(r.pipedrive_info.added), "dd/MM/yyyy")} · {r.pipedrive_info.stage}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  leads.map((l, i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-medium text-foreground">{l.nome || "—"}</td>
                      <td className="p-4 text-muted-foreground">{l.empresa || "—"}</td>
                      <td className="p-4 text-muted-foreground text-xs">{l.email || "—"}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-muted/30 text-muted-foreground border-border">
                          Lead
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!loadingSheets && leads.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum lead encontrado para Milena com status "Lead"</p>
        </div>
      )}
    </div>
  );
}
