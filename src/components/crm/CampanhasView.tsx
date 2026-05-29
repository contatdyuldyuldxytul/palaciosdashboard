import { useEffect, useMemo, useState } from "react";
import { Plus, Mail, Send, Eye, MousePointerClick, AlertTriangle, Loader2, Users, FileText, PenLine, Paperclip, X, Calendar, Save, TestTube2, Search, Filter as FilterIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useCrmDeals, useCrmPipelines, useCrmStages } from "@/hooks/useCrm";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { RichEditor } from "@/components/crm/email/RichEditor";

type Campaign = {
  id: string; nome: string; subject: string; status: string;
  total_recipients: number; total_sent: number; total_delivered: number;
  total_opened: number; total_clicked: number; total_bounced: number;
  created_at: string; sent_at: string | null; scheduled_at: string | null;
};

type Template = {
  id: string; nome: string; subject: string; body_html: string;
  categoria: string; vezes_usado: number; arquivado: boolean; created_at: string;
};

type Signature = { id: string; nome: string; corpo_html: string; is_default: boolean };

const CATEGORIAS = ["outbound", "follow_up", "nutricao", "reativacao", "outros"];
const CATEGORIA_LABELS: Record<string, string> = {
  outbound: "Outbound", follow_up: "Follow-up", nutricao: "Nutrição", reativacao: "Reativação", outros: "Outros",
};

