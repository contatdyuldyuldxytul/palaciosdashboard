import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { X, Search, Upload, ArrowRight, ArrowLeft, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCreateCampaign, useWhatsAppTemplates, renderTemplate, type WhatsAppInstance } from "@/hooks/useWhatsApp";
import { toast } from "@/hooks/use-toast";

type Recipient = { to: string; name?: string; person_id?: string; variables?: Record<string, any> };

export default function CampaignWizard({ instance, onDone }: { instance: WhatsAppInstance; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [nome, setNome] = useState("");
  const [template, setTemplate] = useState("");
  const [settings, setSettings] = useState({
    interval_min: 30, interval_max: 60,
    daily_limit: 80,
    window_start: "09:00", window_end: "18:00",
    weekdays: [1, 2, 3, 4, 5],
  });
  const create = useCreateCampaign();
  const { data: templates } = useWhatsAppTemplates();

  const next = () => setStep((s) => Math.min(4, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const launch = () => {
    if (!nome.trim() || !template.trim() || !recipients.length) return;
    create.mutate({
      instance_id: instance.id, nome, message_template: template,
      recipients: recipients.map((r) => ({ to: r.to, name: r.name, person_id: r.person_id, variables: { nome: r.name || "", primeiro_nome: (r.name || "").split(" ")[0] || "", ...(r.variables || {}) } })),
      settings,
    }, {
      onSuccess: () => { toast({ title: "Campanha criada", description: `${recipients.length} mensagens agendadas.` }); onDone(); },
      onError: (e: any) => toast({ title: "Erro", description: String(e?.message || e), variant: "destructive" }),
    });
  };

  return (
    <div className="glass-card rounded-xl border border-white/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Nova campanha — passo {step} de 4</h3>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`h-1.5 w-8 rounded ${n <= step ? "bg-emerald-500" : "bg-white/10"}`} />
          ))}
        </div>
      </div>

      {step === 1 && <Step1Recipients recipients={recipients} setRecipients={setRecipients} />}
      {step === 2 && <Step2Message template={template} setTemplate={setTemplate} nome={nome} setNome={setNome} templates={templates || []} firstRecipient={recipients[0]} />}
      {step === 3 && <Step3Cadence settings={settings} setSettings={setSettings} total={recipients.length} />}
      {step === 4 && <Step4Review nome={nome} template={template} recipients={recipients} settings={settings} firstRecipient={recipients[0]} />}

      <div className="flex justify-between pt-2 border-t border-white/10">
        <Button variant="ghost" onClick={prev} disabled={step === 1}><ArrowLeft className="w-3.5 h-3.5 mr-1" /> Voltar</Button>
        {step < 4 ? (
          <Button onClick={next} disabled={(step === 1 && !recipients.length) || (step === 2 && (!nome.trim() || !template.trim()))}>
            Próximo <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        ) : (
          <Button onClick={launch} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
            Iniciar campanha
          </Button>
        )}
      </div>
    </div>
  );
}

