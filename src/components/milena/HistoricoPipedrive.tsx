import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Copy, Loader2, CircleAlert, CircleCheck, CircleDot } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { format } from "date-fns";

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
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);
  const [results, setResults] = useState<LeadResult[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState<FilterType>("todos");
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);

  const parseFile = useCallback(async (f: File): Promise<Record<string, any>[]> => {
    const buffer = await f.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
  }, []);

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.match(/\.(csv|xlsx)$/i)) {
      toast.error("Apenas arquivos CSV ou XLSX são aceitos.");
      return;
    }
    setFile(f);
    setLoading(true);
    setResults([]);
    setSummary(null);

    try {
      const rows = await parseFile(f);
      setRawRows(rows);
      setLoadingCount(rows.length);

      // Normalize rows to have nome, empresa, email
      const leads = rows.map(r => ({
        nome: r.nome || r.contato || r.name || r.Nome || r.Contato || r.Name || "",
        empresa: r.empresa || r.company || r.Empresa || r.Company || "",
        email: r.email || r.Email || r["E-mail"] || r["e-mail"] || "",
      }));

      const { data, error } = await supabase.functions.invoke("check-pipedrive-history", {
        body: { leads },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao verificar histórico");

      setResults(data.results);
      setSummary(data.summary);
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
    ? results.filter(r => r.status === "NOVO" || r.status === "POSSIVEL_DUPLICATA")
    : results.filter(r => r.status === filter);

  const visibleResults = defaultFiltered;

  const copyNovos = () => {
    const novos = results.filter(r => r.status === "NOVO");
    const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : ["Nome", "Empresa", "Email"];
    const lines = novos.map(n => {
      const rawRow = rawRows.find(r =>
        (r.nome || r.contato || r.name || r.Nome || r.Contato || r.Name || "") === n.nome ||
        (r.empresa || r.company || r.Empresa || r.Company || "") === n.empresa
      );
      if (rawRow) return headers.map(h => rawRow[h] ?? "").join("\t");
      return [n.nome, n.empresa, n.email].join("\t");
    });
    navigator.clipboard.writeText([headers.join("\t"), ...lines].join("\n"));
    toast.success(`${novos.length} novos leads copiados!`);
  };

  const statusConfig = {
    JA_PROSPECTADO: { label: "Já Prospectado", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: "🔴" },
    POSSIVEL_DUPLICATA: { label: "Possível Duplicata", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: "🟡" },
    NOVO: { label: "Novo Lead", color: "bg-green-500/10 text-green-400 border-green-500/20", icon: "🟢" },
  };

  return (
    <div className="space-y-5">
      {/* Upload */}
      {!loading && !summary && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
          className="glass-card p-8 border-2 border-dashed border-white/10 hover:border-primary/30 transition-colors cursor-pointer text-center"
          onClick={() => document.getElementById("file-input-history")?.click()}>
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-foreground font-medium">Suba sua lista de leads para verificar se já foram prospectados no Pipedrive</p>
          <p className="text-xs text-muted-foreground mt-1">Arraste um CSV ou XLSX aqui ou clique para selecionar</p>
          {file && <p className="text-xs text-primary mt-2 flex items-center justify-center gap-1"><FileSpreadsheet className="w-3 h-3" />{file.name}</p>}
          <input id="file-input-history" type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <button className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
            onClick={(e) => { e.stopPropagation(); document.getElementById("file-input-history")?.click(); }}>
            Selecionar arquivo
          </button>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
          <p className="text-sm text-foreground font-medium">🔍 Comparando {loadingCount} leads com o Pipedrive...</p>
          <p className="text-xs text-muted-foreground mt-1">Buscando todos os deals do pipeline</p>
        </div>
      )}

      {/* Results */}
      {summary && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
              className="glass-card p-4 text-center" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
              <CircleAlert className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(0,84%,60%)" }} />
              <p className="text-2xl font-bold text-foreground">{summary.ja_prospectados}</p>
              <p className="text-xs text-muted-foreground">Já Prospectados</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="glass-card p-4 text-center" style={{ borderColor: "rgba(245,158,11,0.2)" }}>
              <CircleDot className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(38,92%,50%)" }} />
              <p className="text-2xl font-bold text-foreground">{summary.possiveis_duplicatas}</p>
              <p className="text-xs text-muted-foreground">Possíveis Duplicatas</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass-card p-4 text-center" style={{ borderColor: "rgba(34,197,94,0.2)" }}>
              <CircleCheck className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(142,71%,45%)" }} />
              <p className="text-2xl font-bold text-foreground">{summary.novos}</p>
              <p className="text-xs text-muted-foreground">Novos Leads</p>
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

          {/* Upload new */}
          <div className="flex justify-end">
            <button onClick={() => { setFile(null); setSummary(null); setResults([]); }}
              className="text-xs text-primary hover:underline">Enviar outro arquivo</button>
          </div>

          {/* Table */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left p-4 font-medium">Nome</th>
                    <th className="text-left p-4 font-medium">Empresa</th>
                    <th className="text-left p-4 font-medium">Email</th>
                    <th className="text-left p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleResults.map((r, i) => {
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
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
