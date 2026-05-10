import { useState } from "react";
import { useMonthlyStrategy, useCampaigns, useCadenceTemplates, useImportStrategy, useAllMonthlyStrategies } from "@/hooks/useStrategy";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Plus, RefreshCw } from "lucide-react";
import { z } from "zod";

const ImportSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "month deve ser YYYY-MM"),
  monthly_strategy: z.object({
    cash_target: z.number().optional(),
    operational_minimum: z.number().optional(),
    key_priorities: z.array(z.string()).optional(),
    strategic_focus: z.string().optional(),
    allocation: z.record(z.any()).optional(),
    session_notes: z.string().optional(),
  }),
  campaigns: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    owner_user_id: z.union([z.number(), z.string()]).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    playbook_type: z.string().optional(),
    target_description: z.string().optional(),
    kpis: z.record(z.any()).optional(),
    custom_templates: z.record(z.string()).optional(),
    leads: z.array(z.object({
      pipedrive_deal_id: z.union([z.number(), z.string()]).optional(),
      lead_name: z.string().optional(),
      lead_company: z.string().optional(),
      group: z.enum(["A","B"]).optional(),
    })).optional(),
  })).default([]),
});

const SAMPLE = `{
  "month": "${new Date().toISOString().slice(0,7)}",
  "monthly_strategy": {
    "cash_target": 20000,
    "operational_minimum": 7000,
    "key_priorities": ["Reativar relacionamentos", "Validar hunter freela"],
    "strategic_focus": "Caixa via reativação",
    "allocation": {"thiago": {"hunting": 60}, "aline": {"cadencia": 100}},
    "session_notes": "Sessão com Claude"
  },
  "campaigns": []
}`;