function Step1Recipients({ recipients, setRecipients }: { recipients: Recipient[]; setRecipients: (r: Recipient[]) => void }) {
  const [search, setSearch] = useState("");
  const [crmResults, setCrmResults] = useState<any[]>([]);
  const [pasteText, setPasteText] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      let q = supabase.from("crm_persons").select("id, nome, telefone, email").not("telefone", "is", null).limit(50);
      if (search) q = q.or(`nome.ilike.%${search}%,telefone.ilike.%${search}%`);
      const { data } = await q;
      setCrmResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const add = (r: Recipient) => {
    if (recipients.find((x) => x.to === r.to)) return;
    setRecipients([...recipients, r]);
  };
  const remove = (to: string) => setRecipients(recipients.filter((r) => r.to !== to));

  const parsePaste = () => {
    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const news: Recipient[] = [];
    for (const line of lines) {
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      const phone = parts.find((p) => /\d{8,}/.test(p)) || parts[0];
      const name = parts.find((p) => !/\d{6,}/.test(p));
      const cleaned = phone.replace(/\D/g, "");
      if (cleaned.length >= 8 && !recipients.find((x) => x.to === cleaned) && !news.find((x) => x.to === cleaned)) {
        news.push({ to: cleaned, name });
      }
    }
    setRecipients([...recipients, ...news]);
    setPasteText("");
    toast({ title: `${news.length} contatos adicionados` });
  };

  return (
    <div className="space-y-3">
      <Tabs defaultValue="crm">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="crm">Do CRM</TabsTrigger>
          <TabsTrigger value="paste">Colar / Importar</TabsTrigger>
        </TabsList>
        <TabsContent value="crm" className="space-y-2 mt-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lead..." className="bg-white/5 border-white/10 h-8 pl-8 text-xs" />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {crmResults.map((r) => {
              const phone = (r.telefone || "").replace(/\D/g, "");
              if (!phone) return null;
              const added = recipients.find((x) => x.to === phone);
              return (
                <button key={r.id} disabled={!!added} onClick={() => add({ to: phone, name: r.nome, person_id: r.id })}
                  className={`w-full text-left p-2 rounded border ${added ? "border-emerald-500/30 bg-emerald-500/10 opacity-60" : "border-white/5 hover:bg-white/5"}`}>
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground">{r.nome}</span>
                    <span className="text-muted-foreground">+{phone}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="paste" className="space-y-2 mt-3">
          <Label className="text-[11px]">Cole números (um por linha, opcionalmente "Nome, número")</Label>
          <Textarea rows={6} value={pasteText} onChange={(e) => setPasteText(e.target.value)}
            placeholder="João Silva, 11999998888&#10;21988887777&#10;Maria, 47999998888"
            className="bg-white/5 border-white/10 text-xs font-mono" />
          <Button size="sm" onClick={parsePaste}><Upload className="w-3.5 h-3.5 mr-1" /> Adicionar</Button>
        </TabsContent>
      </Tabs>

      <div className="border-t border-white/10 pt-3">
        <div className="text-[11px] text-muted-foreground mb-2">{recipients.length} contatos selecionados</div>
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
          {recipients.map((r) => (
            <Badge key={r.to} variant="outline" className="bg-white/5 border-white/20 text-foreground gap-1.5">
              {r.name || r.to}
              <button onClick={() => remove(r.to)}><X className="w-3 h-3" /></button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step2Message({ template, setTemplate, nome, setNome, templates, firstRecipient }: any) {
  const preview = useMemo(() => renderTemplate(template, { nome: firstRecipient?.name || "Cliente", primeiro_nome: (firstRecipient?.name || "Cliente").split(" ")[0], empresa: "Empresa" }), [template, firstRecipient]);
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[11px]">Nome da campanha</Label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Apresentação Maio" className="bg-white/5 border-white/10 h-8 text-sm" />
      </div>
      <div>
        <Label className="text-[11px]">Mensagem (variáveis: {"{{nome}}"}, {"{{primeiro_nome}}"}, {"{{empresa}}"})</Label>
        <Textarea rows={6} value={template} onChange={(e) => setTemplate(e.target.value)}
          placeholder="Olá {{primeiro_nome}}, tudo bem?..." className="bg-white/5 border-white/10 text-sm" />
        {!!templates.length && (
          <div className="flex flex-wrap gap-1 mt-2">
            {templates.map((t: any) => (
              <button key={t.id} onClick={() => setTemplate(t.conteudo)}
                className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-muted-foreground border border-white/10">
                {t.nome}
              </button>
            ))}
          </div>
        )}
      </div>
      {template && (
        <div>
          <Label className="text-[11px]">Pré-visualização (1º contato)</Label>
          <div className="rounded-lg p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground whitespace-pre-wrap">{preview}</div>
        </div>
      )}
    </div>
  );
}

function Step3Cadence({ settings, setSettings, total }: any) {
  const avgGap = (settings.interval_min + settings.interval_max) / 2;
  const perDay = Math.min(settings.daily_limit, Math.floor(((parseInt(settings.window_end) - parseInt(settings.window_start)) * 3600) / avgGap));
  const days = Math.ceil(total / Math.max(1, perDay));
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-[11px]">Intervalo entre envios: {settings.interval_min}s a {settings.interval_max}s</Label>
        <div className="flex gap-3 items-center">
          <Slider value={[settings.interval_min]} onValueChange={(v) => setSettings({ ...settings, interval_min: v[0] })} min={15} max={120} step={5} className="flex-1" />
          <Slider value={[settings.interval_max]} onValueChange={(v) => setSettings({ ...settings, interval_max: v[0] })} min={15} max={120} step={5} className="flex-1" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-[11px]">Limite diário</Label>
          <Input type="number" value={settings.daily_limit} onChange={(e) => setSettings({ ...settings, daily_limit: parseInt(e.target.value) || 1 })} className="bg-white/5 border-white/10 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-[11px]">Início</Label>
          <Input type="time" value={settings.window_start} onChange={(e) => setSettings({ ...settings, window_start: e.target.value })} className="bg-white/5 border-white/10 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-[11px]">Fim</Label>
          <Input type="time" value={settings.window_end} onChange={(e) => setSettings({ ...settings, window_end: e.target.value })} className="bg-white/5 border-white/10 h-8 text-sm" />
        </div>
      </div>
      <div>
        <Label className="text-[11px]">Dias da semana</Label>
        <div className="flex gap-1 mt-1">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((l, i) => {
            const active = settings.weekdays.includes(i);
            return (
              <button key={i} onClick={() => setSettings({ ...settings, weekdays: active ? settings.weekdays.filter((d: number) => d !== i) : [...settings.weekdays, i] })}
                className={`w-9 h-9 rounded text-xs font-semibold ${active ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-white/5 text-muted-foreground border border-white/10"}`}>{l}</button>
            );
          })}
        </div>
      </div>
      <div className="rounded-lg p-3 bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200">
        ≈ {total} mensagens · ~{perDay}/dia · termina em ~{days} dia(s) úteis
      </div>
    </div>
  );
}

function Step4Review({ nome, template, recipients, settings, firstRecipient }: any) {
  const preview = renderTemplate(template, { nome: firstRecipient?.name || "Cliente", primeiro_nome: (firstRecipient?.name || "Cliente").split(" ")[0], empresa: "Empresa" });
  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-lg p-3 border border-white/10 bg-white/[0.02]">
        <div className="text-[11px] text-muted-foreground">Campanha</div>
        <div className="text-foreground font-semibold">{nome}</div>
      </div>
      <div className="rounded-lg p-3 border border-white/10 bg-white/[0.02]">
        <div className="text-[11px] text-muted-foreground mb-1">Destinatários: {recipients.length}</div>
        <div className="text-foreground">{recipients.slice(0, 5).map((r: any) => r.name || r.to).join(", ")}{recipients.length > 5 && ` +${recipients.length - 5}`}</div>
      </div>
      <div className="rounded-lg p-3 border border-white/10 bg-white/[0.02]">
        <div className="text-[11px] text-muted-foreground mb-1">Mensagem (preview)</div>
        <div className="text-foreground whitespace-pre-wrap">{preview}</div>
      </div>
      <div className="rounded-lg p-3 border border-white/10 bg-white/[0.02]">
        <div className="text-[11px] text-muted-foreground mb-1">Cadência</div>
        <div className="text-foreground">{settings.interval_min}-{settings.interval_max}s entre envios · {settings.daily_limit}/dia · {settings.window_start}-{settings.window_end}</div>
      </div>
    </div>
  );
}
