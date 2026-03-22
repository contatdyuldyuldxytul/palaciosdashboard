const statusStyles: Record<string, { bg: string; text: string; glow?: string }> = {
  lead: { bg: 'rgba(255,255,255,0.06)', text: 'text-muted-foreground' },
  contatado: { bg: 'rgba(59,130,246,0.12)', text: 'text-blue-400', glow: 'rgba(59,130,246,0.08)' },
  "reunião agendada": { bg: 'rgba(234,179,8,0.12)', text: 'text-yellow-400', glow: 'rgba(234,179,8,0.08)' },
  "reunião realizada": { bg: 'rgba(249,115,22,0.12)', text: 'text-orange-400', glow: 'rgba(249,115,22,0.08)' },
  proposta: { bg: 'rgba(168,85,247,0.12)', text: 'text-purple-400', glow: 'rgba(168,85,247,0.08)' },
  fechado: { bg: 'rgba(0,200,150,0.12)', text: 'text-primary', glow: 'rgba(0,200,150,0.08)' },
  perdido: { bg: 'rgba(239,68,68,0.12)', text: 'text-destructive', glow: 'rgba(239,68,68,0.08)' },
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const style = statusStyles[key] || statusStyles.lead;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-sm transition-all duration-300 ${style.text}`}
      style={{
        background: style.bg,
        border: `1px solid ${style.glow || 'rgba(255,255,255,0.06)'}`,
        boxShadow: style.glow ? `0 0 12px ${style.glow}` : undefined,
      }}
    >
      {status}
    </span>
  );
}
