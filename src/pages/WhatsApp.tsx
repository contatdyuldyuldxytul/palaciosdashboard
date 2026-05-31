import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useMyWhatsAppInstance,
  useAllWhatsAppInstances,
  useWhatsAppRealtime,
  useWhatsAppActions,
  useWhatsAppMessages,
  useWhatsAppScheduled,
  useScheduleWhatsApp,
  useCancelScheduled,
  useSendWhatsApp,
  type WhatsAppInstance,
} from "@/hooks/useWhatsApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { MessageCircle, RefreshCw, Smartphone, LogOut, Trash2, Send, Clock, X, Check, CircleAlert, Loader2 } from "lucide-react";

function StatusBadge({ status }: { status: WhatsAppInstance["status"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    connected: { label: "Conectado", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    connecting: { label: "Conectando...", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    disconnected: { label: "Desconectado", cls: "bg-white/5 text-muted-foreground border-white/10" },
    error: { label: "Erro", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  };
  const m = map[status] || map.disconnected;
  return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
}

function InstanceCard({ instance, owner }: { instance: WhatsAppInstance | null; owner?: string }) {
  const actions = useWhatsAppActions();
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!instance || instance.status !== "connecting") { setPolling(false); return; }
    setPolling(true);
    const i = setInterval(() => {
      actions.refreshQr.mutate();
      actions.status.mutate();
    }, 4000);
    return () => clearInterval(i);
  }, [instance?.id, instance?.status]);

  if (!instance) {
    return (
      <div className="glass-card rounded-xl p-6 border border-white/10 text-center">
        <Smartphone className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-base font-semibold text-foreground">Conecte seu WhatsApp</h3>
        <p className="text-xs text-muted-foreground mb-4">Você ainda não possui uma instância. Clique para gerar o QR Code.</p>
        <Button onClick={() => actions.connect.mutate(undefined, {
          onSuccess: () => toast({ title: "Instância criada", description: "Escaneie o QR Code com seu WhatsApp." }),
          onError: (e: any) => toast({ title: "Erro", description: String(e?.message || e), variant: "destructive" }),
        })} disabled={actions.connect.isPending}>
          {actions.connect.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
          Conectar WhatsApp
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-5 border border-white/10 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {instance.profile_picture_url ? (
            <img src={instance.profile_picture_url} className="w-12 h-12 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-foreground">{instance.profile_name || owner || instance.instance_name}</div>
            <div className="text-[11px] text-muted-foreground">
              {instance.phone_number ? `+${instance.phone_number}` : instance.instance_name}
            </div>
          </div>
        </div>
        <StatusBadge status={instance.status} />
      </div>

      {instance.status === "connecting" && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-3">
          {instance.qr_code ? (
            <>
              <img
                src={instance.qr_code.startsWith("data:") ? instance.qr_code : `data:image/png;base64,${instance.qr_code}`}
                alt="QR Code WhatsApp"
                className="mx-auto rounded-lg bg-white p-2"
                style={{ width: 240, height: 240 }}
              />
              <p className="text-xs text-muted-foreground">
                Abra o WhatsApp → ⋮ → Aparelhos conectados → Conectar um aparelho → escaneie o código.
              </p>
            </>
          ) : (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 mx-auto animate-spin text-amber-400 mb-2" />
              <p className="text-xs text-muted-foreground">Gerando QR Code…</p>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => actions.refreshQr.mutate()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar QR
          </Button>
        </div>
      )}

      {instance.status === "connected" && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-foreground">WhatsApp conectado e pronto para enviar/receber mensagens.</span>
        </div>
      )}

      {instance.status === "disconnected" && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 flex items-center gap-2">
          <CircleAlert className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Desconectado. Clique em Conectar para gerar um novo QR.</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {instance.status !== "connected" && (
          <Button size="sm" onClick={() => actions.connect.mutate()} disabled={actions.connect.isPending}>
            <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Conectar
          </Button>
        )}
        {instance.status === "connected" && (
          <Button size="sm" variant="outline" onClick={() => actions.disconnect.mutate()}>
            <LogOut className="w-3.5 h-3.5 mr-1.5" /> Desconectar
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => actions.status.mutate()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar status
        </Button>
        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 ml-auto"
          onClick={() => {
            if (confirm("Remover instância e desconectar?")) actions.remove.mutate();
          }}>
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Excluir
        </Button>
      </div>
    </div>
  );
}

function SendComposer({ instance }: { instance: WhatsAppInstance }) {
  const [to, setTo] = useState("");
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [when, setWhen] = useState<string>("");
  const send = useSendWhatsApp();
  const schedule = useScheduleWhatsApp();

  const submit = () => {
    if (!to.trim() || !content.trim()) return toast({ title: "Preencha número e mensagem", variant: "destructive" });
    if (mode === "now") {
      send.mutate({ instance_id: instance.id, to, content }, {
        onSuccess: () => { toast({ title: "Mensagem enviada" }); setContent(""); setTo(""); },
        onError: (e: any) => toast({ title: "Erro", description: String(e?.message || e), variant: "destructive" }),
      });
    } else {
      if (!when) return toast({ title: "Defina a data/hora", variant: "destructive" });
      schedule.mutate({ instance_id: instance.id, to, content, scheduled_for: new Date(when).toISOString() }, {
        onSuccess: () => { toast({ title: "Mensagem programada" }); setContent(""); setTo(""); setWhen(""); },
        onError: (e: any) => toast({ title: "Erro", description: String(e?.message || e), variant: "destructive" }),
      });
    }
  };

  const disabled = instance.status !== "connected";
  return (
    <div className="glass-card rounded-xl p-5 border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Send className="w-4 h-4 text-emerald-400" /> Enviar mensagem
        </h3>
        <div className="flex gap-1 text-[11px]">
          <button onClick={() => setMode("now")}
            className={`px-2 py-1 rounded ${mode === "now" ? "bg-emerald-500/20 text-emerald-300" : "text-muted-foreground hover:bg-white/5"}`}>Agora</button>
          <button onClick={() => setMode("schedule")}
            className={`px-2 py-1 rounded ${mode === "schedule" ? "bg-amber-500/20 text-amber-300" : "text-muted-foreground hover:bg-white/5"}`}>Programar</button>
        </div>
      </div>
      <div>
        <Label className="text-[11px]">Para (DDD + número)</Label>
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="11999998888" disabled={disabled}
          className="bg-white/5 border-white/10 h-9 text-sm" />
      </div>
      <div>
        <Label className="text-[11px]">Mensagem</Label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} disabled={disabled}
          className="bg-white/5 border-white/10 text-sm" placeholder="Escreva sua mensagem..." />
      </div>
      {mode === "schedule" && (
        <div>
          <Label className="text-[11px]">Quando enviar</Label>
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} disabled={disabled}
            className="bg-white/5 border-white/10 h-9 text-sm" />
        </div>
      )}
      <Button onClick={submit} disabled={disabled || send.isPending || schedule.isPending} className="w-full">
        {(send.isPending || schedule.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
          mode === "now" ? <Send className="w-4 h-4 mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
        {mode === "now" ? "Enviar agora" : "Programar"}
      </Button>
      {disabled && <p className="text-[11px] text-amber-400">Conecte o WhatsApp para habilitar o envio.</p>}
    </div>
  );
}

function MessagesList({ instanceId }: { instanceId: string }) {
  const { data } = useWhatsAppMessages(instanceId);
  return (
    <div className="glass-card rounded-xl p-5 border border-white/10">
      <h3 className="text-sm font-semibold text-foreground mb-3">Últimas mensagens</h3>
      {!data?.length ? (
        <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda.</p>
      ) : (
        <ul className="space-y-2 max-h-96 overflow-auto">
          {data.map(m => (
            <li key={m.id} className={`rounded-lg p-2.5 text-xs border ${m.direction === "out" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/[0.03] border-white/10"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {m.direction === "out" ? "Enviada" : "Recebida"} · {m.remote_jid.split("@")[0]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(m.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="text-foreground whitespace-pre-wrap break-words">{m.content || <em className="text-muted-foreground">(sem texto)</em>}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScheduledList({ instanceId }: { instanceId: string }) {
  const { data } = useWhatsAppScheduled(instanceId);
  const cancel = useCancelScheduled();
  const pendings = data?.filter(d => d.status === "pending") || [];
  return (
    <div className="glass-card rounded-xl p-5 border border-white/10">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-400" /> Mensagens programadas
      </h3>
      {!pendings.length ? (
        <p className="text-xs text-muted-foreground">Nenhuma programação pendente.</p>
      ) : (
        <ul className="space-y-2">
          {pendings.map(s => (
            <li key={s.id} className="rounded-lg p-2.5 border border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-2">
              <div className="text-xs">
                <div className="text-foreground font-medium">{s.to_number}</div>
                <div className="text-muted-foreground line-clamp-1">{s.content}</div>
                <div className="text-[10px] text-amber-400 mt-0.5">
                  {new Date(s.scheduled_for).toLocaleString("pt-BR")}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => cancel.mutate(s.id)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function WhatsApp() {
  useWhatsAppRealtime();
  const { isFundador, profile } = useAuth();
  const { data: instance } = useMyWhatsAppInstance();
  const { data: allInstances } = useAllWhatsAppInstances(isFundador);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-emerald-400" /> WhatsApp
        </h1>
        <p className="text-sm text-muted-foreground">Conecte sua conta para enviar, programar e receber mensagens diretamente da plataforma.</p>
      </div>

      <Tabs defaultValue="me" className="w-full">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="me">Minha conta</TabsTrigger>
          {isFundador && <TabsTrigger value="all">Todas as contas</TabsTrigger>}
        </TabsList>

        <TabsContent value="me" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InstanceCard instance={instance ?? null} owner={profile?.full_name || profile?.email} />
            {instance && <SendComposer instance={instance} />}
          </div>
          {instance && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ScheduledList instanceId={instance.id} />
              <MessagesList instanceId={instance.id} />
            </div>
          )}
        </TabsContent>

        {isFundador && (
          <TabsContent value="all" className="mt-4">
            <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Colaborador</th>
                    <th className="text-left p-3">Número</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Última conexão</th>
                  </tr>
                </thead>
                <tbody>
                  {!allInstances?.length && (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-xs">Nenhuma instância cadastrada.</td></tr>
                  )}
                  {allInstances?.map(i => (
                    <tr key={i.id} className="border-t border-white/5">
                      <td className="p-3 text-foreground">{i.profile_name || i.instance_name}</td>
                      <td className="p-3 text-muted-foreground">{i.phone_number ? `+${i.phone_number}` : "—"}</td>
                      <td className="p-3"><StatusBadge status={i.status} /></td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {i.last_connected_at ? new Date(i.last_connected_at).toLocaleString("pt-BR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
