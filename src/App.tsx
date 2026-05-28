import { lazy, Suspense } from "react";
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
import { useAuth } from "@/contexts/AuthContext";

// Eager — critical path
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";

// Lazy — everything else
const ClientesLayout = lazy(() => import("@/layouts/ClientesLayout").then(m => ({ default: m.ClientesLayout })));
const CeoLayout = lazy(() => import("@/layouts/CeoLayout").then(m => ({ default: m.CeoLayout })));
const Leads = lazy(() => import("@/pages/Leads"));
const TeamMemberDashboard = lazy(() => import("@/pages/TeamMemberDashboard"));
const LdrMemberDashboard = lazy(() => import("@/pages/LdrMemberDashboard"));
const ThiagoDashboard = lazy(() => import("@/pages/ThiagoDashboard"));
const Funil = lazy(() => import("@/pages/Funil"));
const Metas = lazy(() => import("@/pages/Metas"));
const Scripts = lazy(() => import("@/pages/Scripts"));
const AssistenteVendas = lazy(() => import("@/pages/AssistenteVendas"));
const AssistenteGeral = lazy(() => import("@/pages/AssistenteGeral"));
const ClientesAtivos = lazy(() => import("@/pages/ClientesAtivos"));
const HunterNegocios = lazy(() => import("@/pages/HunterNegocios"));
const Comissoes = lazy(() => import("@/pages/Comissoes"));
const Estrategias = lazy(() => import("@/pages/Estrategias"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Placeholder = lazy(() => import("@/pages/Placeholder"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const CeoFinanceiro = lazy(() => import("@/pages/ceo/CeoFinanceiro"));
const CeoMetas = lazy(() => import("@/pages/ceo/CeoMetas"));
const CeoSaude = lazy(() => import("@/pages/ceo/CeoSaude"));
const CeoPipeline = lazy(() => import("@/pages/ceo/CeoPipeline"));
const CeoJuridico = lazy(() => import("@/pages/ceo/CeoJuridico"));
const CeoProcessos = lazy(() => import("@/pages/ceo/CeoProcessos"));
const CeoMemoria = lazy(() => import("@/pages/ceo/CeoMemoria"));
const CeoClientes = lazy(() => import("@/pages/ceo/CeoClientes"));
const CeoColaboradores = lazy(() => import("@/pages/ceo/CeoColaboradores"));
const Crm = lazy(() => import("@/pages/Crm"));
const CrmDealDetail = lazy(() => import("@/pages/CrmDealDetail"));
const InstagramLeads = lazy(() => import("@/pages/crm/InstagramLeads"));
const Projects = lazy(() => import("@/pages/crm/Projects"));
const Atividades = lazy(() => import("@/pages/crm/Atividades"));
const Email = lazy(() => import("@/pages/crm/Email"));
const Contatos = lazy(() => import("@/pages/crm/Contatos"));
const GeracaoLeads = lazy(() => import("@/pages/crm/GeracaoLeads"));
const HistoricoPipedrive = lazy(() => import("@/components/milena/HistoricoPipedrive").then(m => ({ default: m.HistoricoPipedrive })));
const NucleoOperacional = lazy(() => import("@/components/crm/atividades/NucleoOperacional").then(m => ({ default: m.NucleoOperacional })));
const InteligenciaComercial = lazy(() => import("@/components/crm/atividades/InteligenciaComercial").then(m => ({ default: m.InteligenciaComercial })));
const VisaoGestor = lazy(() => import("@/components/crm/atividades/VisaoGestor").then(m => ({ default: m.VisaoGestor })));

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
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const PageFallback = () => (
  <div className="flex items-center justify-center h-screen w-full">
    <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
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

              {/* Hunter de Negócios — redirect para nova localização */}
              <Route path="/hunter" element={<Navigate to="/crm/geracao-leads/hunter" replace />} />

              {/* CRM Integrado */}
              <Route path="/crm" element={<Crm />} />
              <Route path="/crm/deal/:id" element={<CrmDealDetail />} />
              <Route path="/crm/projects" element={<ProtectedRoute requireRole="fundador"><Projects /></ProtectedRoute>} />
              <Route path="/crm/atividades" element={<Atividades />}>
                <Route path="nucleo" element={<NucleoOperacional />} />
                <Route path="inteligencia" element={<InteligenciaComercial />} />
                <Route path="gestor" element={<VisaoGestor />} />
              </Route>
              <Route path="/crm/email" element={<Email />} />
              <Route path="/crm/geracao-leads" element={<GeracaoLeads />}>
                <Route path="instagram" element={<InstagramLeads />} />
                <Route path="pipedrive" element={<HistoricoPipedrive />} />
                <Route path="hunter" element={<HunterGate />} />
              </Route>
              <Route path="/crm/instagram" element={<Navigate to="/crm/geracao-leads/instagram" replace />} />
              <Route path="/crm/contatos" element={<Contatos />} />
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
