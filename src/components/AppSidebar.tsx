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
      className={`h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
        collapsed ? "w-16" : "w-56"
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
      <nav className="flex-1 py-4 px-2">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const active = isActive(item.url);
            return (
              <li key={item.url}>
                <Link
                  to={item.url}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                    active
                      ? "bg-sidebar-accent text-primary font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
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
        <div className="px-3 py-2 border-t border-sidebar-border">
          <p className="text-xs text-foreground font-medium truncate">{profile.full_name || profile.email}</p>
          <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>
        </div>
      )}
      <button
        onClick={signOut}
        className="flex items-center gap-2 px-3 py-2 mx-2 mb-1 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        title="Sair"
      >
        <LogOut className="w-4 h-4" />
        {!collapsed && <span>Sair</span>}
      </button>

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
