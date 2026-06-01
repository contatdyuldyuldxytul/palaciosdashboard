import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { MessageCircle, RefreshCw, Smartphone, LogOut, Trash2, Check, CircleAlert, Loader2 } from "lucide-react";
import { useWhatsAppActions, type WhatsAppInstance } from "@/hooks/useWhatsApp";

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

export default function ConnectionTab({ instance, owner }: { instance: WhatsAppInstance | null; owner?: string }) {
  const actions = useWhatsAppActions();

  useEffect(() => {
    if (!instance || instance.status !== "connecting") return;
    const i = setInterval(() => { actions.refreshQr.mutate(); actions.status.mutate(); }, 4000);
    return () => clearInterval(i);
  }, [instance?.id, instance?.status]);

  if (!instance) {
    return (
      <div className="glass-card rounded-xl p-8 border border-white/10 text-center max-w-md mx-auto">
        <Smartphone className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold text-foreground">Conecte seu WhatsApp</h3>
        <p className="text-sm text-muted-foreground mb-4">Gere o QR Code e escaneie com seu celular.</p>
        <Button onClick={() => actions.connect.mutate(undefined, {
          onSuccess: () => toast({ title: "Instância criada" }),
          onError: (e: any) => toast({ title: "Erro", description: String(e?.message || e), variant: "destructive" }),
        })} disabled={actions.connect.isPending}>
          {actions.connect.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
          Conectar WhatsApp
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-5 border border-white/10 space-y-4 max-w-md mx-auto">
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
            <div className="text-[11px] text-muted-foreground">{instance.phone_number ? `+${instance.phone_number}` : instance.instance_name}</div>
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
                alt="QR Code"
                className="mx-auto rounded-lg bg-white p-2"
                style={{ width: 240, height: 240 }}
              />
              <p className="text-xs text-muted-foreground">Abra o WhatsApp → Aparelhos conectados → escaneie o código.</p>
            </>
          ) : (
            <div className="py-12"><Loader2 className="w-6 h-6 mx-auto animate-spin text-amber-400 mb-2" /><p className="text-xs text-muted-foreground">Gerando QR Code…</p></div>
          )}
          <Button size="sm" variant="outline" onClick={() => actions.refreshQr.mutate()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar QR
          </Button>
        </div>
      )}

      {instance.status === "connected" && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-foreground">WhatsApp conectado.</span>
        </div>
      )}

      {instance.status === "disconnected" && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 flex items-center gap-2">
          <CircleAlert className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Desconectado.</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {instance.status !== "connected" && (
          <Button size="sm" onClick={() => actions.connect.mutate()}><MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Conectar</Button>
        )}
        {instance.status === "connected" && (
          <Button size="sm" variant="outline" onClick={() => actions.disconnect.mutate()}><LogOut className="w-3.5 h-3.5 mr-1.5" /> Desconectar</Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => actions.status.mutate()}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar</Button>
        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 ml-auto"
          onClick={() => { if (confirm("Remover instância?")) actions.remove.mutate(); }}>
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Excluir
        </Button>
      </div>
    </div>
  );
}
