import { useEffect, useMemo, useState } from "react";
import { Plus, Mail, Send, Eye, MousePointerClick, AlertTriangle, Loader2, X, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useCrmDeals, useCrmPipelines } from "@/hooks/useCrm";
import { format } from "date-fns";

type Campaign = {
  id: string;
  nome: string;
  subject: string;
  status: string;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  created_at: string;
  sent_at: string | null;
};

export function CampanhasView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("email_campaigns")
      .select("id,nome,subject,status,total_recipients,total_sent,total_delivered,total_opened,total_clicked,total_bounced,created_at,sent_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setCampaigns((data as Campaign[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("email_campaigns_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_campaigns" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const rate = (n: number, total: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Campanhas de Email</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Envio em massa via Resend · tracking de abertura e clique em tempo real</p>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)} className="shadow-lg shadow-primary/20">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Campanha
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-2">{[1,2,3].map(i => <div key={i} className="h-20 glass-card rounded-xl animate-pulse" />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center">
          <Mail className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma campanha ainda</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Crie sua primeira campanha para enviar emails em massa</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {campaigns.map((c) => (
            <div key={c.id} className="glass-card rounded-xl p-4 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground truncate">{c.nome}</h3>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{c.subject}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {c.sent_at ? `Enviada em ${format(new Date(c.sent_at), "dd/MM/yyyy HH:mm")}` : `Criada em ${format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}`}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs flex-shrink-0">
                  <Metric icon={<Send className="w-3 h-3" />} label="Enviados" value={c.total_sent} total={c.total_recipients} />
                  <Metric icon={<Eye className="w-3 h-3" />} label="Abertura" value={c.total_opened} rate={rate(c.total_opened, c.total_sent)} color="text-sky-400" />
                  <Metric icon={<MousePointerClick className="w-3 h-3" />} label="Clique" value={c.total_clicked} rate={rate(c.total_clicked, c.total_sent)} color="text-violet-400" />
                  {c.total_bounced > 0 && <Metric icon={<AlertTriangle className="w-3 h-3" />} label="Bounce" value={c.total_bounced} color="text-rose-400" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewCampaignModal open={newOpen} onOpenChange={setNewOpen} onCreated={load} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Rascunho", cls: "bg-white/10 text-muted-foreground" },
    sending: { label: "Enviando…", cls: "bg-amber-500/15 text-amber-400" },
    sent: { label: "Enviada", cls: "bg-emerald-500/15 text-emerald-400" },
    failed: { label: "Falhou", cls: "bg-rose-500/15 text-rose-400" },
  };
  const s = map[status] ?? map.draft;
  return <span className={`px-1.5 py-0.5 rounded text-[10px] ${s.cls}`}>{s.label}</span>;
}

function Metric({ icon, label, value, rate, color, total }: { icon: React.ReactNode; label: string; value: number; rate?: string; color?: string; total?: number }) {
  return (
    <div className="flex flex-col items-end">
      <div className={`flex items-center gap-1 ${color ?? "text-foreground"}`}>
        {icon}
        <span className="text-sm font-medium tabular-nums">{value}{total !== undefined ? `/${total}` : ""}</span>
      </div>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{rate ?? label}</span>
    </div>
  );
}

function NewCampaignModal({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (b: boolean) => void; onCreated: () => void }) {
  const { data: pipelines = [] } = useCrmPipelines();
  const [pipelineId, setPipelineId] = useState<string>("");
  useEffect(() => { if (pipelines[0] && !pipelineId) setPipelineId(pipelines[0].id); }, [pipelines]);
  const { data: deals = [] } = useCrmDeals(pipelineId);

  const [nome, setNome] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("<p>Olá {{nome}},</p>\n\n<p>...</p>\n\n<p>Abraço,<br/>Equipe Palácios 3D Studio</p>");
  const [fromEmail, setFromEmail] = useState("contato@palacios3dstudio.com");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const dealsWithEmail = useMemo(
    () => deals.filter((d) => d.person?.email && d.status === "open"),
    [deals]
  );

  const toggleAll = () => {
    if (selected.size === dealsWithEmail.length) setSelected(new Set());
    else setSelected(new Set(dealsWithEmail.map((d) => d.id)));
  };

  const send = async () => {
    if (!nome.trim() || !subject.trim() || !body.trim() || selected.size === 0) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome, assunto, corpo e selecione ao menos 1 destinatário", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data: camp, error } = await supabase.from("email_campaigns").insert({
        nome, subject, body_html: body, from_email: fromEmail,
        criado_por: user.user?.id,
        total_recipients: selected.size,
      }).select().single();
      if (error) throw error;

      const recipients = dealsWithEmail
        .filter((d) => selected.has(d.id))
        .map((d) => ({
          campaign_id: camp.id,
          deal_id: d.id,
          person_id: d.person?.id ?? null,
          recipient_email: d.person!.email!,
          recipient_name: d.person?.nome ?? null,
        }));

      const { error: rErr } = await supabase.from("email_campaign_recipients").insert(recipients);
      if (rErr) throw rErr;

      const { error: sErr } = await supabase.functions.invoke("resend-send-campaign", {
        body: { campaign_id: camp.id },
      });
      if (sErr) throw sErr;

      toast({ title: "Campanha iniciada", description: `Enviando para ${selected.size} destinatários…` });
      onOpenChange(false);
      setNome(""); setSubject(""); setSelected(new Set());
      onCreated();
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-white/10">
        <DialogHeader>
          <DialogTitle>Nova Campanha de Email</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome interno</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Outbound Janeiro - Engenheiros SP" className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">De (email remetente)</Label>
              <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className="h-9 mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Assunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Vamos conversar sobre seu próximo projeto, {{nome}}?" className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Corpo (HTML · use {`{{nome}}`} para personalizar)</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[180px] mt-1 font-mono text-xs" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Destinatários — pipeline:
                <select value={pipelineId} onChange={(e) => { setPipelineId(e.target.value); setSelected(new Set()); }}
                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs">
                  {pipelines.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </Label>
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-7">
                {selected.size === dealsWithEmail.length && dealsWithEmail.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
            </div>
            <div className="border border-white/10 rounded-lg max-h-64 overflow-y-auto divide-y divide-white/5">
              {dealsWithEmail.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Nenhum deal com email neste pipeline</div>
              ) : dealsWithEmail.map((d) => (
                <label key={d.id} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer">
                  <Checkbox checked={selected.has(d.id)} onCheckedChange={(c) => {
                    const s = new Set(selected);
                    if (c) s.add(d.id); else s.delete(d.id);
                    setSelected(s);
                  }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-foreground truncate">{d.person?.nome || d.titulo}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{d.person?.email}</div>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{selected.size} de {dealsWithEmail.length} selecionados</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
          <Button onClick={send} disabled={sending}>
            {sending ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Enviando…</> : <><Send className="w-3.5 h-3.5 mr-1.5" /> Enviar para {selected.size}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
