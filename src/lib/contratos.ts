export type Status = "Pago" | "Pendente" | "Parcelado";

export interface Contrato {
  id: string;
  empresa: string;
  vendedor: string;
  valor: number;
  comissao: number;
  data: string; // YYYY-MM-DD
  status: Status;
}

export const STORAGE_KEY = "palacios_comissoes_v1";
export const VENDEDORES_PADRAO = ["Thiago Palacios", "Cristine"];
export const COMISSAO_PCT = 0.04;

export const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export function loadContratos(): Contrato[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Contrato[]) : [];
  } catch {
    return [];
  }
}

export function saveContratos(list: Contrato[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addContrato(c: Omit<Contrato, "id" | "comissao">): Contrato {
  const list = loadContratos();
  const novo: Contrato = {
    ...c,
    id: crypto.randomUUID(),
    comissao: c.valor * COMISSAO_PCT,
  };
  saveContratos([novo, ...list]);
  window.dispatchEvent(new Event("palacios:contratos-updated"));
  return novo;
}
