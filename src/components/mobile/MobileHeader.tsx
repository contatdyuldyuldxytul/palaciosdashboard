import { Menu } from "lucide-react";
import logoPalacios from "@/assets/logo-palacios.png";
import logoPalaciosLight from "@/assets/logo-palacios-light.png";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  onOpenDrawer: () => void;
}

export function MobileHeader({ onOpenDrawer }: Props) {
  const { theme } = useTheme();
  return (
    <header
      className="md:hidden sticky top-0 z-30 h-12 flex items-center justify-between px-3 backdrop-blur-xl border-b border-border bg-background/80"
    >
      <button
        onClick={onOpenDrawer}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <img
        src={theme === "light" ? logoPalaciosLight : logoPalacios}
        alt="Palacios"
        className="h-5 w-auto opacity-90"
      />
      <div className="w-9" />
    </header>
  );
}
