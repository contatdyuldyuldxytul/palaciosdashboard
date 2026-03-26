import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Copy, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Empresa {
  nome: string;
  classificacao: "QUALIFICADO" | "NAO_QUALIFICADO" | "INCERTO";
  motivo: string;
  rawData?: Record<string, any>;
}

interface Resumo {
  total: number;
  qualificados: number;
  nao_qualificados: number;
  incertos: number;
}

type FilterType = "todos" | "QUALIFICADO" | "INCERTO" | "NAO_QUALIFICADO";

export function RefinamentoDados() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [filter, setFilter] = useState<FilterType>("todos");
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);

  const parseFile = useCallback(async (f: File): Promise<{ text: string; rows: Record<string, any>[] }> => {
    const buffer = await f.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
    const text = rows.map((r, i) => `Linha ${i + 1}: ${Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(", ")}`).join("\n");
    return { text, rows };
  }, []);

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.match(/\.(csv|xlsx)$/i)) {
      toast.error("Apenas arquivos CSV ou XLSX são aceitos.");
      return;
    }
    setFile(f);
    setLoading(true);
    setEmpresas([]);
    setResumo(null);

    try {
      const { text, rows } = await parseFile(f);
      setRawRows(rows);
      setLoadingCount(rows.length);

      const { data, error } = await supabase.functions.invoke("qualify-leads", {
        body: { data: text },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao qualificar leads");

      const result = data.result;
      // Merge raw data with AI results
      const enriched: Empresa[] = (result.empresas || []).map((e: Empresa, i: number) => ({
        ...e,
        rawData: rows[i] || {},
      }));
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

  const filtered = empresas.filter(e => filter === "todos" ? e.classificacao !== "NAO_QUALIFICADO" || filter === "todos" : e.classificacao === filter);
  const defaultFiltered = filter === "todos"
    ? empresas.filter(e => e.classificacao === "QUALIFICADO" || e.classificacao === "INCERTO")
    : empresas.filter(e => e.classificacao === filter);

  const visibleEmpresas = filter === "todos" ? defaultFiltered : filtered;

  const copyToClipboard = (items: Empresa[]) => {
    const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : ["Empresa"];
    const lines = items.map(e => {
      if (e.rawData && Object.keys(e.rawData).length > 0) {
        return headers.map(h => e.rawData?.[h] ?? "").join("\t");
      }
      return e.nome;
    });
    const text = [headers.join("\t"), ...lines].join("\n");
    navigator.clipboard.writeText(text);
    toast.success(`${items.length} empresas copiadas!`);
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
          <p className="text-sm text-foreground font-medium">Arraste um arquivo CSV ou XLSX aqui</p>
          <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
          {file && <p className="text-xs text-primary mt-2 flex items-center justify-center gap-1"><FileSpreadsheet className="w-3 h-3" />{file.name}</p>}
          <input id="file-input-refine" type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
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
          <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
        </div>
      )}

      {/* Results */}
      {resumo && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
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

          {/* Filters + Copy Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: "todos", label: "Todos", icon: null },
              { key: "QUALIFICADO", label: "✅ Qualificados", icon: null },
              { key: "INCERTO", label: "⚠️ Incertos", icon: null },
              { key: "NAO_QUALIFICADO", label: "❌ Não Qualificados", icon: null },
            ] as { key: FilterType; label: string; icon: null }[]).map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {f.label}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <button onClick={() => copyToClipboard(empresas.filter(e => e.classificacao === "QUALIFICADO"))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                <Copy className="w-3 h-3" /> Copiar Qualificados
              </button>
              <button onClick={() => copyToClipboard(visibleEmpresas)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                <Copy className="w-3 h-3" /> Copiar Todos os Filtrados
              </button>
            </div>
          </div>

          {/* Upload new file button */}
          <div className="flex justify-end">
            <button onClick={() => { setFile(null); setResumo(null); setEmpresas([]); }}
              className="text-xs text-primary hover:underline">Enviar outro arquivo</button>
          </div>

          {/* Table */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left p-4 font-medium">Empresa</th>
                    <th className="text-left p-4 font-medium">Classificação</th>
                    <th className="text-left p-4 font-medium">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleEmpresas.map((e, i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-medium text-foreground">{e.nome}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
