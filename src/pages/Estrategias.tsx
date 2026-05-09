import { useEffect, useMemo, useState } from "react";
import { Rocket, Target, Users2, BookOpen, TrendingUp, Save } from "lucide-react";
import { motion } from "framer-motion";
import { useLeads } from "@/hooks/useLeads";

type TabKey = "previsibilidade" | "leads" | "playbook" | "equipe";

interface ContratoLS {
  vendedor: string;
  valor: number;
  comissao: number;
  data: string;
}

interface MetaEquipe {
  vendedor: string;
  meta: number;
}

const STORAGE_KEY = "palacios_estrategias_v1";
const COMISSOES_KEY = "palacios_comissoes_v1";
const COMISSAO_PCT = 0.04;
const VENDEDORES_PADRAO = ["Thiago Palacios", "Cristine"];

interface EstrategiasState {
  metaMensalRS: number;
  metaLeadsMes: number;
  metasEquipe: MetaEquipe[];
}

const defaultState: EstrategiasState = {
  metaMensalRS: 200000,
  metaLeadsMes: 200,
  metasEquipe: [
    { vendedor: "Thiago Palacios", meta: 100000 },
    { vendedor: "Cristine", meta: 100000 },
  ],
};

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  backdropFilter: "blur(20px)",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  padding: "8px 12px",
  color: "white",
  fontSize: 14,
  width: "100%",
};

