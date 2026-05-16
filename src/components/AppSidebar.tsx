import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, Users, MessageSquare, Target,
  ChevronLeft, ChevronRight, ChevronDown, LogOut, Crown, User, Sun, Moon
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import logoPalacios from "@/assets/logo-palacios.png";
import logoPalaciosIcon from "@/assets/logo-palacios-icon.png";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Vendas", url: "/vendas/funil", icon: TrendingUp, hasChildren: true },
  
  { title: "Hunter de Negócios", url: "/hunter", icon: Target },
  { title: "CEO", url: "/ceo", icon: Crown, requireRole: "fundador" as const, isCeo: true },
  { title: "Assistente IA", url: "/assistente", icon: MessageSquare },
];

const subItems = [
  { title: "Thiago", url: "/equipe/thiago", parentUrl: "/vendas", initials: "TH", color: "#0a3a5c" },
  { title: "Aline", url: "/equipe/aline", parentUrl: "/vendas", initials: "AL" },
  { title: "Milena", url: "/equipe/milena", parentUrl: "/vendas", initials: "MI", color: "hsl(45,80%,45%)" },
  { title: "Felipe", url: "/equipe/felipe", parentUrl: "/vendas", initials: "FE", color: "#f97316" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut, profile, hasRole } = useAuth();

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    if (url === "/vendas/funil") return location.pathname.startsWith("/vendas") || location.pathname.startsWith("/equipe/");
    return location.pathname.startsWith(url);
  };

  const visibleItems = navItems.filter(
    (item) => !item.requireRole || hasRole(item.requireRole)
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
          <img src={logoPalacios} alt="Palacios 3D Studio" className="h-7 w-auto object-contain opacity-90" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const active = isActive(item.url);
            const children = item.hasChildren ? subItems.filter((s) => item.url.startsWith(s.parentUrl)) : [];
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
                  {!collapsed && (item as any).hasChildren && (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </Link>
                {/* Sub-items (team members) */}
                {!collapsed && active && children.length > 0 && (
                  <ul className="ml-5 pl-3 space-y-0.5" style={{ borderLeft: '1px solid var(--glass-border)' }}>
                    {children.map((sub) => {
                      const subActive = location.pathname === sub.url;
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
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                              style={{ background: (sub as any).color || "hsl(160,60%,38%)" }}
                            >
                              {sub.initials}
                            </span>
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

      {/* User & Logout */}
      {!collapsed && profile && (
        <div className="px-3 py-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <p className="text-xs text-foreground font-medium truncate">{profile.full_name || profile.email}</p>
          <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>
        </div>
      )}
      <button
        onClick={signOut}
        className="flex items-center gap-2 px-3 py-2 mx-2 mb-1 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
        title="Sair"
      >
        <LogOut className="w-4 h-4" />
        {!collapsed && <span>Sair</span>}
      </button>

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
