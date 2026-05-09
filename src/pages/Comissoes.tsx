import { DollarSign } from "lucide-react";

export default function Comissoes() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(0,200,150,0.12)",
            border: "1px solid rgba(0,200,150,0.25)",
          }}
        >
          <DollarSign className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Comissões
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de contratos e cálculo de comissões da equipe
          </p>
        </div>
      </div>

      <div className="glass-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Módulo em construção. Descreva os campos, regras de cálculo e permissões para finalizar a implementação.
        </p>
      </div>
    </div>
  );
}
