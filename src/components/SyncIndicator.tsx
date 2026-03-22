import { format } from "date-fns";

interface SyncIndicatorProps {
  className?: string;
}

export function SyncIndicator({ className = "" }: SyncIndicatorProps) {
  const lastSync = localStorage.getItem("lastSheetSync");

  if (!lastSync) return null;

  return (
    <span className={`text-[10px] text-muted-foreground/60 ${className}`}>
      Última sync: {format(new Date(lastSync), "dd/MM HH:mm")}
    </span>
  );
}
