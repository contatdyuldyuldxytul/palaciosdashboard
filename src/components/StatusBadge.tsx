const statusStyles: Record<string, string> = {
  lead: "bg-muted text-muted-foreground",
  contatado: "bg-blue-500/15 text-blue-400",
  "reunião agendada": "bg-yellow-500/15 text-yellow-400",
  "reunião realizada": "bg-orange-500/15 text-orange-400",
  proposta: "bg-purple-500/15 text-purple-400",
  fechado: "bg-primary/15 text-primary",
  perdido: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const style = statusStyles[key] || statusStyles.lead;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${style}`}>
      {status}
    </span>
  );
}
