import { useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";
import { useImportCrmCsv, CrmStage } from "@/hooks/useCrm";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineId: string;
  stages: CrmStage[];
}

type FieldKey = "titulo" | "valor" | "empresa" | "contato" | "email" | "telefone" | "owner" | "stage_nome";

const FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
  { key: "titulo", label: "Título", required: true },
  { key: "valor", label: "Valor" },
  { key: "empresa", label: "Empresa" },
  { key: "contato", label: "Contato" },
  { key: "email", label: "E-mail" },
  { key: "telefone", label: "Telefone" },
  { key: "owner", label: "Responsável" },
  { key: "stage_nome", label: "Etapa" },
];

// Heuristic to auto-map columns based on header name
const autoMap = (header: string): FieldKey | "" => {
  const h = header.toLowerCase().trim();
  if (h.includes("titulo") || h.includes("title") || h.includes("deal")) return "titulo";
  if (h.includes("valor") || h.includes("value") || h.includes("amount") || h === "r$") return "valor";
  if (h.includes("empresa") || h.includes("organiz") || h.includes("company")) return "empresa";
  if (h.includes("contato") || h.includes("nome") || h.includes("name") || h.includes("pessoa")) return "contato";
  if (h.includes("email") || h.includes("e-mail")) return "email";
  if (h.includes("tel") || h.includes("phone") || h.includes("celular")) return "telefone";
  if (h.includes("respons") || h.includes("owner") || h.includes("vendedor")) return "owner";
  if (h.includes("etapa") || h.includes("stage") || h.includes("status") || h.includes("fase")) return "stage_nome";
  return "";
};

export function ImportCsvModal({ open, onOpenChange, pipelineId, stages }: Props) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({} as any);
  const [defaultStage, setDefaultStage] = useState<string>("");
  const importer = useImportCrmCsv();

  const reset = () => { setHeaders([]); setRows([]); setMapping({} as any); setDefaultStage(""); };

  const handleFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const h = res.meta.fields || [];
        setHeaders(h);
        setRows(res.data as any[]);
        const m = {} as Record<FieldKey, string>;
        h.forEach((header) => {
          const f = autoMap(header);
          if (f && !m[f]) m[f] = header;
        });
        setMapping(m);
        if (!defaultStage && stages.length) setDefaultStage(stages[0].id);
      },
      error: (err) => toast({ title: "Erro ao ler CSV", description: err.message, variant: "destructive" }),
    });
  };

  const submit = async () => {
    if (!mapping.titulo) {
      toast({ title: "Mapeie pelo menos o Título", variant: "destructive" });
      return;
    }
    if (!defaultStage) {
      toast({ title: "Selecione a etapa padrão", variant: "destructive" });
      return;
    }
    const mapped = rows.map((r) => ({
      titulo: String(r[mapping.titulo] || "").trim(),
      valor: mapping.valor ? parseFloat(String(r[mapping.valor] || "0").replace(/[^\d,.-]/g, "").replace(",", ".")) || 0 : 0,
      empresa: mapping.empresa ? String(r[mapping.empresa] || "").trim() : undefined,
      contato: mapping.contato ? String(r[mapping.contato] || "").trim() : undefined,
      email: mapping.email ? String(r[mapping.email] || "").trim() : undefined,
      telefone: mapping.telefone ? String(r[mapping.telefone] || "").trim() : undefined,
      owner: mapping.owner ? String(r[mapping.owner] || "").trim() : undefined,
      stage_nome: mapping.stage_nome ? String(r[mapping.stage_nome] || "").trim() : undefined,
    }));
    try {
      const res = await importer.mutateAsync({
        pipeline_id: pipelineId,
        default_stage_id: defaultStage,
        rows: mapped,
        stages,
      });
      toast({ title: "Importação concluída", description: `${res.imported} de ${res.total} deals importados` });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="bg-background border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Importar CSV</DialogTitle>
        </DialogHeader>

        {headers.length === 0 ? (
          <label className="block border-2 border-dashed border-white/15 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm text-foreground font-medium">Clique para selecionar um CSV</div>
            <div className="text-xs text-muted-foreground mt-1">A primeira linha deve conter os cabeçalhos</div>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              {rows.length} linhas detectadas • {headers.length} colunas
            </div>

            <div>
              <Label>Etapa padrão *</Label>
              <Select value={defaultStage} onValueChange={setDefaultStage}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Usada quando a coluna "Etapa" não corresponder a nenhuma etapa do pipeline.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Mapeamento de colunas</Label>
              {FIELDS.map((f) => (
                <div key={f.key} className="grid grid-cols-[140px_1fr] gap-2 items-center">
                  <span className="text-xs text-muted-foreground">
                    {f.label}{f.required && " *"}
                  </span>
                  <Select value={mapping[f.key] || "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Ignorar —</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-white/10 overflow-hidden">
              <div className="text-[10px] text-muted-foreground px-2 py-1 bg-white/5">Preview (3 primeiras linhas)</div>
              <div className="overflow-x-auto max-h-32">
                <table className="text-[10px] w-full">
                  <thead>
                    <tr className="bg-white/5">
                      {headers.map((h) => <th key={h} className="px-2 py-1 text-left font-medium text-muted-foreground">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((r, i) => (
                      <tr key={i} className="border-t border-white/5">
                        {headers.map((h) => <td key={h} className="px-2 py-1 text-foreground">{String(r[h] || "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {headers.length > 0 && (
            <Button onClick={submit} disabled={importer.isPending}>
              {importer.isPending ? "Importando…" : `Importar ${rows.length} deals`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
