import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, Briefcase, Users, MessageSquare,
  ChevronLeft, ChevronRight, LogOut
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Vendas", url: "/vendas", icon: TrendingUp },
  { title: "Gestão", url: "/gestao", icon: Briefcase, requireRole: "fundador" as const },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Assistente IA", url: "/assistente", icon: MessageSquare },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut, profile, hasRole } = useAuth();

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
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
      <div className="flex items-center gap-3 px-4 h-14" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <div className="w-8 h-8 rounded-lg bg-primary/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0" style={{ border: '1px solid var(--glass-border)' }}>
          <span className="text-primary font-bold text-sm">P3</span>
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm text-foreground truncate">
            RenderOS
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const active = isActive(item.url);
            return (
              <li key={item.url}>
                <Link
                  to={item.url}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 ${
                    active
                      ? "glass-button text-primary font-medium shadow-[0_0_20px_hsla(160,100%,39%,0.1)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  }`}
                  style={active ? { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(0,200,150,0.2)' } : undefined}
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
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
