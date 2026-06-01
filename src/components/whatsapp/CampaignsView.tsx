import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Play, Pause, X, Megaphone } from "lucide-react";
import { useWhatsAppCampaigns, useUpdateCampaign, type WhatsAppInstance } from "@/hooks/useWhatsApp";
import CampaignWizard from "./CampaignWizard";

const statusColors: Record<string, string> = {
  running: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  paused: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
  draft: "bg-white/5 text-muted-foreground border-white/10",
};

export default function CampaignsView({ instance }: { instance: WhatsAppInstance }) {
  const [showWizard, setShowWizard] = useState(false);
  const { data: campaigns } = useWhatsAppCampaigns(instance.id);
  const update = useUpdateCampaign();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-emerald-400" /> Campanhas de disparo
        </h2>
        {!showWizard && (
          <Button onClick={() => setShowWizard(true)} disabled={instance.status !== "connected"}>
            <Plus className="w-4 h-4 mr-1.5" /> Nova campanha
          </Button>
        )}
      </div>

      {showWizard && <CampaignWizard instance={instance} onDone={() => setShowWizard(false)} />}

      <div className="space-y-2">
        {!campaigns?.length && !showWizard && (
          <div className="glass-card rounded-xl p-8 text-center border border-white/10">
            <Megaphone className="w-10 h-10 mx-auto text-muted-foreground mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">Nenhuma campanha ainda. Crie a primeira!</p>
          </div>
        )}
        {campaigns?.map((c) => {
          const progress = c.total > 0 ? Math.round(((c.sent + c.failed) / c.total) * 100) : 0;
          return (
            <div key={c.id} className="glass-card rounded-xl p-4 border border-white/10">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{c.nome}</h3>
                    <Badge variant="outline" className={statusColors[c.status]}>{c.status}</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Criada em {new Date(c.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="flex gap-1">
                  {c.status === "running" && (
                    <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: c.id, patch: { status: "paused" } })}>
                      <Pause className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {c.status === "paused" && (
                    <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: c.id, patch: { status: "running" } })}>
                      <Play className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {(c.status === "running" || c.status === "paused") && (
                    <Button size="sm" variant="ghost" className="text-red-400" onClick={() => { if (confirm("Cancelar campanha?")) update.mutate({ id: c.id, patch: { status: "cancelled" } }); }}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <Progress value={progress} className="h-1.5 mb-2" />

              <div className="grid grid-cols-4 gap-3 text-center">
                <div><div className="text-base font-bold text-foreground">{c.total}</div><div className="text-[10px] text-muted-foreground">Total</div></div>
                <div><div className="text-base font-bold text-emerald-400">{c.sent}</div><div className="text-[10px] text-muted-foreground">Enviadas</div></div>
                <div><div className="text-base font-bold text-amber-400">{c.total - c.sent - c.failed}</div><div className="text-[10px] text-muted-foreground">Pendentes</div></div>
                <div><div className="text-base font-bold text-red-400">{c.failed}</div><div className="text-[10px] text-muted-foreground">Falhas</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
