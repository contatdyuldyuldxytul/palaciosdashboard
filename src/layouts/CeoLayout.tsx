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
        className="mx-3 md:mx-6 mt-3 md:mt-4 rounded-2xl backdrop-blur-xl p-1.5 md:p-2 flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          scrollbarWidth: "none",
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? "bg-amber-500/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex-1 min-w-0 mx-3 md:mx-6 mt-3 md:mt-4 mb-4 md:mb-6 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
