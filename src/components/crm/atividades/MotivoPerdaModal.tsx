import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { XCircle } from "lucide-react";

export const MOTIVOS = ["Preço", "Timing", "Concorrente", "Sem resposta", "Outro"] as const;
export type MotivoPerda = typeof MOTIVOS[number];

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: (motivo: string) => void | Promise<void>;
  dealTitulo?: string | null;
}

export function MotivoPerdaModal({ open, onCancel, onConfirm, dealTitulo }: Props) {
  const [motivo, setMotivo] = useState<MotivoPerda | null>(null);
  const [detalhe, setDetalhe] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setMotivo(null); setDetalhe(""); setBusy(false); };

  const submit = async () => {
    if (!motivo) return;
    const final = motivo === "Outro"
      ? (detalhe.trim() ? `Outro: ${detalhe.trim()}` : "Outro")
      : detalhe.trim() ? `${motivo} — ${detalhe.trim()}` : motivo;
    setBusy(true);
    try { await onConfirm(final); reset(); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onCancel(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-amber-400" /> Marcar como Perdido
          </DialogTitle>
          <DialogDescription className="text-xs">
            {dealTitulo ? <span className="text-foreground">{dealTitulo}</span> : "Selecione o motivo da perda."} Esse campo é obrigatório para que possamos identificar padrões.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 mt-2">
          {MOTIVOS.map((m) => (
            <button
              key={m}
              onClick={() => setMotivo(m)}
              className={`px-3 py-2.5 rounded-lg border text-sm transition-all ${
                motivo === m
                  ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                  : "border-white/10 hover:bg-white/[0.04] text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <Textarea
          value={detalhe}
          onChange={(e) => setDetalhe(e.target.value)}
          placeholder={motivo === "Outro" ? "Descreva o motivo…" : "Detalhe opcional…"}
          className="mt-3 bg-white/5 border-white/10 text-sm"
          rows={3}
        />

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={() => { reset(); onCancel(); }} disabled={busy}>Cancelar</Button>
          <Button
            onClick={submit}
            disabled={!motivo || busy || (motivo === "Outro" && !detalhe.trim())}
            className="bg-amber-500/80 hover:bg-amber-500 text-white"
          >
            {busy ? "Salvando…" : "Confirmar Perda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
