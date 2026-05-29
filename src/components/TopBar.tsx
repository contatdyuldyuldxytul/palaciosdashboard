import { LogOut, Sun, Moon, User, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const { signOut, profile } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();


  return (
    <div
      className="flex items-center justify-end gap-2 px-4 h-12"
      style={{ borderBottom: "1px solid var(--glass-border)" }}
    >
      <button
        onClick={toggle}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
        title={theme === "dark" ? "Modo claro" : "Modo escuro"}
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 pl-1.5 pr-3 h-9 rounded-lg text-sm text-foreground hover:bg-white/[0.06] transition-all"
            title={profile?.email}
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="hidden lg:inline max-w-[140px] truncate">
              {profile?.full_name || profile?.email || "Conta"}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-background border-white/10 w-56">
          {profile && (
            <>
              <DropdownMenuLabel className="flex flex-col">
                <span className="text-xs font-medium text-foreground truncate">
                  {profile.full_name || profile.email}
                </span>
                <span className="text-[10px] text-muted-foreground truncate font-normal">
                  {profile.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => navigate("/crm/configuracoes")}>
            <Settings className="w-4 h-4 mr-2" /> Configurações
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
