import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InboxView } from "@/components/crm/email/InboxView";
import { SequencesView } from "@/components/crm/email/SequencesView";
import { Mail, GitBranch } from "lucide-react";

export default function Email() {
  const [tab, setTab] = useState("inbox");
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">E-mail</h1>
        <p className="text-sm text-white/50">Caixa de entrada conectada ao Gmail e sequências de follow-up</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="inbox" className="data-[state=active]:bg-white/10">
            <Mail className="w-4 h-4 mr-2" /> Caixa de entrada
          </TabsTrigger>
          <TabsTrigger value="sequences" className="data-[state=active]:bg-white/10">
            <GitBranch className="w-4 h-4 mr-2" /> Sequências
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="mt-4"><InboxView /></TabsContent>
        <TabsContent value="sequences" className="mt-4"><SequencesView /></TabsContent>
      </Tabs>
    </div>
  );
}
