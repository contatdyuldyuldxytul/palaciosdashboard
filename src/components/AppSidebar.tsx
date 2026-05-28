import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, Users, MessageSquare, Target, Kanban,
  ChevronLeft, ChevronRight, ChevronDown, LogOut, Crown, User, Sun, Moon,
  DollarSign, ClipboardList, Calendar, Mail, Instagram, TrendingUp as TrendUp,
  Sparkles, Settings, Radar, LucideIcon
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import logoPalacios from "@/assets/logo-palacios.png";
import logoPalaciosLight from "@/assets/logo-palacios-light.png";
import logoPalaciosIcon from "@/assets/logo-palacios-icon.png";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Deals", url: "/crm", icon: DollarSign, exact: true },
  { title: "Projects", url: "/crm/projects", icon: ClipboardList, requireRole: "fundador" as const },
  { title: "Atividades", url: "/crm/atividades", icon: Calendar },
  { title: "E-mail", url: "/crm/email", icon: Mail },
  { title: "Geração de Leads", url: "/crm/geracao-leads", icon: Radar },
  { title: "Contatos", url: "/crm/contatos", icon: Users },
  { title: "Insights & Forecast", url: "/crm/insights", icon: TrendUp },
  { title: "Automações I.A", url: "/crm/automacoes", icon: Sparkles },
  { title: "CEO", url: "/ceo", icon: Crown, requireRole: "fundador" as const, isCeo: true },
  { title: "Assistente IA", url: "/assistente", icon: MessageSquare },
  { title: "Configurações", url: "/crm/configuracoes", icon: Settings },
];

type SubItem = {
  title: string;
  url: string;
  parentUrl: string;
  initials?: string;
  color?: string;
  icon?: LucideIcon;
  exact?: boolean;
};

const subItems: SubItem[] = [];


export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut, profile, hasRole } = useAuth();
  const { theme, toggle } = useTheme();

  const isActive = (url: string, exact?: boolean) => {
    if (url === "/" || exact) return location.pathname === url;
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  const visibleItems = navItems.filter(
    (item) => !(item as any).requireRole || hasRole((item as any).requireRole)
  );

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col glass-sidebar transition-all duration-300 z-20 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center px-3 h-14" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        {collapsed ? (
          <div className="w-10 h-10 rounded-lg bg-primary/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
            <img src={logoPalaciosIcon} alt="Palacios 3D Studio" className="w-7 h-7 object-contain" />
          </div>
        ) : (
          <img src={theme === "light" ? logoPalaciosLight : logoPalacios} alt="Palacios 3D Studio" className="h-7 w-auto object-contain opacity-90" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const active = isActive(item.url, (item as any).exact);
            const showChildren = false;
            const children: SubItem[] = [];

            return (
              <li key={item.url} className="space-y-0.5">
                <Link
                  to={item.url}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 ${
                    active
                      ? (item as any).isCeo
                        ? "glass-button font-medium shadow-[0_0_20px_hsla(45,100%,55%,0.1)]"
                        : "glass-button text-primary font-medium shadow-[0_0_20px_hsla(160,100%,39%,0.1)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  }`}
                  style={active ? (item as any).isCeo
                    ? { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(245,158,11,0.3)', color: 'hsl(45,100%,55%)' }
                    : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(0,200,150,0.2)' }
                    : (item as any).isCeo ? { color: 'hsl(45,100%,65%)' } : undefined}
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {!collapsed && <span className="flex-1">{item.title}</span>}
                </Link>
                {showChildren && (
                  <ul className="ml-5 pl-3 space-y-0.5" style={{ borderLeft: '1px solid var(--glass-border)' }}>
                    {children.map((sub) => {
                      const subActive = sub.exact
                        ? location.pathname === sub.url
                        : location.pathname === sub.url || location.pathname.startsWith(sub.url + "/");
                      const SubIcon = sub.icon;
                      return (
                        <li key={sub.url}>
                          <Link
                            to={sub.url}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all duration-300 ${
                              subActive
                                ? "text-primary font-medium bg-white/[0.06]"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                            }`}
                          >
                            {SubIcon ? (
                              <SubIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            ) : (
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                style={{ background: sub.color || "hsl(160,60%,38%)" }}
                              >
                                {sub.initials}
                              </span>
                            )}
                            <span>{sub.title}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );

          })}
        </ul>
      </nav>

      {/* Collapse toggle */}

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 text-muted-foreground hover:text-foreground transition-all duration-300"
        style={{ borderTop: '1px solid var(--glass-border)' }}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
