import { Outlet, NavLink } from "react-router-dom";
import { DollarSign, Rocket, Users, UsersRound } from "lucide-react";

const navItems = [
  { label: "Financeiro", path: "/ceo", icon: DollarSign },
  { label: "Estratégias", path: "/ceo/estrategias", icon: Rocket },
  { label: "Clientes", path: "/ceo/clientes", icon: Users },
  { label: "Colaboradores", path: "/ceo/colaboradores", icon: UsersRound },
];

export function CeoLayout() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <nav
        className="mx-6 mt-4 rounded-2xl backdrop-blur-xl p-2 flex flex-wrap gap-1"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-amber-500/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex-1 min-w-0 mx-6 mt-4 mb-6 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
