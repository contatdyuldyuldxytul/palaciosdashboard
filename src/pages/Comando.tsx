import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { TabHoje } from "@/components/comando/TabHoje";
import { TabSemana } from "@/components/comando/TabSemana";
import { TabEstrategia } from "@/components/comando/TabEstrategia";
import { TabRelatorios } from "@/components/comando/TabRelatorios";
import { CalendarCheck, CalendarRange, Compass, FileText } from "lucide-react";

export default function Comando() {
  const { hasRole } = useAuth();
  const isFundador = hasRole("fundador");
  const [tab, setTab] = useState("hoje");

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Centro de Comando</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estratégia mensal · Cadência · Tarefas diárias automáticas
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="hoje" className="gap-2">
            <CalendarCheck className="w-4 h-4" /> <span className="hidden sm:inline">Hoje</span>
          </TabsTrigger>
          <TabsTrigger value="semana" className="gap-2">
            <CalendarRange className="w-4 h-4" /> <span className="hidden sm:inline">Semana</span>
          </TabsTrigger>
          {isFundador && (
            <TabsTrigger value="estrategia" className="gap-2">
              <Compass className="w-4 h-4" /> <span className="hidden sm:inline">Estratégia</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="relatorios" className="gap-2">
            <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Relatórios</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hoje"><TabHoje /></TabsContent>
        <TabsContent value="semana"><TabSemana /></TabsContent>
        {isFundador && (
          <TabsContent value="estrategia"><TabEstrategia onImported={() => setTab("hoje")} /></TabsContent>
        )}
        <TabsContent value="relatorios"><TabRelatorios /></TabsContent>
      </Tabs>
    </div>
  );
}
