import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { TemperaturaBadge, temperaturaFromScore } from "./TemperaturaBadge";
import { CrmDeal } from "@/hooks/useCrm";

interface Props {
  deal: CrmDeal | null;
  onClose: () => void;
}

export function QualificacaoModal({ deal, onClose }: Props) {
  const qc = useQueryClient();
  const [fit, setFit] = useState(0);
  const [budget, setBudget] = useState(0);
  const [urgencia, setUrgencia] = useState(0);
  const [temperaturaManual, setTemperaturaManual] = useState<"quente" | "morno" | "frio" | "auto">("auto");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (deal) {
      setFit(deal.score_fit ?? 0);
      setBudget(deal.score_budget ?? 0);
      setUrgencia(deal.score_urgencia ?? 0);
      setTemperaturaManual((deal.temperatura as any) ?? "auto");
    }
  }, [deal]);

  const total = fit + budget + urgencia;
  const auto = temperaturaFromScore(total);
  const finalTemp = temperaturaManual === "auto" ? auto : temperaturaManual;

  const save = async () => {
    if (!deal) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("crm_deals")
        .update({
          score_fit: fit,
          score_budget: budget,
          score_urgencia: urgencia,
          temperatura: finalTemp,
        } as any)
        .eq("id", deal.id);
      if (error) throw error;
      toast({ title: "Qualificação atualizada" });
      qc.invalidateQueries({ queryKey: ["crm"] });
      onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!deal} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Qualificar Lead</DialogTitle>
          {deal && <p className="text-xs text-muted-foreground">{deal.titulo}</p>}
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <ScoreRow label="Fit (perfil ideal)" value={fit} onChange={setFit} />
          <ScoreRow label="Budget (orçamento)" value={budget} onChange={setBudget} />
          <ScoreRow label="Urgência (timing)" value={urgencia} onChange={setUrgencia} />

          <div className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">Score total</div>
              <div className="text-lg font-semibold tabular-nums text-foreground">{total}<span className="text-xs text-muted-foreground">/30</span></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Temperatura</div>
              <TemperaturaBadge temperatura={finalTemp} size="md" />
            </div>
            <div className="mt-3 flex gap-1.5">
              {(["auto","quente","morno","frio"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTemperaturaManual(t)}
                  className={`flex-1 px-2 py-1.5 rounded-md text-[10px] uppercase tracking-wider border transition-colors ${
                    temperaturaManual === t
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-white/10 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "auto" ? "Auto" : t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScoreRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-primary">{value}<span className="text-xs text-muted-foreground">/10</span></span>
      </div>
      <Slider min={0} max={10} step={1} value={[value]} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
