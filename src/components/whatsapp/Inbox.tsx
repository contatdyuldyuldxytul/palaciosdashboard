import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Search, Send, Zap, Link2, Check, MessageCircle, Loader2, User, UserPlus } from "lucide-react";
import {
  useConversations,
  useWhatsAppMessages,
  useMarkConversationRead,
  useLinkConversationToPerson,
  useSendWhatsApp,
  useWhatsAppTemplates,
  renderTemplate,
  type WhatsAppInstance,
} from "@/hooks/useWhatsApp";
import { supabase } from "@/integrations/supabase/client";

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "agora";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

function jidPhone(jid: string) {
  return jid.split("@")[0]?.split(":")[0] || jid;
}

function initials(s?: string | null, fallback = "?") {
  if (!s) return fallback;
  return s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || fallback;
}

// Hook: fetch profile picture + pushName for active conversation
function useContactInfo(instanceId?: string | null, remoteJid?: string | null) {
  return useQuery({
    queryKey: ["wa-contact-info", instanceId, remoteJid],
    enabled: !!(instanceId && remoteJid),
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("evolution-contact-info", {
        body: { instance_id: instanceId, remote_jid: remoteJid },
      });
      if (error) throw error;
      return data as { profilePictureUrl: string | null; pushName: string | null; phone: string };
    },
  });
}

