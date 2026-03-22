import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/layouts/AppLayout";
import { VendasLayout } from "@/layouts/VendasLayout";
import { GestaoLayout } from "@/layouts/GestaoLayout";
import { ClientesLayout } from "@/layouts/ClientesLayout";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Funil from "@/pages/Funil";
import Metas from "@/pages/Metas";
import Scripts from "@/pages/Scripts";
import AssistenteVendas from "@/pages/AssistenteVendas";
import ClientesAtivos from "@/pages/ClientesAtivos";
import Financeiro from "@/pages/Financeiro";
import Login from "@/pages/Login";
import Placeholder from "@/pages/Placeholder";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />

            {/* Vendas */}
            <Route path="/vendas" element={<VendasLayout />}>
              <Route index element={<Leads />} />
              <Route path="funil" element={<Funil />} />
              <Route path="metas" element={<Metas />} />
              <Route path="scripts" element={<Scripts />} />
              <Route path="ligacoes" element={<Placeholder title="Ligações" />} />
              <Route path="assistente" element={<AssistenteVendas />} />
            </Route>

            {/* Gestão */}
            <Route path="/gestao" element={<GestaoLayout />}>
              <Route index element={<Placeholder title="Visão Estratégica" />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="metas-forecast" element={<Placeholder title="Metas & Forecast" />} />
              <Route path="documentos" element={<Placeholder title="Documentos & Reuniões" />} />
              <Route path="assistente" element={<Placeholder title="Assistente do Fundador" />} />
            </Route>

            {/* Clientes */}
            <Route path="/clientes" element={<ClientesLayout />}>
              <Route index element={<ClientesAtivos />} />
              <Route path="anteriores" element={<Placeholder title="Clientes Anteriores" />} />
            </Route>

            {/* Assistente IA */}
            <Route path="/assistente" element={<Placeholder title="Assistente Geral" />} />

            {/* Redirects for old routes */}
            <Route path="/leads" element={<Navigate to="/vendas" replace />} />
            <Route path="/funil" element={<Navigate to="/vendas/funil" replace />} />
            <Route path="/metas" element={<Navigate to="/vendas/metas" replace />} />
            <Route path="/scripts" element={<Navigate to="/vendas/scripts" replace />} />
            <Route path="/financeiro" element={<Navigate to="/gestao/financeiro" replace />} />
            <Route path="/clientes-ativos" element={<Navigate to="/clientes" replace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
