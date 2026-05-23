import { Link, useLocation } from "react-router-dom";
import {
  DollarSign, ClipboardList, Calendar, Mail, Instagram, Users, TrendingUp, Sparkles,
} from "lucide-react";

const items = [
  { title: "Deals", url: "/crm", icon: DollarSign, exact: true },
  { title: "Projects", url: "/crm/projects", icon: ClipboardList },
  { title: "Atividades", url: "/crm/atividades", icon: Calendar },
  { title: "E-mail", url: "/crm/email", icon: Mail },
  { title: "Instagram", url: "/crm/instagram", icon: Instagram },
  { title: "Contatos", url: "/crm/contatos", icon: Users },
  { title: "Insights", url: "/crm/insights", icon: TrendingUp },
  { title: "Automações", url: "/crm/automacoes", icon: Sparkles },
];

export function MobileCrmSubnav() {
  const { pathname } = useLocation();
  if (!pathname.startsWith("/crm")) return null;

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <div className="md:hidden sticky top-12 z-20 backdrop-blur-xl border-b border-border bg-background/70">
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        {items.map((it) => {
          const active = isActive(it.url, it.exact);
          const Icon = it.icon;
          return (
            <Link
              key={it.url}
              to={it.url}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap border transition-colors ${
                active
                  ? "bg-primary/20 text-primary border-primary/40 font-medium"
                  : "border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3 h-3" /> {it.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
