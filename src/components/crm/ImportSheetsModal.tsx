import { useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useImportCrmCsv, CrmStage, useUpdatePipeline } from "@/hooks/useCrm";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineId: string;
  stages: CrmStage[];
  initialUrl?: string | null;
  initialTab?: string | null;
}

// Extracts sheet id from a Google Sheets URL or returns as-is if already an id
const extractId = (input: string): string => {
  const m = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : input.trim();
};

const buildCsvUrl = (id: string, tab: string) => {
  const sheetParam = tab ? `&sheet=${encodeURIComponent(tab)}` : "";
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${sheetParam}`;
};

export function ImportSheetsModal({ open, onOpenChange, pipelineId, stages, initialUrl, initialTab }: Props) {
  const [url, setUrl] = useState(initialUrl || "");
  const [tab, setTab] = useState(initialTab || "");
  const [defaultStage, setDefaultStage] = useState<string>(stages[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const importer = useImportCrmCsv();
  const updatePipeline = useUpdatePipeline();

  const submit = async () => {
    if (!url.trim()) {
      toast({ title: "Cole o link da planilha", variant: "destructive" });
      return;
    }
    if (!defaultStage) {
      toast({ title: "Selecione a etapa padrão", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const id = extractId(url);
      const csvUrl = buildCsvUrl(id, tab);
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("Não foi possível ler a planilha. Verifique se está publicada ou compartilhada como 'Qualquer pessoa com o link'.");
      const text = await res.text();
      const parsed = Papa.parse<any>(text, { header: true, skipEmptyLines: true });
      const headers = parsed.meta.fields || [];
      const rows = parsed.data as any[];

      const findCol = (...names: string[]) => headers.find((h) => names.some((n) => h.toLowerCase().includes(n))) || "";
      const cTitulo = findCol("titulo", "title", "deal");
      const cValor = findCol("valor", "value", "amount");
      const cEmpresa = findCol("empresa", "organiz", "company");
      const cContato = findCol("contato", "nome", "pessoa", "name");
      const cEmail = findCol("email");
      const cTel = findCol("tel", "phone");
      const cOwner = findCol("respons", "owner", "vendedor");
      const cStage = findCol("etapa", "stage", "fase", "status");

      if (!cTitulo) throw new Error("A planilha precisa ter uma coluna de Título.");

      const mapped = rows.map((r) => ({
        titulo: String(r[cTitulo] || "").trim(),
        valor: cValor ? parseFloat(String(r[cValor] || "0").replace(/[^\d,.-]/g, "").replace(",", ".")) || 0 : 0,
        empresa: cEmpresa ? String(r[cEmpresa] || "").trim() : undefined,
        contato: cContato ? String(r[cContato] || "").trim() : undefined,
        email: cEmail ? String(r[cEmail] || "").trim() : undefined,
        telefone: cTel ? String(r[cTel] || "").trim() : undefined,
        owner: cOwner ? String(r[cOwner] || "").trim() : undefined,
        stage_nome: cStage ? String(r[cStage] || "").trim() : undefined,
      }));

      const result = await importer.mutateAsync({
        pipeline_id: pipelineId,
        default_stage_id: defaultStage,
        rows: mapped,
        stages,
      });

      // Salva a referência da planilha no pipeline para futuras sincronizações
      await updatePipeline.mutateAsync({ id: pipelineId, sheet_id: id, sheet_tab: tab || null });

      toast({ title: "Sincronização concluída", description: `${result.imported} de ${result.total} deals importados` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Sincronizar Google Sheets</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Link da planilha ou ID *</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
            <p className="text-[10px] text-muted-foreground mt-1">
              A planilha precisa estar compartilhada como "Qualquer pessoa com o link – Leitor".
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome da aba</Label>
              <Input value={tab} onChange={(e) => setTab(e.target.value)} placeholder="Pipeline" />
            </div>
            <div>
              <Label>Etapa padrão *</Label>
              <Select value={defaultStage} onValueChange={setDefaultStage}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-lg bg-white/5 p-3 text-[11px] text-muted-foreground space-y-1">
            <div className="font-medium text-foreground">Colunas reconhecidas:</div>
            <div>Título, Valor, Empresa, Contato, Email, Telefone, Responsável, Etapa</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading || importer.isPending}>
            {loading || importer.isPending ? "Sincronizando…" : "Sincronizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
