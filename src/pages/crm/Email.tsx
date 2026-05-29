import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InboxView } from "@/components/crm/email/InboxView";
import { SequencesView } from "@/components/crm/email/SequencesView";
import { CampanhasView } from "@/components/crm/CampanhasView";
import { Mail, GitBranch, Megaphone } from "lucide-react";

export default function Email() {
  const [tab, setTab] = useState("inbox");
  return (
    <div className="p-3 md:p-6 space-y-3 md:space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">E-mail</h1>
        <p className="text-sm text-muted-foreground">Caixa de entrada, sequências de follow-up e campanhas em massa</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card/50 border border-border">
          <TabsTrigger value="inbox" className="data-[state=active]:bg-accent">
            <Mail className="w-4 h-4 mr-2" /> Caixa de entrada
          </TabsTrigger>
          <TabsTrigger value="sequences" className="data-[state=active]:bg-accent">
            <GitBranch className="w-4 h-4 mr-2" /> Sequências
          </TabsTrigger>
          <TabsTrigger value="campanhas" className="data-[state=active]:bg-accent">
            <Megaphone className="w-4 h-4 mr-2" /> Campanhas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="mt-4"><InboxView /></TabsContent>
        <TabsContent value="sequences" className="mt-4"><SequencesView /></TabsContent>
        <TabsContent value="campanhas" className="mt-4"><CampanhasView /></TabsContent>
      </Tabs>
    </div>
  );
}