export function CampanhasView() {
  const [tab, setTab] = useState<"campanhas" | "templates" | "assinaturas">("campanhas");

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="campanhas" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-xs">
            <Mail className="w-3.5 h-3.5 mr-1.5" /> Campanhas
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-xs">
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="assinaturas" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-xs">
            <PenLine className="w-3.5 h-3.5 mr-1.5" /> Assinaturas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="campanhas" className="mt-4"><CampanhasTab /></TabsContent>
        <TabsContent value="templates" className="mt-4"><TemplatesTab /></TabsContent>
        <TabsContent value="assinaturas" className="mt-4"><AssinaturasTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================ CAMPANHAS TAB ============================ */
function CampanhasTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [initial, setInitial] = useState<Partial<Template> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("email_campaigns")
      .select("id,nome,subject,status,total_recipients,total_sent,total_delivered,total_opened,total_clicked,total_bounced,created_at,sent_at,scheduled_at")
      .order("created_at", { ascending: false }).limit(100);
    setCampaigns((data as Campaign[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("email_campaigns_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_campaigns" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const rate = (n: number, total: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : "—";
  const totalMonth = campaigns
    .filter(c => new Date(c.created_at).getMonth() === new Date().getMonth())
    .reduce((s, c) => s + (c.total_sent || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">Campanhas de Email</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Envio em massa · tracking em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground glass-card px-3 py-1.5 rounded-lg">
            <span className="tabular-nums text-foreground font-medium">{totalMonth.toLocaleString("pt-BR")}</span>
            <span className="mx-1">/</span>
            <span className="tabular-nums">3.000</span>
            <span className="ml-1 text-[10px]">/mês</span>
          </div>
          <Button size="sm" onClick={() => { setInitial(null); setNewOpen(true); }} className="shadow-lg shadow-primary/20">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Campanha
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-2">{[1,2,3].map(i => <div key={i} className="h-20 glass-card rounded-xl animate-pulse" />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center">
          <Mail className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma campanha ainda</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {campaigns.map((c) => (
            <div key={c.id} className="glass-card rounded-xl p-4 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium text-foreground truncate">{c.nome}</h3>
                    <StatusBadge status={c.status} scheduled={c.scheduled_at} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{c.subject}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {c.sent_at ? `Enviada em ${format(new Date(c.sent_at), "dd/MM/yyyy HH:mm")}`
                      : c.scheduled_at ? `Agendada para ${format(new Date(c.scheduled_at), "dd/MM/yyyy HH:mm")}`
                      : `Criada em ${format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}`}
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

      <NewCampaignModal open={newOpen} onOpenChange={setNewOpen} onCreated={load} initial={initial} />
    </div>
  );
}

function StatusBadge({ status, scheduled }: { status: string; scheduled?: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: scheduled ? "Agendada" : "Rascunho", cls: scheduled ? "bg-sky-500/15 text-sky-400" : "bg-white/10 text-muted-foreground" },
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
        {icon}<span className="text-sm font-medium tabular-nums">{value}{total !== undefined ? `/${total}` : ""}</span>
      </div>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{rate ?? label}</span>
    </div>
  );
}

/* ============================ NEW CAMPAIGN MODAL ============================ */
function NewCampaignModal({ open, onOpenChange, onCreated, initial }: {
  open: boolean; onOpenChange: (b: boolean) => void; onCreated: () => void; initial: Partial<Template> | null;
}) {
  const { user } = useAuth();
  const { data: pipelines = [] } = useCrmPipelines();
  const [pipelineId, setPipelineId] = useState<string>("");
  useEffect(() => { if (pipelines[0] && !pipelineId) setPipelineId(pipelines[0].id); }, [pipelines]);
  const { data: stages = [] } = useCrmStages(pipelineId);
  const { data: deals = [] } = useCrmDeals(pipelineId);

  const [nome, setNome] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("<p>Olá {{primeiro_nome}},</p><p></p><p>Abraço,<br/>Equipe Palácios 3D Studio</p>");
  const [fromEmail, setFromEmail] = useState("contato@palacios3dstudio.com");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  // Filtros
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [filterSearch, setFilterSearch] = useState("");
  const [cooldownDays, setCooldownDays] = useState<number>(7);

  // Templates / assinaturas / anexos / agendamento / teste
  const [templates, setTemplates] = useState<Template[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [attachments, setAttachments] = useState<{ path: string; filename: string; size: number }[]>([]);
  const [scheduleAt, setScheduleAt] = useState<string>("");
  const [suppressedSet, setSuppressedSet] = useState<Set<string>>(new Set());
  const [recentRecips, setRecentRecips] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [t, s, sup, recents] = await Promise.all([
        supabase.from("email_templates").select("*").eq("arquivado", false).order("vezes_usado", { ascending: false }),
        supabase.from("email_signatures").select("*").order("is_default", { ascending: false }),
        supabase.from("email_suppressions").select("email"),
        supabase.from("email_campaign_recipients").select("recipient_email,sent_at")
          .gte("sent_at", new Date(Date.now() - cooldownDays * 86400 * 1000).toISOString()),
      ]);
      setTemplates((t.data as Template[]) ?? []);
      setSignatures((s.data as Signature[]) ?? []);
      setSuppressedSet(new Set(((sup.data ?? []) as any[]).map(x => x.email.toLowerCase())));
      setRecentRecips(new Set(((recents.data ?? []) as any[]).map(x => x.recipient_email.toLowerCase())));
      // Aplica template inicial
      if (initial) {
        if (initial.subject) setSubject(initial.subject);
        if (initial.body_html) setBody(initial.body_html);
        if (initial.nome) setNome(initial.nome);
      }
    })();
  }, [open, cooldownDays]);

  // Auto-insere assinatura padrão se body for só placeholder
  useEffect(() => {
    if (!open || !signatures.length) return;
    const def = signatures.find(s => s.is_default);
    if (def && !body.includes(def.corpo_html.substring(0, 20))) {
      setBody(prev => prev + "<p></p>" + def.corpo_html);
    }
  }, [signatures.length, open]);

  const eligibleDeals = useMemo(() => {
    return deals.filter((d) => {
      if (!d.person?.email) return false;
      if (filterStatus !== "all" && d.status !== filterStatus) return false;
      if (filterStage !== "all" && d.stage_id !== filterStage) return false;
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase();
        const hit = d.person?.nome?.toLowerCase().includes(q) || d.person?.email?.toLowerCase().includes(q) || d.titulo.toLowerCase().includes(q) || d.organization?.nome?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      const email = d.person.email.toLowerCase();
      if (suppressedSet.has(email)) return false;
      if (recentRecips.has(email)) return false;
      return true;
    });
  }, [deals, filterStatus, filterStage, filterSearch, suppressedSet, recentRecips]);

  const totalSuppressed = useMemo(() => deals.filter(d => d.person?.email && suppressedSet.has(d.person.email.toLowerCase())).length, [deals, suppressedSet]);
  const totalCooldown = useMemo(() => deals.filter(d => d.person?.email && recentRecips.has(d.person.email.toLowerCase()) && !suppressedSet.has(d.person.email.toLowerCase())).length, [deals, recentRecips, suppressedSet]);

  const toggleAll = () => {
    if (selected.size === eligibleDeals.length) setSelected(new Set());
    else setSelected(new Set(eligibleDeals.map((d) => d.id)));
  };

  const uploadAttachment = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Anexo muito grande", description: "Máximo 10MB por arquivo", variant: "destructive" });
      return;
    }
    const total = attachments.reduce((s, a) => s + a.size, 0) + file.size;
    if (total > 20 * 1024 * 1024) {
      toast({ title: "Limite excedido", description: "Total de anexos não pode passar de 20MB", variant: "destructive" });
      return;
    }
    const path = `${Date.now()}-${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("email-attachments").upload(path, file);
    if (error) { toast({ title: "Falha no upload", description: error.message, variant: "destructive" }); return; }
    setAttachments(prev => [...prev, { path, filename: file.name, size: file.size }]);
  };

  const removeAttachment = (path: string) => setAttachments(prev => prev.filter(a => a.path !== path));

  const saveAsTemplate = async () => {
    if (!nome.trim() || !subject.trim() || !body.trim()) {
      toast({ title: "Preencha nome, assunto e corpo", variant: "destructive" }); return;
    }
    const { error } = await supabase.from("email_templates").insert({
      nome, subject, body_html: body, categoria: "outros", criado_por: user?.id, variables: [],
    } as any);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Template salvo" });
  };

  const sendTest = async () => {
    if (!user?.email) { toast({ title: "Sem email no perfil", variant: "destructive" }); return; }
    if (!subject.trim() || !body.trim()) { toast({ title: "Preencha assunto e corpo", variant: "destructive" }); return; }
    setSending(true);
    try {
      const { data: camp, error } = await supabase.from("email_campaigns").insert({
        nome: `[TESTE] ${nome || subject}`, subject, body_html: body, from_email: fromEmail,
        criado_por: user.id, total_recipients: 0, anexos: attachments,
      } as any).select().single();
      if (error) throw error;
      // adiciona 1 recipient fake para variáveis
      if (eligibleDeals[0]?.person?.email) {
        await supabase.from("email_campaign_recipients").insert({
          campaign_id: camp.id, recipient_email: eligibleDeals[0].person.email,
          recipient_name: eligibleDeals[0].person.nome,
        });
      }
      const { error: sErr } = await supabase.functions.invoke("resend-send-campaign", {
        body: { campaign_id: camp.id, test_only_email: user.email },
      });
      if (sErr) throw sErr;
      toast({ title: "Teste enviado", description: `Confira ${user.email}` });
    } catch (e: any) {
      toast({ title: "Erro no teste", description: e.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  const send = async () => {
    if (!nome.trim() || !subject.trim() || !body.trim() || selected.size === 0) {
      toast({ title: "Preencha tudo", description: "Nome, assunto, corpo e pelo menos 1 destinatário", variant: "destructive" }); return;
    }
    setSending(true);
    try {
      const isScheduled = !!scheduleAt;
      const { data: camp, error } = await supabase.from("email_campaigns").insert({
        nome, subject, body_html: body, from_email: fromEmail,
        criado_por: user?.id, total_recipients: selected.size,
        anexos: attachments, scheduled_at: isScheduled ? new Date(scheduleAt).toISOString() : null,
      } as any).select().single();
      if (error) throw error;

      const recipients = eligibleDeals.filter(d => selected.has(d.id)).map(d => ({
        campaign_id: camp.id, deal_id: d.id, person_id: d.person?.id ?? null,
        recipient_email: d.person!.email!, recipient_name: d.person?.nome ?? null,
      }));
      const { error: rErr } = await supabase.from("email_campaign_recipients").insert(recipients);
      if (rErr) throw rErr;

      if (!isScheduled) {
        const { error: sErr } = await supabase.functions.invoke("resend-send-campaign", { body: { campaign_id: camp.id } });
        if (sErr) throw sErr;
        toast({ title: "Campanha iniciada", description: `Enviando para ${selected.size} destinatários…` });
      } else {
        toast({ title: "Campanha agendada", description: `Será enviada em ${format(new Date(scheduleAt), "dd/MM/yyyy HH:mm")}` });
      }
      onOpenChange(false);
      setNome(""); setSubject(""); setSelected(new Set()); setAttachments([]); setScheduleAt("");
      onCreated();
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-background border-white/10">
        <DialogHeader><DialogTitle>Nova Campanha de Email</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          {/* Linha 1: nome + template */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome interno</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Outbound Janeiro — Engenheiros SP" className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Carregar template</Label>
              <Select onValueChange={(id) => {
                const t = templates.find(x => x.id === id);
                if (t) { setSubject(t.subject); setBody(t.body_html); }
              }}>
                <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Escolher template…" /></SelectTrigger>
                <SelectContent className="bg-background border-white/10">
                  {templates.length === 0 ? <SelectItem value="_none" disabled>Nenhum template salvo</SelectItem>
                    : templates.map(t => <SelectItem key={t.id} value={t.id}>{t.nome} <span className="text-[10px] text-muted-foreground ml-1">({CATEGORIA_LABELS[t.categoria]})</span></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 2: from + reply */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">De</Label>
              <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Agendar envio (opcional)</Label>
              <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="h-9 mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Assunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Vamos conversar, {{primeiro_nome}}?" className="h-9 mt-1" />
          </div>

          {/* Editor */}
          <div>
            <Label className="text-xs">Corpo do email</Label>
            <div className="mt-1">
              <RichEditor value={body} onChange={setBody} signatures={signatures} minHeight={260} />
            </div>
          </div>

          {/* Anexos */}
          <div>
            <Label className="text-xs flex items-center gap-2"><Paperclip className="w-3.5 h-3.5" /> Anexos ({attachments.length})</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {attachments.map(a => (
                <div key={a.path} className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs">
                  <Paperclip className="w-3 h-3 text-muted-foreground" />
                  <span className="text-foreground">{a.filename}</span>
                  <span className="text-muted-foreground">{(a.size / 1024).toFixed(0)} KB</span>
                  <button onClick={() => removeAttachment(a.path)} className="text-muted-foreground hover:text-rose-400">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-dashed border-white/15 text-xs text-muted-foreground hover:text-foreground hover:border-white/30 cursor-pointer">
                <Plus className="w-3 h-3" /> Anexar
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); e.target.value = ""; }} />
              </label>
            </div>
          </div>

          {/* Filtros + destinatários */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="text-xs flex items-center gap-2"><FilterIcon className="w-3.5 h-3.5" /> Filtros de destinatários</Label>
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-7">
                {selected.size === eligibleDeals.length && eligibleDeals.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Select value={pipelineId} onValueChange={(v) => { setPipelineId(v); setSelected(new Set()); setFilterStage("all"); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pipeline" /></SelectTrigger>
                <SelectContent className="bg-background border-white/10">
                  {pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Etapa" /></SelectTrigger>
                <SelectContent className="bg-background border-white/10">
                  <SelectItem value="all">Todas as etapas</SelectItem>
                  {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background border-white/10">
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="open">Abertos</SelectItem>
                  <SelectItem value="won">Ganhos</SelectItem>
                  <SelectItem value="lost">Perdidos</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} placeholder="Buscar…" className="h-8 pl-7 text-xs" />
              </div>
            </div>

            <div className="border border-white/10 rounded-lg max-h-56 overflow-y-auto divide-y divide-white/5">
              {eligibleDeals.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Nenhum destinatário corresponde aos filtros</div>
              ) : eligibleDeals.map((d) => (
                <label key={d.id} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer">
                  <Checkbox checked={selected.has(d.id)} onCheckedChange={(c) => {
                    const s = new Set(selected); if (c) s.add(d.id); else s.delete(d.id); setSelected(s);
                  }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-foreground truncate">{d.person?.nome || d.titulo}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{d.person?.email} {d.organization?.nome ? `· ${d.organization.nome}` : ""}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
              <span><b className="text-foreground">{eligibleDeals.length}</b> elegíveis · {selected.size} selecionados</span>
              {totalSuppressed > 0 && <span className="text-rose-400/80">⊘ {totalSuppressed} em supressão</span>}
              {totalCooldown > 0 && <span className="text-amber-400/80">⏳ {totalCooldown} em cooldown ({cooldownDays}d)</span>}
              <label className="flex items-center gap-1 ml-auto">
                Cooldown:
                <Input type="number" min={0} max={90} value={cooldownDays} onChange={(e) => setCooldownDays(Number(e.target.value) || 0)} className="h-6 w-14 text-[10px]" />
                dias
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending} className="mr-auto">Cancelar</Button>
          <Button variant="outline" size="sm" onClick={saveAsTemplate} disabled={sending}>
            <Save className="w-3.5 h-3.5 mr-1.5" /> Salvar como template
          </Button>
          <Button variant="outline" size="sm" onClick={sendTest} disabled={sending}>
            <TestTube2 className="w-3.5 h-3.5 mr-1.5" /> Enviar teste pra mim
          </Button>
          <Button onClick={send} disabled={sending}>
            {sending ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Processando…</>
              : scheduleAt ? <><Calendar className="w-3.5 h-3.5 mr-1.5" /> Agendar ({selected.size})</>
              : <><Send className="w-3.5 h-3.5 mr-1.5" /> Enviar para {selected.size}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ TEMPLATES TAB ============================ */
function TemplatesTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("email_templates").select("*").eq("arquivado", false).order("created_at", { ascending: false });
    setItems((data as Template[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    if (!confirm("Arquivar template?")) return;
    await supabase.from("email_templates").update({ arquivado: true } as any).eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Templates</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Reutilize em campanhas e envios 1-a-1</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setNewOpen(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Template
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum template salvo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(t => (
            <div key={t.id} className="glass-card rounded-xl p-4 space-y-2 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground truncate flex-1">{t.nome}</h3>
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">{CATEGORIA_LABELS[t.categoria] ?? t.categoria}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
              <div className="text-[10px] text-muted-foreground/60 prose prose-invert prose-xs max-w-none line-clamp-3" dangerouslySetInnerHTML={{ __html: t.body_html.replace(/<[^>]+>/g, " ").slice(0, 200) }} />
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-[10px] text-muted-foreground">Usado {t.vezes_usado}x</span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(t); setNewOpen(true); }} className="text-[10px] text-primary hover:underline">Editar</button>
                  <span className="text-muted-foreground/30">·</span>
                  <button onClick={() => del(t.id)} className="text-[10px] text-rose-400 hover:underline">Arquivar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateModal open={newOpen} onOpenChange={setNewOpen} editing={editing} onSaved={load} />
    </div>
  );
}

function TemplateModal({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (b: boolean) => void; editing: Template | null; onSaved: () => void }) {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("<p></p>");
  const [categoria, setCategoria] = useState("outros");

  useEffect(() => {
    if (open) {
      setNome(editing?.nome ?? "");
      setSubject(editing?.subject ?? "");
      setBody(editing?.body_html ?? "<p></p>");
      setCategoria(editing?.categoria ?? "outros");
    }
  }, [open, editing]);

  const save = async () => {
    if (!nome.trim() || !subject.trim()) { toast({ title: "Preencha nome e assunto", variant: "destructive" }); return; }
    if (editing) {
      await supabase.from("email_templates").update({ nome, subject, body_html: body, categoria } as any).eq("id", editing.id);
    } else {
      await supabase.from("email_templates").insert({ nome, subject, body_html: body, categoria, criado_por: user?.id, variables: [] } as any);
    }
    toast({ title: "Template salvo" });
    onOpenChange(false); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-white/10">
        <DialogHeader><DialogTitle>{editing ? "Editar Template" : "Novo Template"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-9 mt-1" /></div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background border-white/10">
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label className="text-xs">Assunto</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 mt-1" /></div>
          <div><Label className="text-xs">Corpo</Label><div className="mt-1"><RichEditor value={body} onChange={setBody} minHeight={240} /></div></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ ASSINATURAS TAB ============================ */
function AssinaturasTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<Signature[]>([]);
  const [editing, setEditing] = useState<Signature | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("email_signatures").select("*").order("is_default", { ascending: false });
    setItems((data as Signature[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const setDefault = async (id: string) => {
    await supabase.from("email_signatures").update({ is_default: false } as any).neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("email_signatures").update({ is_default: true } as any).eq("id", id);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Excluir assinatura?")) return;
    await supabase.from("email_signatures").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Assinaturas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Inseridas automaticamente no rodapé dos emails</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Assinatura
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center">
          <PenLine className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma assinatura cadastrada</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map(s => (
            <div key={s.id} className="glass-card rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">{s.nome}</h3>
                  {s.is_default && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">Padrão</span>}
                </div>
                <div className="flex gap-2 text-[10px]">
                  {!s.is_default && <button onClick={() => setDefault(s.id)} className="text-primary hover:underline">Marcar como padrão</button>}
                  <button onClick={() => { setEditing(s); setOpen(true); }} className="text-primary hover:underline">Editar</button>
                  <button onClick={() => del(s.id)} className="text-rose-400 hover:underline">Excluir</button>
                </div>
              </div>
              <div className="prose prose-invert prose-sm max-w-none p-3 rounded bg-white/[0.02] border border-white/5" dangerouslySetInnerHTML={{ __html: s.corpo_html }} />
            </div>
          ))}
        </div>
      )}

      <SignatureModal open={open} onOpenChange={setOpen} editing={editing} onSaved={load} />
    </div>
  );
}

function SignatureModal({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (b: boolean) => void; editing: Signature | null; onSaved: () => void }) {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [body, setBody] = useState("<p><b>Seu Nome</b><br/>Cargo · Palácios 3D Studio<br/>(11) 99999-9999</p>");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(editing?.nome ?? "");
      setBody(editing?.corpo_html ?? "<p><b>Seu Nome</b><br/>Cargo · Palácios 3D Studio</p>");
      setIsDefault(editing?.is_default ?? false);
    }
  }, [open, editing]);

  const save = async () => {
    if (!nome.trim()) { toast({ title: "Preencha o nome", variant: "destructive" }); return; }
    if (isDefault) await supabase.from("email_signatures").update({ is_default: false } as any).neq("id", "00000000-0000-0000-0000-000000000000");
    if (editing) {
      await supabase.from("email_signatures").update({ nome, corpo_html: body, is_default: isDefault } as any).eq("id", editing.id);
    } else {
      await supabase.from("email_signatures").insert({ nome, corpo_html: body, is_default: isDefault, owner_user_id: user?.id } as any);
    }
    onOpenChange(false); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-white/10">
        <DialogHeader><DialogTitle>{editing ? "Editar Assinatura" : "Nova Assinatura"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label className="text-xs">Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Aline — padrão" className="h-9 mt-1" /></div>
          <div><Label className="text-xs">Conteúdo</Label><div className="mt-1"><RichEditor value={body} onChange={setBody} minHeight={180} /></div></div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={isDefault} onCheckedChange={(c) => setIsDefault(!!c)} /> Usar como padrão em novas campanhas
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
