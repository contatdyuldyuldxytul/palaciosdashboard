import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Kanban, Target, MessageSquare, Menu } from "lucide-react";

interface Props {
  onOpenMore: () => void;
}

const tabs = [
  { url: "/", label: "Início", icon: LayoutDashboard, match: (p: string) => p === "/" },
  { url: "/crm", label: "CRM", icon: Kanban, match: (p: string) => p.startsWith("/crm") },
  { url: "/hunter", label: "Hunter", icon: Target, match: (p: string) => p.startsWith("/hunter") },
  { url: "/assistente", label: "IA", icon: MessageSquare, match: (p: string) => p.startsWith("/assistente") },
];

export function MobileBottomNav({ onOpenMore }: Props) {
  const { pathname } = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl border-t border-white/10"
      style={{
        background: "rgba(8, 10, 22, 0.85)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="grid grid-cols-5 h-14">
        {tabs.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <Link
              key={t.url}
              to={t.url}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? "text-primary" : "text-muted-foreground/70"
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${active ? "drop-shadow-[0_0_6px_hsla(160,100%,45%,0.6)]" : ""}`} />
              <span className="text-[9.5px] font-medium">{t.label}</span>
            </Link>
          );
        })}
        <button
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <Menu className="w-[18px] h-[18px]" />
          <span className="text-[9.5px] font-medium">Mais</span>
        </button>
      </div>
    </nav>
  );
}