export default function Estrategias() {
  const [tab, setTab] = useState<TabKey>("previsibilidade");
  const [state, setState] = useState<EstrategiasState>(defaultState);
  const leadsQ = useLeads();

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...defaultState, ...JSON.parse(raw) });
    } catch {}
  }, []);
  // Save
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Read contratos do mês do localStorage de Comissões
  const contratosMes = useMemo<ContratoLS[]>(() => {
    try {
      const raw = localStorage.getItem(COMISSOES_KEY);
      if (!raw) return [];
      const all: ContratoLS[] = JSON.parse(raw);
      return all.filter((c) => c.data?.startsWith(currentMonthKey()));
    } catch {
      return [];
    }
  }, [state]); // refresh quando salvar algo

  const realizadoMes = contratosMes.reduce((s, c) => s + Number(c.valor || 0), 0);
  const pctMeta = state.metaMensalRS > 0 ? (realizadoMes / state.metaMensalRS) * 100 : 0;

  // Projeção linear baseada nos dias decorridos
  const proj = useMemo(() => {
    const now = new Date();
    const dia = now.getDate();
    const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projecao = dia > 0 ? (realizadoMes / dia) * ultimoDia : 0;
    return { projecao, dia, ultimoDia };
  }, [realizadoMes]);

  // Leads
  const leadsMes = useMemo(() => {
    const list = leadsQ.data || [];
    const mk = currentMonthKey();
    return list.filter((l: any) => (l.data_criacao || "").startsWith(mk)).length;
  }, [leadsQ.data]);

  const fechadosMes = contratosMes.length;
  const taxaConv = leadsMes > 0 ? (fechadosMes / leadsMes) * 100 : 0;
  const semanasRestantes = Math.max(1, Math.ceil((proj.ultimoDia - proj.dia + 1) / 7));
  const leadsFaltam = Math.max(0, state.metaLeadsMes - leadsMes);
  const leadsPorSemana = Math.ceil(leadsFaltam / semanasRestantes);

  // Realizado por vendedor
  const realizadoPorVendedor = useMemo(() => {
    const map = new Map<string, number>();
    contratosMes.forEach((c) => map.set(c.vendedor, (map.get(c.vendedor) || 0) + Number(c.valor || 0)));
    return map;
  }, [contratosMes]);

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "previsibilidade", label: "Previsibilidade", icon: TrendingUp },
    { key: "leads", label: "Volume de Leads", icon: Users2 },
    { key: "playbook", label: "Playbook", icon: BookOpen },
    { key: "equipe", label: "Metas da Equipe", icon: Target },
  ];

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "transparent" }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(0,200,150,0.12)", border: "1px solid rgba(0,200,150,0.3)" }}
        >
          <Rocket className="w-5 h-5" style={{ color: "hsl(160,100%,45%)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Estratégias Comerciais</h1>
          <p className="text-sm text-muted-foreground">Previsibilidade, leads, playbook e metas da equipe</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
              style={{
                background: active ? "rgba(0,200,150,0.14)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${active ? "rgba(0,200,150,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: active ? "hsl(160,100%,55%)" : "rgba(255,255,255,0.7)",
              }}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-5"
      >
        {tab === "previsibilidade" && (
          <div style={card} className="p-6 space-y-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs text-muted-foreground">Meta mensal de receita (R$)</label>
                <input
                  type="number"
                  value={state.metaMensalRS}
                  onChange={(e) => setState({ ...state, metaMensalRS: Number(e.target.value) || 0 })}
                  style={inputStyle}
                  className="mt-1.5"
                />
              </div>
              <div className="flex gap-3">
                <Stat label="Realizado" value={fmtBRL(realizadoMes)} accent="hsl(160,100%,45%)" />
                <Stat label="Projeção do mês" value={fmtBRL(proj.projecao)} accent="hsl(45,100%,55%)" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progresso vs meta</span>
                <span className="text-white font-semibold">{pctMeta.toFixed(1)}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(100, pctMeta)}%`,
                    background: "linear-gradient(90deg, hsl(160,100%,45%), hsl(160,100%,55%))",
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Dia {proj.dia} de {proj.ultimoDia} — projeção linear baseada no ritmo atual.
              </p>
            </div>
          </div>
        )}

        {tab === "leads" && (
          <div style={card} className="p-6 space-y-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs text-muted-foreground">Meta de leads no mês</label>
                <input
                  type="number"
                  value={state.metaLeadsMes}
                  onChange={(e) => setState({ ...state, metaLeadsMes: Number(e.target.value) || 0 })}
                  style={inputStyle}
                  className="mt-1.5"
                />
              </div>
              <Stat label="Leads no mês" value={String(leadsMes)} accent="hsl(160,100%,45%)" />
              <Stat label="Fechados" value={String(fechadosMes)} accent="hsl(45,100%,55%)" />
              <Stat label="Conversão" value={`${taxaConv.toFixed(1)}%`} accent="hsl(238,80%,70%)" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div style={card} className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Leads ainda necessários</p>
                <p className="text-2xl font-semibold text-white">{leadsFaltam}</p>
              </div>
              <div style={card} className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Leads necessários por semana</p>
                <p className="text-2xl font-semibold" style={{ color: "hsl(160,100%,55%)" }}>
                  {leadsPorSemana}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {semanasRestantes} semana(s) restante(s) no mês
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === "playbook" && <Playbook />}

        {tab === "equipe" && (
          <div style={card} className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <th className="py-3 px-2">Vendedor</th>
                    <th className="py-3 px-2">Meta (R$)</th>
                    <th className="py-3 px-2">Realizado</th>
                    <th className="py-3 px-2">% Atingido</th>
                    <th className="py-3 px-2">Comissão projetada (4%)</th>
                  </tr>
                </thead>
                <tbody>
                  {state.metasEquipe.map((m, idx) => {
                    const realizado = realizadoPorVendedor.get(m.vendedor) || 0;
                    const pct = m.meta > 0 ? (realizado / m.meta) * 100 : 0;
                    const comissaoProj = realizado * COMISSAO_PCT;
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td className="py-3 px-2">
                          <input
                            value={m.vendedor}
                            onChange={(e) => {
                              const arr = [...state.metasEquipe];
                              arr[idx] = { ...arr[idx], vendedor: e.target.value };
                              setState({ ...state, metasEquipe: arr });
                            }}
                            style={inputStyle}
                          />
                        </td>
                        <td className="py-3 px-2 w-[180px]">
                          <input
                            type="number"
                            value={m.meta}
                            onChange={(e) => {
                              const arr = [...state.metasEquipe];
                              arr[idx] = { ...arr[idx], meta: Number(e.target.value) || 0 };
                              setState({ ...state, metasEquipe: arr });
                            }}
                            style={inputStyle}
                          />
                        </td>
                        <td className="py-3 px-2 text-white">{fmtBRL(realizado)}</td>
                        <td className="py-3 px-2">
                          <span
                            className="px-2 py-1 rounded-md text-xs font-medium"
                            style={{
                              color: pct >= 100 ? "hsl(160,100%,55%)" : pct >= 60 ? "hsl(45,100%,60%)" : "hsl(0,80%,65%)",
                              background:
                                pct >= 100
                                  ? "rgba(0,200,150,0.12)"
                                  : pct >= 60
                                  ? "rgba(245,158,11,0.12)"
                                  : "rgba(239,68,68,0.12)",
                            }}
                          >
                            {pct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-2" style={{ color: "hsl(160,100%,55%)" }}>
                          {fmtBRL(comissaoProj)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() =>
                  setState({
                    ...state,
                    metasEquipe: [...state.metasEquipe, { vendedor: "Novo Vendedor", meta: 0 }],
                  })
                }
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "white",
                }}
              >
                + Adicionar vendedor
              </button>
              {state.metasEquipe.length > 0 && (
                <button
                  onClick={() =>
                    setState({ ...state, metasEquipe: state.metasEquipe.slice(0, -1) })
                  }
                  className="px-3 py-2 rounded-lg text-sm text-muted-foreground"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Remover último
                </button>
              )}
              <div
                className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                style={{ color: "hsl(160,100%,55%)" }}
              >
                <Save className="w-3.5 h-3.5" /> Salvo automaticamente
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="px-4 py-3 rounded-xl min-w-[140px]"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-0.5" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

function Playbook() {
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={card} className="p-5">
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Section title="Funil ideal (benchmark)">
        <ul className="space-y-1.5 list-disc pl-5">
          <li>100 leads qualificados → 40 contatos efetivos</li>
          <li>40 contatos → 20 reuniões agendadas</li>
          <li>20 reuniões → 10 demos realizadas</li>
          <li>10 demos → 4 propostas enviadas</li>
          <li>4 propostas → 1–2 contratos fechados (R$20k cada)</li>
        </ul>
      </Section>

      <Section title="Roteiro de abordagem — Construtoras">
        <ol className="space-y-1.5 list-decimal pl-5">
          <li><b>Abertura:</b> apresente-se e mencione um lançamento ou obra recente da construtora.</li>
          <li><b>Diagnóstico:</b> "Como vocês estão materializando os projetos para o cliente final hoje?"</li>
          <li><b>Dor:</b> conecte com prazos de venda na planta, taxa de conversão do stand e diferenciação.</li>
          <li><b>Prova:</b> cite cases (tour 3D, plantas humanizadas, vídeos) com resultado.</li>
          <li><b>CTA:</b> agendar demo de 30 min com decisor (marketing/comercial/incorporador).</li>
        </ol>
      </Section>

      <Section title="Checklist BANT">
        <ul className="space-y-1.5">
          <li>✅ <b>Budget:</b> ticket compatível com R$15k–R$60k por projeto?</li>
          <li>✅ <b>Authority:</b> falando com decisor (sócio, diretor de marketing/comercial)?</li>
          <li>✅ <b>Need:</b> existe lançamento, VGV ou projeto ativo nos próximos 90 dias?</li>
          <li>✅ <b>Timing:</b> material precisa estar pronto em até 60 dias?</li>
        </ul>
      </Section>

      <Section title="Scripts de follow-up">
        <p><b>D+1 (sem resposta):</b> "Oi [nome], passando rapidinho aqui — tudo bem? Consegue me dar 10 min essa semana pra eu te mostrar como reduzimos o ciclo de venda em obras como a [empreendimento]?"</p>
        <p><b>D+3:</b> envie um case relevante (link/vídeo) e pergunte: "Faz sentido pra realidade da [construtora]?"</p>
        <p><b>D+7:</b> "Quero respeitar seu tempo — prefere que eu retome em [mês que vem] ou encerro o assunto por aqui?"</p>
        <p><b>Pós-demo:</b> "Resumo do que combinamos + próximos passos + data de retorno."</p>
      </Section>
    </div>
  );
}
