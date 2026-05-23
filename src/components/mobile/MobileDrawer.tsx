import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  LayoutDashboard, Target, Crown, MessageSquare, Settings, Kanban,
  DollarSign, ClipboardList, Calendar, Mail, Instagram, Users,
  TrendingUp as TrendUp, Sparkles, Sun, Moon, LogOut, User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "CRM", url: "/crm", icon: Kanban },
  { title: "Hunter de Negócios", url: "/hunter", icon: Target },
  { title: "CEO", url: "/ceo", icon: Crown, requireRole: "fundador" as const },
  { title: "Assistente IA", url: "/assistente", icon: MessageSquare },
  { title: "Configurações", url: "/crm/configuracoes", icon: Settings },
];

const crmSubItems = [
  { title: "Deals", url: "/crm", icon: DollarSign, exact: true },
  { title: "Projects", url: "/crm/projects", icon: ClipboardList },
  { title: "Atividades", url: "/crm/atividades", icon: Calendar },
  { title: "E-mail", url: "/crm/email", icon: Mail },
  { title: "Leads Instagram", url: "/crm/instagram", icon: Instagram },
  { title: "Contatos", url: "/crm/contatos", icon: Users },
  { title: "Insights & Forecast", url: "/crm/insights", icon: TrendUp },
  { title: "Automações I.A", url: "/crm/automacoes", icon: Sparkles },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function MobileDrawer({ open, onOpenChange }: Props) {
  const { profile, signOut, hasRole } = useAuth();
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();

  const visibleMain = mainItems.filter((i) => !i.requireRole || hasRole(i.requireRole));
  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[80vw] max-w-[320px] p-0 bg-background/95 backdrop-blur-2xl border-border flex flex-col">
        {/* Profile header */}
        <div className="px-4 py-4 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || profile?.email || "Usuário"}</p>
            {profile?.email && <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          <ul className="space-y-1">
            {visibleMain.map((item) => {
              const active = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
              const Icon = item.icon;
              return (
                <li key={item.url}>
                  <Link
                    to={item.url}
                    onClick={close}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      active ? "bg-accent text-primary font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" /> {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div>
            <div className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1">CRM</div>
            <ul className="space-y-0.5">
              {crmSubItems.map((s) => {
                const active = isActive(s.url, s.exact);
                const Icon = s.icon;
                return (
                  <li key={s.url}>
                    <Link
                      to={s.url}
                      onClick={close}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                        active ? "bg-accent text-primary font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {s.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="border-t border-border p-2 space-y-1">
          <button
            onClick={() => { toggle(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Modo claro" : "Modo escuro"}
          </button>
          <button
            onClick={() => { signOut(); close(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
