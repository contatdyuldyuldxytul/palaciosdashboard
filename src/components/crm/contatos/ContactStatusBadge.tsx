import type { ContatoStatus } from "@/hooks/useContatos";

const META: Record<ContatoStatus, { label: string; bg: string; text: string; ring: string }> = {
  cliente_ativo: {
    label: "Cliente Ativo",
    bg: "rgba(0,200,150,0.12)",
    text: "text-primary",
    ring: "rgba(0,200,150,0.25)",
  },
  ex_cliente: {
    label: "Ex-Cliente",
    bg: "rgba(56,189,248,0.12)",
    text: "text-sky-400",
    ring: "rgba(56,189,248,0.25)",
  },
  lead: {
    label: "Lead",
    bg: "rgba(245,158,11,0.12)",
    text: "text-amber-400",
    ring: "rgba(245,158,11,0.25)",
  },
  frio: {
    label: "Prospect Frio",
    bg: "rgba(148,163,184,0.12)",
    text: "text-muted-foreground",
    ring: "rgba(148,163,184,0.2)",
  },
};

export function ContactStatusBadge({ status, size = "sm" }: { status: ContatoStatus; size?: "sm" | "md" }) {
  const m = META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${m.text} ${
        size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10.5px]"
      }`}
      style={{ background: m.bg, border: `1px solid ${m.ring}` }}
    >
      {m.label}
    </span>
  );
}

export const STATUS_OPTIONS: { value: ContatoStatus; label: string }[] = [
  { value: "cliente_ativo", label: "Cliente Ativo" },
  { value: "ex_cliente", label: "Ex-Cliente" },
  { value: "lead", label: "Lead" },
  { value: "frio", label: "Prospect Frio" },
];