export function TabEstrategia({ onImported }: { onImported?: () => void }) {
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth());
  const { data: strategy } = useMonthlyStrategy(selectedMonth);
  const { data: campaigns = [] } = useCampaigns(strategy?.id ?? null);
  const { data: templates = [] } = useCadenceTemplates();
  const { data: history = [] } = useAllMonthlyStrategies();
  const importMut = useImportStrategy();

  const [importOpen, setImportOpen] = useState(false);
  const [jsonText, setJsonText] = useState(SAMPLE);
  const [validation, setValidation] = useState<{ ok: boolean; preview?: string; errors?: string[] }>({ ok: false });

  function validate() {
    try {
      const parsed = JSON.parse(jsonText);
      const r = ImportSchema.safeParse(parsed);
      if (!r.success) {
        setValidation({ ok: false, errors: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
        return;
      }
      const totalLeads = r.data.campaigns.reduce((s, c) => s + (c.leads?.length || 0), 0);
      setValidation({
        ok: true,
        preview: `Mês ${r.data.month} · ${r.data.campaigns.length} campanha(s) · ${totalLeads} lead(s)`,
      });
    } catch (e: any) {
      setValidation({ ok: false, errors: [e.message] });
    }
  }

  async function confirmImport() {
    try {
      const payload = JSON.parse(jsonText);
      const result = await importMut.mutateAsync(payload);
      toast.success("Estratégia importada", { description: JSON.stringify(result) });
      setImportOpen(false);
      onImported?.();
    } catch (e: any) {
      toast.error("Erro ao importar", { description: e.message });
    }
  }

  async function regenerate() {
    const { data, error } = await import("@/integrations/supabase/client").then(m =>
      m.supabase.functions.invoke("generate-daily-activities")
    );
    if (error) toast.error("Falha", { description: error.message });
    else toast.success("Tarefas geradas", { description: JSON.stringify(data) });
  }

  return (
    <div className="space-y-4">
      {/* Header com seletor de histórico */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {history.map((h: any) => (
                <SelectItem key={h.id} value={h.month.slice(0,7)}>{h.month.slice(0,7)}</SelectItem>
              ))}
              {!history.find((h: any) => h.month.slice(0,7) === selectedMonth) && (
                <SelectItem value={selectedMonth}>{selectedMonth}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={regenerate}>
            <RefreshCw className="w-4 h-4 mr-1" /> Gerar tarefas agora
          </Button>
          <Button size="sm" onClick={() => setImportOpen(true)}>
            <Download className="w-4 h-4 mr-1" /> Importar JSON
          </Button>
        </div>
      </div>

      {/* Snapshot do mês */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-2">Estratégia · {selectedMonth}</h3>
        {strategy ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded border border-white/10 p-3">
              <p className="text-xs text-muted-foreground">Meta de caixa</p>
              <p className="text-lg font-semibold">R$ {Number(strategy.cash_target ?? 0).toLocaleString("pt-BR")}</p>
            </div>
            <div className="rounded border border-white/10 p-3">
              <p className="text-xs text-muted-foreground">Mínimo operacional</p>
              <p className="text-lg font-semibold">R$ {Number(strategy.operational_minimum ?? 0).toLocaleString("pt-BR")}</p>
            </div>
            <div className="rounded border border-white/10 p-3">
              <p className="text-xs text-muted-foreground">Origem</p>
              <p className="text-sm">{strategy.source}</p>
            </div>
            <div className="md:col-span-3 rounded border border-white/10 p-3">
              <p className="text-xs text-muted-foreground mb-1">Foco</p>
              <p className="text-sm">{strategy.strategic_focus || "—"}</p>
              {Array.isArray(strategy.key_priorities) && strategy.key_priorities.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {(strategy.key_priorities as string[]).map((p, i) => (
                    <li key={i}>• {p}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma estratégia para {selectedMonth}. Importe um JSON.</p>
        )}
      </Card>

      {/* Campanhas */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Campanhas</h3>
          <Button size="sm" variant="outline" disabled>
            <Plus className="w-4 h-4 mr-1" /> Nova manual
          </Button>
        </div>
        <div className="space-y-2">
          {campaigns.map((c: any) => {
            const total = (c.kpis?.leads_target as number) || 0;
            const leadCount = c.campaign_leads?.[0]?.count ?? 0;
            const pct = total ? Math.min(100, Math.round((leadCount / total) * 100)) : 0;
            return (
              <div key={c.id} className="rounded-lg border border-white/10 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{c.name}</p>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-[10px]">{c.playbook_type}</Badge>
                    <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                  </div>
                </div>
                {c.target_description && <p className="text-xs text-muted-foreground">{c.target_description}</p>}
                {total > 0 && (
                  <div className="mt-2">
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground mt-1">{leadCount}/{total} leads</p>
                  </div>
                )}
              </div>
            );
          })}
          {campaigns.length === 0 && <p className="text-xs text-muted-foreground">Sem campanhas no mês.</p>}
        </div>
      </Card>

      {/* Templates de cadência */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Cadência 2.0 · templates</h3>
        <div className="max-h-64 overflow-y-auto space-y-1 text-xs">
          {templates.map((t: any) => (
            <div key={t.id} className="flex items-center gap-2 py-1 border-b border-white/5">
              <Badge variant="outline" className="text-[9px]">D{t.day_in_flow}</Badge>
              <Badge variant="outline" className="text-[9px]">{t.period === "morning" ? "M" : "T"}</Badge>
              <Badge variant="outline" className="text-[9px]">{t.channel}</Badge>
              <span className="text-muted-foreground">{t.task_template}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal import */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>📥 Importar estratégia (JSON)</DialogTitle></DialogHeader>
          <Textarea
            value={jsonText}
            onChange={(e) => { setJsonText(e.target.value); setValidation({ ok: false }); }}
            className="font-mono text-xs h-64"
          />
          {validation.errors && (
            <div className="rounded-md bg-red-500/10 border border-red-500/30 p-2 text-xs text-red-300">
              {validation.errors.map((e, i) => <p key={i}>• {e}</p>)}
            </div>
          )}
          {validation.ok && validation.preview && (
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs text-emerald-300">
              ✓ {validation.preview}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={validate}>Validar</Button>
            <Button onClick={confirmImport} disabled={!validation.ok || importMut.isPending}>
              {importMut.isPending ? "Importando..." : "Confirmar importação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}
