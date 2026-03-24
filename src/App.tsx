import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/layouts/AppLayout";
import { VendasLayout } from "@/layouts/VendasLayout";

import { ClientesLayout } from "@/layouts/ClientesLayout";
import { CeoLayout } from "@/layouts/CeoLayout";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import TeamMemberDashboard from "@/pages/TeamMemberDashboard";
import Funil from "@/pages/Funil";
import Metas from "@/pages/Metas";
import Scripts from "@/pages/Scripts";
import AssistenteVendas from "@/pages/AssistenteVendas";

import AssistenteGeral from "@/pages/AssistenteGeral";
import ClientesAtivos from "@/pages/ClientesAtivos";

import Login from "@/pages/Login";
import Placeholder from "@/pages/Placeholder";
import NotFound from "@/pages/NotFound";
import CeoFinanceiro from "@/pages/ceo/CeoFinanceiro";
import CeoMetas from "@/pages/ceo/CeoMetas";
import CeoSaude from "@/pages/ceo/CeoSaude";
import CeoPipeline from "@/pages/ceo/CeoPipeline";
import CeoJuridico from "@/pages/ceo/CeoJuridico";
import CeoProcessos from "@/pages/ceo/CeoProcessos";
import CeoMemoria from "@/pages/ceo/CeoMemoria";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
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

              {/* Team member dashboards */}
              <Route path="/equipe/aline" element={<TeamMemberDashboard memberName="Aline" initials="AL" />} />
              <Route path="/equipe/milena" element={<TeamMemberDashboard memberName="Milena" initials="MI" />} />


              {/* Clientes */}
              <Route path="/clientes" element={<ClientesLayout />}>
                <Route index element={<ClientesAtivos />} />
                <Route path="anteriores" element={<Placeholder title="Clientes Anteriores" />} />
              </Route>

              {/* CEO — Fundador only */}
              <Route path="/ceo" element={<ProtectedRoute requireRole="fundador"><CeoLayout /></ProtectedRoute>}>
                <Route index element={<CeoFinanceiro />} />
                <Route path="metas" element={<CeoMetas />} />
                <Route path="saude" element={<CeoSaude />} />
                <Route path="pipeline" element={<CeoPipeline />} />
                <Route path="juridico" element={<CeoJuridico />} />
                <Route path="processos" element={<CeoProcessos />} />
                <Route path="memoria" element={<CeoMemoria />} />
              </Route>

              {/* Assistente IA */}
              <Route path="/assistente" element={<AssistenteGeral />} />

              {/* Redirects */}
              <Route path="/leads" element={<Navigate to="/vendas" replace />} />
              <Route path="/funil" element={<Navigate to="/vendas/funil" replace />} />
              <Route path="/metas" element={<Navigate to="/vendas/metas" replace />} />
              <Route path="/scripts" element={<Navigate to="/vendas/scripts" replace />} />
              
              <Route path="/clientes-ativos" element={<Navigate to="/clientes" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
