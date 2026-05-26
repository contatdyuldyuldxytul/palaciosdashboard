import { useState, useEffect } from "react";
import { MessageCircle, Save, Check, AlertCircle, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIntegrationSetting, useUpsertIntegrationSetting } from "@/hooks/useFlowAutomation";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function AdminPlaceholder() {
  const { data: twilioSetting } = useIntegrationSetting<{ from_number?: string }>("twilio_whatsapp");
  const upsert = useUpsertIntegrationSetting();
  const [fromNumber, setFromNumber] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (twilioSetting?.from_number) setFromNumber(twilioSetting.from_number);
  }, [twilioSetting?.from_number]);

  const save = async () => {
    try {
      await upsert.mutateAsync({ key: "twilio_whatsapp", value: { from_number: fromNumber.trim() } });
      toast({ title: "Número WhatsApp salvo" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const runWorker = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("flow-worker");
      if (error) throw error;
      toast({ title: "Worker executado", description: `${(data as any)?.processed ?? 0} run(s) processados` });
    } catch (e: any) {
      toast({ title: "Erro no worker", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const isConfigured = !!twilioSetting?.from_number;

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Integrações & Automação</h2>
        <p className="text-xs text-muted-foreground">
          Configure os canais que os fluxos usam para enviar mensagens automáticas e disparar o motor de execução.
        </p>
      </div>

      {/* Twilio / WhatsApp */}
      <div className="glass-card rounded-xl p-5 border border-white/10 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">WhatsApp (Twilio)</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              {isConfigured ? (
                <><Check className="w-3 h-3 text-emerald-400" /> Configurado</>
              ) : (
                <><AlertCircle className="w-3 h-3 text-amber-400" /> Pendente — conecte Twilio e defina o número</>
              )}
            </div>
          </div>
        </div>
        <div>
          <Label className="text-xs">Número From WhatsApp Business (E.164)</Label>
          <Input
            value={fromNumber}
            onChange={(e) => setFromNumber(e.target.value)}
            placeholder="+5511999999999"
            className="bg-white/5 border-white/10 h-9 text-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Use o número Twilio aprovado para WhatsApp Business. O prefixo <code>whatsapp:</code> é adicionado automaticamente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={upsert.isPending || !fromNumber.trim()}>
            <Save className="w-3.5 h-3.5 mr-1.5" /> Salvar número
          </Button>
        </div>
        <div className="text-[10px] text-muted-foreground pt-2 border-t border-white/5 space-y-1">
          <div><strong>Passos:</strong></div>
          <div>1. Conectar Twilio em <em>Connectors</em> (chave API com permissão de envio).</div>
          <div>2. No console Twilio: ativar SMS Pumping Protection e restringir Geo Permissions ao Brasil.</div>
          <div>3. Salvar o número From acima.</div>
        </div>
      </div>

      {/* Worker */}
      <div className="glass-card rounded-xl p-5 border border-white/10 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
            <Workflow className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Motor de execução de fluxos</div>
            <div className="text-[11px] text-muted-foreground">
              Processa os runs pendentes. Em produção roda automaticamente a cada 5 min.
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={runWorker} disabled={running}>
          {running ? "Executando…" : "Rodar agora"}
        </Button>
      </div>
    </div>
  );
}
