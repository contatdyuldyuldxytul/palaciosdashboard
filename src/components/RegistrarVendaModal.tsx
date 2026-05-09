import { useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { COMISSAO_PCT, Contrato, Status, VENDEDORES_PADRAO, fmtBRL } from "@/lib/contratos";

interface ModalProps {
  vendedores?: string[];
  onClose: () => void;
  onSave: (c: Omit<Contrato, "id" | "comissao">) => void;
}

export function RegistrarVendaModal({ vendedores = VENDEDORES_PADRAO, onClose, onSave }: ModalProps) {
  const [empresa, setEmpresa] = useState("");
  const [vendedorSel, setVendedorSel] = useState(vendedores[0] || "");
  const [novoVendedor, setNovoVendedor] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<Status>("Pendente");
  const [erro, setErro] = useState("");

  const valorNum = parseFloat(valor.replace(",", ".")) || 0;
  const comissao = valorNum * COMISSAO_PCT;
  const isNovo = vendedorSel === "__novo__";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    const vendedorFinal = isNovo ? novoVendedor.trim() : vendedorSel;
    if (!empresa.trim()) return setErro("Informe a empresa");
    if (!vendedorFinal) return setErro("Informe o vendedor");
    if (valorNum <= 0) return setErro("Valor inválido");
    if (!data) return setErro("Informe a data");
    onSave({ empresa: empresa.trim(), vendedor: vendedorFinal, valor: valorNum, data, status });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Registrar Venda</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Empresa">
            <input
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              maxLength={120}
              className="w-full px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)" }}
              autoFocus
            />
          </Field>

          <Field label="Vendedor">
            <select
              value={vendedorSel}
              onChange={(e) => setVendedorSel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)" }}
            >
              {vendedores.map((v) => (
                <option key={v} value={v} style={{ background: "#1a1f2e" }}>
                  {v}
                </option>
              ))}
              <option value="__novo__" style={{ background: "#1a1f2e" }}>
                + Novo Vendedor
              </option>
            </select>
            {isNovo && (
              <input
                placeholder="Nome do novo vendedor"
                value={novoVendedor}
                onChange={(e) => setNovoVendedor(e.target.value)}
                maxLength={80}
                className="w-full mt-2 px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)" }}
              />
            )}
          </Field>

          <Field label="Valor do Contrato (R$)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="20000"
              className="w-full px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)" }}
            />
            <p className="text-xs mt-1.5" style={{ color: "hsl(160,100%,45%)" }}>
              Comissão (4%): <span className="font-semibold">{fmtBRL(comissao)}</span>
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de Fechamento">
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)" }}
              />
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="w-full px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)" }}
              >
                {(["Pago", "Pendente", "Parcelado"] as Status[]).map((s) => (
                  <option key={s} value={s} style={{ background: "#1a1f2e" }}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {erro && <p className="text-xs text-destructive">{erro}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: "hsl(160,100%,39%)", color: "#001a14" }}
            >
              Salvar
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
