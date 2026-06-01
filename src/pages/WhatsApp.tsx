import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyWhatsAppInstance, useAllWhatsAppInstances, useWhatsAppRealtime } from "@/hooks/useWhatsApp";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MessageCircle, Megaphone, Zap, Smartphone } from "lucide-react";
import Inbox from "@/components/whatsapp/Inbox";
import CampaignsView from "@/components/whatsapp/CampaignsView";
import TemplatesView from "@/components/whatsapp/TemplatesView";
import ConnectionTab from "@/components/whatsapp/ConnectionTab";

export default function WhatsApp() {
  useWhatsAppRealtime();
  const { isFundador, profile } = useAuth();
  const { data: myInstance } = useMyWhatsAppInstance();
  const { data: allInstances } = useAllWhatsAppInstances(isFundador);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  const activeInstance = useMemo(() => {
    if (isFundador && selectedInstanceId) {
      return allInstances?.find((i) => i.id === selectedInstanceId) || myInstance || null;
    }
    return myInstance || null;
  }, [isFundador, selectedInstanceId, allInstances, myInstance]);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-emerald-400" /> WhatsApp
          </h1>
          <p className="text-xs text-muted-foreground">Inbox em tempo real, disparo em massa e templates rápidos.</p>
        </div>
        {isFundador && allInstances && allInstances.length > 0 && (
          <Select value={selectedInstanceId || myInstance?.id || ""} onValueChange={(v) => setSelectedInstanceId(v)}>
            <SelectTrigger className="w-56 bg-white/5 border-white/10 h-9 text-xs">
              <SelectValue placeholder="Conta WhatsApp" />
            </SelectTrigger>
            <SelectContent>
              {allInstances.map((i) => (
                <SelectItem key={i.id} value={i.id} className="text-xs">
                  {i.profile_name || i.instance_name} {i.phone_number && `(+${i.phone_number})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="inbox" className="w-full">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="inbox"><MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Conversas</TabsTrigger>
          <TabsTrigger value="campaigns"><Megaphone className="w-3.5 h-3.5 mr-1.5" /> Disparos</TabsTrigger>
          <TabsTrigger value="templates"><Zap className="w-3.5 h-3.5 mr-1.5" /> Templates</TabsTrigger>
          <TabsTrigger value="connection"><Smartphone className="w-3.5 h-3.5 mr-1.5" /> Conexão</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          {activeInstance ? <Inbox instance={activeInstance} /> : <NoInstance />}
        </TabsContent>
        <TabsContent value="campaigns" className="mt-4">
          {activeInstance ? <CampaignsView instance={activeInstance} /> : <NoInstance />}
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
          <TemplatesView />
        </TabsContent>
        <TabsContent value="connection" className="mt-4">
          <ConnectionTab instance={activeInstance} owner={profile?.full_name || profile?.email} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NoInstance() {
  return (
    <div className="glass-card rounded-xl border border-white/10 p-12 text-center">
      <Smartphone className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-40" />
      <p className="text-sm text-muted-foreground">Conecte um WhatsApp na aba "Conexão" para começar.</p>
    </div>
  );
}
