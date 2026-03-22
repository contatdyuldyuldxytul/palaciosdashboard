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
    <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="flex items-center gap-1 px-6 overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-150 border-b-2 ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
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
