import { Construction } from "lucide-react";

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Construction className="w-7 h-7 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-bold text-foreground mb-1">{title}</h1>
      <p className="text-sm text-muted-foreground">Este módulo será implementado em breve.</p>
    </div>
  );
}
