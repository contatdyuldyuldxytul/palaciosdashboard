import { NavLink } from "react-router-dom";

interface Tab {
  label: string;
  path: string;
}

interface SectionTabsProps {
  tabs: Tab[];
}

export function SectionTabs({ tabs }: SectionTabsProps) {
  return (
    <div
      className="backdrop-blur-xl"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        borderBottom: '1px solid var(--glass-border)',
      }}
    >
      <div className="flex items-center gap-1 px-6 overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-300 border-b-2 ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-white/10"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
