import { Outlet, NavLink, useLocation, Navigate } from "react-router-dom";

// Team members — add new members here to auto-create tabs
const teamMembers = [
  { name: "Aline", initials: "AL", path: "/vendas" },
  // { name: "Carlos", initials: "CA", path: "/vendas/carlos" },
];

export function VendasLayout() {
  return (
    <div className="flex flex-col flex-1">
      {/* Team member tabs */}
      <div
        className="backdrop-blur-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <div className="flex items-center gap-1 px-6 overflow-x-auto scrollbar-thin">
          {teamMembers.map((member) => (
            <NavLink
              key={member.path}
              to={member.path}
              end={member.path === "/vendas"}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-300 border-b-2 ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-white/10"
                }`
              }
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: "hsl(160,60%,38%)" }}
              >
                {member.initials}
              </span>
              {member.name}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
