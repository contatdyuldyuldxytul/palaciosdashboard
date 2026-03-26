import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Copy, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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

type FilterType = "todos" | "QUALIFICADO" | "INCERTO" | "NAO_QUALIFICADO";

export function RefinamentoDados() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [filter, setFilter] = useState<FilterType>("todos");

  const parseFile = useCallback(async (f: File): Promise<Empresa[]> => {
    const buffer = await f.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    // Parse with header on row 11 (0-indexed range = 10), data from row 12
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { range: 10 });

    // Normalize column names (handle accent variations)
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
    const colData = findCol(sample, ["data autuacao", "data_autuacao", "autuacao"]);

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
        dataAutuacao: colData ? String(r[colData] || "").trim() : "",
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

    try {
      const parsed = await parseFile(f);
      if (parsed.length === 0) {
        toast.error("Nenhuma empresa encontrada. Verifique se a coluna 'Proprietário' existe na linha 11.");
        setLoading(false);
        return;
      }
      setLoadingCount(parsed.length);

      // Send only Proprietário + Descrição to AI
      const dataForAI = parsed.map((p, i) =>
        `${i + 1}. Proprietário: ${p.nome} | Descrição: ${p.descricao}`
      ).join("\n");

      const { data, error } = await supabase.functions.invoke("qualify-leads", {
        body: { data: dataForAI },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao qualificar leads");

      const result = data.result;
      // Merge AI results with parsed data (bairro, endereco)
      const aiEmpresas: any[] = result.empresas || [];
      const enriched: Empresa[] = aiEmpresas.map((ai: any) => {
        // Find matching parsed row by name
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

          {/* Filters + Copy */}
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
                    <th className="text-left p-4 font-medium">Bairro</th>
                    <th className="text-left p-4 font-medium">Tipo de Alvará</th>
                    <th className="text-left p-4 font-medium">Classificação</th>
                    <th className="text-left p-4 font-medium">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleEmpresas.map((e, i) => (
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
