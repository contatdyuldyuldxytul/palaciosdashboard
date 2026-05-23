import { Flame, Snowflake, Thermometer } from "lucide-react";

export type Temperatura = "quente" | "morno" | "frio" | null | undefined;

const MAP = {
  quente: { label: "Quente", icon: Flame, cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  morno: { label: "Morno", icon: Thermometer, cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  frio: { label: "Frio", icon: Snowflake, cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
} as const;

export function TemperaturaBadge({ temperatura, size = "sm" }: { temperatura: Temperatura; size?: "sm" | "md" }) {
  if (!temperatura) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/10 text-[10px] text-muted-foreground">
        sem temperatura
      </span>
    );
  }
  const cfg = MAP[temperatura];
  const Icon = cfg.icon;
  const padding = size === "md" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${cfg.cls} ${padding}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

export function temperaturaFromScore(total: number | null | undefined): Temperatura {
  if (total == null) return null;
  if (total >= 21) return "quente"; // ≥70%
  if (total >= 12) return "morno"; // 40-70%
  return "frio";
}
