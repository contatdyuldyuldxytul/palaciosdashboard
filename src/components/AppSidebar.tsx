import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Users, Funnel, Target, FileText, Phone,
  Bot, Eye, DollarSign, TrendingUp, FileUp, Puzzle,
  UserCheck, UserX, MessageSquare, User, Settings,
  ChevronLeft, ChevronRight, ChevronDown
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "Vendas",
    role: "vendedor",
    items: [
      { title: "Meus Leads", url: "/leads", icon: Users },
      { title: "Funil de Vendas", url: "/funil", icon: Funnel },
      { title: "Metas", url: "/metas", icon: Target },
      { title: "Scripts", url: "/scripts", icon: FileText },
      { title: "Ligações", url: "/ligacoes", icon: Phone },
      { title: "Assistente de Vendas", url: "/assistente-vendas", icon: Bot },
    ],
  },
  {
    label: "Gestão",
    role: "fundador",
    items: [
      { title: "Visão Estratégica", url: "/visao-estrategica", icon: Eye },
      { title: "Financeiro", url: "/financeiro", icon: DollarSign },
      { title: "Metas & Forecast", url: "/metas-forecast", icon: TrendingUp },
      { title: "Documentos & Reuniões", url: "/documentos", icon: FileUp },
      { title: "Assistente do Fundador", url: "/assistente-fundador", icon: Bot },
      { title: "Integrações", url: "/integracoes", icon: Puzzle },
    ],
  },
  {
    label: "Clientes",
    items: [
      { title: "Clientes Ativos", url: "/clientes-ativos", icon: UserCheck },
      { title: "Clientes Anteriores", url: "/clientes-anteriores", icon: UserX },
    ],
  },
  {
    label: "IA",
    items: [
      { title: "Assistente Geral", url: "/assistente", icon: MessageSquare },
    ],
  },
  {
    label: "Conta",
    items: [
      { title: "Perfil", url: "/perfil", icon: User },
      { title: "Configurações", url: "/configuracoes", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(navGroups.map((g) => [g.label, true]))
  );
  const location = useLocation();

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">P3</span>
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm text-sidebar-accent-foreground truncate">
            RenderOS
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center justify-between w-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                {group.label}
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    openGroups[group.label] ? "" : "-rotate-90"
                  }`}
                />
              </button>
            )}

            {(collapsed || openGroups[group.label]) && (
              <ul className="space-y-0.5 px-2">
                {group.items.map((item) => {
                  const active = location.pathname === item.url;
                  return (
                    <li key={item.url}>
                      <Link
                        to={item.url}
                        className={`flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all duration-150 ${
                          active
                            ? "bg-sidebar-accent text-primary font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                        title={collapsed ? item.title : undefined}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
