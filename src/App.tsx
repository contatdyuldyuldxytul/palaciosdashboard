import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PasswordGate } from "@/components/PasswordGate";
import { AppLayout } from "@/layouts/AppLayout";

import { ClientesLayout } from "@/layouts/ClientesLayout";
import { CeoLayout } from "@/layouts/CeoLayout";

import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import TeamMemberDashboard from "@/pages/TeamMemberDashboard";
import LdrMemberDashboard from "@/pages/LdrMemberDashboard";
import ThiagoDashboard from "@/pages/ThiagoDashboard";
import Funil from "@/pages/Funil";
import Metas from "@/pages/Metas";
import Scripts from "@/pages/Scripts";
import AssistenteVendas from "@/pages/AssistenteVendas";

import AssistenteGeral from "@/pages/AssistenteGeral";
import ClientesAtivos from "@/pages/ClientesAtivos";
import HunterNegocios from "@/pages/HunterNegocios";
import Comissoes from "@/pages/Comissoes";
import Estrategias from "@/pages/Estrategias";

import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import Placeholder from "@/pages/Placeholder";
import NotFound from "@/pages/NotFound";
import CeoFinanceiro from "@/pages/ceo/CeoFinanceiro";
import CeoMetas from "@/pages/ceo/CeoMetas";
import CeoSaude from "@/pages/ceo/CeoSaude";
import CeoPipeline from "@/pages/ceo/CeoPipeline";
import CeoJuridico from "@/pages/ceo/CeoJuridico";
import CeoProcessos from "@/pages/ceo/CeoProcessos";
import CeoMemoria from "@/pages/ceo/CeoMemoria";
import CeoClientes from "@/pages/ceo/CeoClientes";
import CeoColaboradores from "@/pages/ceo/CeoColaboradores";
import Crm from "@/pages/Crm";
import CrmDealDetail from "@/pages/CrmDealDetail";
import InstagramLeads from "@/pages/crm/InstagramLeads";
import Projects from "@/pages/crm/Projects";
import Atividades from "@/pages/crm/Atividades";
import Email from "@/pages/crm/Email";
import { NucleoOperacional } from "@/components/crm/atividades/NucleoOperacional";
import { InteligenciaComercial } from "@/components/crm/atividades/InteligenciaComercial";
import { VisaoGestor } from "@/components/crm/atividades/VisaoGestor";

const NucleoOperacionalRoute = () => <NucleoOperacional />;
const InteligenciaComercialRoute = () => <InteligenciaComercial />;
const VisaoGestorRoute = () => <VisaoGestor />;
import { useAuth } from "@/contexts/AuthContext";

function HunterGate() {
  const { isFundador } = useAuth();
  if (isFundador) return <HunterNegocios />;
  return <PasswordGate title="Hunter de Negócios"><HunterNegocios /></PasswordGate>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />

              {/* Vendas — redirects para CRM > Atividades */}
              <Route path="/vendas" element={<Navigate to="/crm/atividades/nucleo" replace />} />
              <Route path="/vendas/funil" element={<Navigate to="/crm/atividades/nucleo" replace />} />
              <Route path="/vendas/scripts" element={<Navigate to="/crm/atividades/nucleo" replace />} />
              <Route path="/vendas/ligacoes" element={<Navigate to="/crm/atividades/nucleo" replace />} />
              <Route path="/vendas/assistente" element={<Navigate to="/crm/atividades/nucleo" replace />} />

              {/* Team member dashboards */}
              <Route path="/equipe/aline" element={<TeamMemberDashboard memberName="Aline" initials="AL" />} />
              <Route path="/equipe/milena" element={<LdrMemberDashboard memberName="Milena" initials="MI" avatarColor="hsl(45,80%,45%)" />} />
              <Route path="/equipe/thiago" element={<ProtectedRoute requireSlug="thiago"><ThiagoDashboard /></ProtectedRoute>} />
              <Route path="/equipe/felipe" element={<TeamMemberDashboard memberName="Felipe" initials="FE" />} />

              {/* Clientes */}
              {/* Clientes */}
              <Route path="/clientes" element={<PasswordGate title="Clientes"><ClientesLayout /></PasswordGate>}>
                <Route index element={<ClientesAtivos />} />
                <Route path="anteriores" element={<Placeholder title="Clientes Anteriores" />} />
                <Route path="comissoes" element={<Comissoes />} />
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
                <Route path="estrategias" element={<Estrategias />} />
                <Route path="clientes" element={<CeoClientes />} />
                <Route path="colaboradores" element={<CeoColaboradores />} />
              </Route>

              {/* Assistente IA */}
              <Route path="/assistente" element={<AssistenteGeral />} />

              {/* Hunter de Negócios */}
              <Route path="/hunter" element={<HunterGate />} />

              {/* CRM Integrado */}
              <Route path="/crm" element={<Crm />} />
              <Route path="/crm/deal/:id" element={<CrmDealDetail />} />
              <Route path="/crm/projects" element={<Projects />} />
              <Route path="/crm/atividades" element={<Atividades />}>
                <Route path="nucleo" element={<NucleoOperacionalRoute />} />
                <Route path="inteligencia" element={<InteligenciaComercialRoute />} />
                <Route path="gestor" element={<VisaoGestorRoute />} />
              </Route>
              <Route path="/crm/email" element={<Placeholder title="Integração de E-mail" />} />
              <Route path="/crm/instagram" element={<InstagramLeads />} />
              <Route path="/crm/contatos" element={<Placeholder title="Contatos" />} />
              <Route path="/crm/insights" element={<Placeholder title="Insights & Forecast" />} />
              <Route path="/crm/automacoes" element={<Placeholder title="Automações de I.A" />} />
              <Route path="/crm/configuracoes" element={<Placeholder title="Configurações" />} />

              {/* Redirects */}
              <Route path="/leads" element={<Navigate to="/vendas" replace />} />
              <Route path="/funil" element={<Navigate to="/vendas/funil" replace />} />
              <Route path="/metas" element={<Navigate to="/vendas/metas" replace />} />
              <Route path="/scripts" element={<Navigate to="/vendas/scripts" replace />} />
              <Route path="/comissoes" element={<Navigate to="/clientes/comissoes" replace />} />
              <Route path="/estrategias" element={<Navigate to="/ceo/estrategias" replace />} />
              <Route path="/clientes-ativos" element={<Navigate to="/clientes" replace />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