export default function Inbox({ instance }: { instance: WhatsAppInstance }) {
  const [activeJid, setActiveJid] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "linked" | "unlinked">("all");
  const [search, setSearch] = useState("");

  const { conversations } = useConversations(instance.id);
  const { data: messages } = useWhatsAppMessages(instance.id, activeJid);
  const markRead = useMarkConversationRead();
  const link = useLinkConversationToPerson();
  const send = useSendWhatsApp();
  const { data: templates } = useWhatsAppTemplates();
  const [draft, setDraft] = useState("");
  const { data: contactInfo } = useContactInfo(instance.id, activeJid);

  // pushName cached per conv from messages.raw (for sidebar list)
  const pushNameMap = useMemo(() => {
    const m = new Map<string, string>();
    return m;
  }, []);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (filter === "unread" && c.unread === 0) return false;
      if (filter === "linked" && !c.person_id && !c.deal_id) return false;
      if (filter === "unlinked" && (c.person_id || c.deal_id)) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!c.remote_jid.toLowerCase().includes(s) && !(c.last?.content || "").toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [conversations, filter, search]);

  const activeConv = conversations.find((c) => c.remote_jid === activeJid);
  const headerName = contactInfo?.pushName || (activeJid ? `+${jidPhone(activeJid)}` : "");

  useEffect(() => {
    if (activeJid && activeConv?.unread) {
      markRead.mutate({ instance_id: instance.id, remote_jid: activeJid });
    }
  }, [activeJid]);

  const handleSend = () => {
    if (!activeJid || !draft.trim()) return;
    const to = jidPhone(activeJid);
    send.mutate({ instance_id: instance.id, to, content: draft, person_id: activeConv?.person_id || undefined, deal_id: activeConv?.deal_id || undefined }, {
      onSuccess: () => { setDraft(""); },
      onError: (e: any) => toast({ title: "Erro", description: String(e?.message || e), variant: "destructive" }),
    });
  };

  return (
    <div className="grid grid-cols-12 gap-3 h-[calc(100vh-220px)] min-h-[500px]">
      {/* Lista */}
      <div className="col-span-3 glass-card rounded-xl border border-white/10 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-white/10 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="bg-white/5 border-white/10 h-8 pl-8 text-xs" />
          </div>
          <div className="flex gap-1 text-[10px]">
            {(["all", "unread", "linked", "unlinked"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2 py-1 rounded ${filter === f ? "bg-emerald-500/20 text-emerald-300" : "text-muted-foreground hover:bg-white/5"}`}>
                {f === "all" ? "Todas" : f === "unread" ? "Não lidas" : f === "linked" ? "Vinc." : "Sem CRM"}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {!filtered.length && <p className="p-4 text-xs text-muted-foreground text-center">Nenhuma conversa.</p>}
          {filtered.map((c) => (
            <ConversationRow
              key={c.remote_jid}
              instanceId={instance.id}
              conv={c}
              active={activeJid === c.remote_jid}
              onClick={() => setActiveJid(c.remote_jid)}
            />
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="col-span-6 glass-card rounded-xl border border-white/10 flex flex-col overflow-hidden">
        {!activeJid ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="w-12 h-12 mb-2 opacity-30" />
            <p className="text-sm">Selecione uma conversa</p>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-white/10 flex items-center gap-3">
              <Avatar className="w-10 h-10 border border-white/10">
                {contactInfo?.profilePictureUrl && <AvatarImage src={contactInfo.profilePictureUrl} />}
                <AvatarFallback className="bg-emerald-500/20 text-emerald-300 text-xs">
                  {initials(contactInfo?.pushName, jidPhone(activeJid).slice(-2))}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground truncate">{headerName}</div>
                <div className="text-[10px] text-muted-foreground">+{jidPhone(activeJid)} · {messages?.length || 0} msgs</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white/[0.01]">
              {messages?.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 text-xs ${m.direction === "out" ? "bg-emerald-500/20 text-foreground border border-emerald-500/30" : "bg-white/[0.05] text-foreground border border-white/10"}`}>
                    <div className="whitespace-pre-wrap break-words">{m.content || <em className="text-muted-foreground">(sem texto)</em>}</div>
                    <div className="text-[9px] text-muted-foreground mt-1 text-right">
                      {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {m.direction === "out" && <Check className="w-2.5 h-2.5 inline ml-1" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-white/10 space-y-2">
              <div className="flex gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Digite uma mensagem..."
                  rows={2}
                  className="bg-white/5 border-white/10 text-sm resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8">
                      <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Templates
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 bg-background border-white/10 p-1">
                    {!templates?.length && <p className="p-3 text-xs text-muted-foreground">Sem templates. Crie na aba Templates.</p>}
                    {templates?.map((t) => (
                      <button key={t.id} onClick={() => {
                        const rendered = renderTemplate(t.conteudo, { nome: contactInfo?.pushName || "", primeiro_nome: (contactInfo?.pushName || "").split(" ")[0] || "" });
                        setDraft((d) => d ? `${d}\n${rendered}` : rendered);
                      }}
                        className="w-full text-left p-2 rounded hover:bg-white/5">
                        <div className="text-xs font-semibold text-foreground">{t.nome}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{t.conteudo}</div>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
                <Button onClick={handleSend} disabled={send.isPending || !draft.trim() || instance.status !== "connected"} className="ml-auto h-8">
                  {send.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1.5" /> Enviar</>}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Context */}
      <div className="col-span-3 glass-card rounded-xl border border-white/10 p-4 overflow-y-auto">
        {!activeJid ? (
          <p className="text-xs text-muted-foreground text-center pt-8">—</p>
        ) : (
          <ContextPanel
            instanceId={instance.id}
            remoteJid={activeJid}
            conv={activeConv}
            contactInfo={contactInfo}
            onLink={(person_id) => link.mutate({ instance_id: instance.id, remote_jid: activeJid, person_id })}
          />
        )}
      </div>
    </div>
  );
}

function ConversationRow({ instanceId, conv, active, onClick }: { instanceId: string; conv: any; active: boolean; onClick: () => void }) {
  // Lightweight: only fetch pic for active conversations to avoid bursts
  const { data } = useQuery({
    queryKey: ["wa-contact-info", instanceId, conv.remote_jid],
    enabled: active,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("evolution-contact-info", {
        body: { instance_id: instanceId, remote_jid: conv.remote_jid },
      });
      return data as any;
    },
  });
  const name = data?.pushName || `+${jidPhone(conv.remote_jid)}`;
  return (
    <button onClick={onClick}
      className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/[0.03] flex items-start gap-2.5 ${active ? "bg-white/[0.05]" : ""}`}>
      <Avatar className="w-9 h-9 border border-white/10 shrink-0">
        {data?.profilePictureUrl && <AvatarImage src={data.profilePictureUrl} />}
        <AvatarFallback className="bg-emerald-500/15 text-emerald-300 text-[10px]">
          {initials(data?.pushName, jidPhone(conv.remote_jid).slice(-2))}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-semibold text-foreground truncate">{name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{timeAgo(conv.last.created_at)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground truncate flex-1">{conv.last.content || "(sem texto)"}</span>
          {conv.unread > 0 && <Badge className="bg-emerald-500 text-white h-4 px-1.5 text-[10px]">{conv.unread}</Badge>}
        </div>
        {(conv.person_id || conv.deal_id) && (
          <div className="mt-1 flex items-center gap-1 text-[9px] text-emerald-400/80">
            <Link2 className="w-2.5 h-2.5" /> CRM
          </div>
        )}
      </div>
    </button>
  );
}

function ContextPanel({ instanceId, remoteJid, conv, contactInfo, onLink }: { instanceId: string; remoteJid: string; conv: any; contactInfo: any; onLink: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const phone = jidPhone(remoteJid);

  useEffect(() => {
    if (!search) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("crm_persons").select("id, nome, telefone, email").or(`nome.ilike.%${search}%,telefone.ilike.%${search}%`).limit(8);
      setResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center text-center">
        <Avatar className="w-20 h-20 border border-white/10 mb-2">
          {contactInfo?.profilePictureUrl && <AvatarImage src={contactInfo.profilePictureUrl} />}
          <AvatarFallback className="bg-emerald-500/20 text-emerald-300 text-lg">
            {initials(contactInfo?.pushName, phone.slice(-2))}
          </AvatarFallback>
        </Avatar>
        <div className="text-sm font-semibold text-foreground">{contactInfo?.pushName || "Contato sem nome"}</div>
        <div className="text-xs text-muted-foreground">+{phone}</div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">CRM</div>
        {conv?.person_id ? (
          <div className="rounded-lg p-2 bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5" /> Vinculado a um contato
          </div>
        ) : (
          <>
            <p className="text-[11px] text-muted-foreground mb-2">Este número ainda não está no CRM.</p>
            <Button onClick={() => setAddOpen(true)} size="sm" className="w-full h-8 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Adicionar ao CRM
            </Button>
            <div className="text-[10px] text-muted-foreground text-center my-2">ou vincule a um existente</div>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lead..." className="bg-white/5 border-white/10 h-8 text-xs" />
            <div className="mt-2 space-y-1">
              {results.map((r) => (
                <button key={r.id} onClick={() => onLink(r.id)} className="w-full text-left p-2 rounded hover:bg-white/5 border border-white/5">
                  <div className="text-xs text-foreground">{r.nome}</div>
                  <div className="text-[10px] text-muted-foreground">{r.telefone || r.email}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <AddToCrmDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultName={contactInfo?.pushName || ""}
        phone={phone}
        onCreated={(id) => { onLink(id); setAddOpen(false); }}
      />
    </div>
  );
}

function AddToCrmDialog({ open, onClose, defaultName, phone, onCreated }: { open: boolean; onClose: () => void; defaultName: string; phone: string; onCreated: (id: string) => void }) {
  const [nome, setNome] = useState(defaultName);
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("+" + phone);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => { setNome(defaultName); setTelefone("+" + phone); }, [defaultName, phone, open]);

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("crm_persons")
      .insert({ nome: nome.trim(), email: email.trim() || null, telefone: telefone.trim() || null })
      .select("id").single();
    setSaving(false);
    if (error || !data) {
      toast({ title: "Erro ao criar", description: String(error?.message || ""), variant: "destructive" });
      return;
    }
    toast({ title: "Contato adicionado ao CRM" });
    qc.invalidateQueries({ queryKey: ["crm_persons"] });
    onCreated(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-background border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UserPlus className="w-4 h-4 text-emerald-400" /> Adicionar ao CRM
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="bg-white/5 border-white/10 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="bg-white/5 border-white/10 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opcional" className="bg-white/5 border-white/10 mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Salvar e vincular"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
