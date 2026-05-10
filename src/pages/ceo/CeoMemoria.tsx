import { useState, useMemo, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useStrategicDecisions, useAddStrategicDecision } from "@/hooks/useCeoData";
import { useAllMonthlyStrategies, useCampaigns } from "@/hooks/useStrategy";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, Calendar, ChevronDown } from "lucide-react";

const fmtBRL = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const monthLabel = (monthIso: string) => {
  const [y, m] = monthIso.slice(0, 7).split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
};

function StrategySnapshot({ strategy }: { strategy: any }) {
  const { data: campaigns = [] } = useCampaigns(strategy.id);
  return (
    <div className="mt-3 space-y-3 border-t pt-3" style={{ borderColor: "var(--glass-border)" }}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Meta de caixa</p>
          <p className="text-base font-semibold" style={{ color: "hsl(160,100%,55%)" }}>{fmtBRL(strategy.cash_target)}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Mínimo operacional</p>
          <p className="text-base font-semibold" style={{ color: "hsl(45,100%,55%)" }}>{fmtBRL(strategy.operational_minimum)}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Origem</p>
          <p className="text-sm">{strategy.source}</p>
        </div>
      </div>
      {strategy.strategic_focus && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Foco</p>
          <p className="text-sm text-white/90">{strategy.strategic_focus}</p>
        </div>
      )}
      {Array.isArray(strategy.key_priorities) && strategy.key_priorities.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Prioridades</p>
          <ul className="text-sm space-y-1">
            {(strategy.key_priorities as string[]).map((p, i) => (
              <li key={i} className="flex gap-2"><span className="text-muted-foreground">•</span>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {campaigns.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Campanhas ({campaigns.length})</p>
          <div className="space-y-1">
            {campaigns.map((c: any) => (
              <div key={c.id} className="text-xs flex items-center gap-2 py-1">
                <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(0,200,150,0.12)", color: "hsl(160,100%,55%)" }}>{c.playbook_type}</span>
                <span className="text-white/90 font-medium">{c.name}</span>
                {c.target_description && <span className="text-muted-foreground">— {c.target_description}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {strategy.session_notes && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Notas da sessão</p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{strategy.session_notes}</p>
        </div>
      )}
    </div>
  );
}

function ArchivedStrategies() {
  const { data: strategies = [], isLoading } = useAllMonthlyStrategies();
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-32" />;
  if (strategies.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4" style={{ color: "hsl(160,100%,55%)" }} />
        <h2 className="text-base font-semibold text-white">Histórico de estratégias mensais</h2>
        <span className="text-xs text-muted-foreground">({strategies.length})</span>
      </div>
      {strategies.map((s: any) => {
        const expanded = openId === s.id;
        return (
          <div
            key={s.id}
            className="glass-card p-4 cursor-pointer transition-all hover:bg-white/[0.03]"
            onClick={() => setOpenId(expanded ? null : s.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{monthLabel(s.month)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.strategic_focus || "Sem foco definido"} · meta {fmtBRL(s.cash_target)}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
            </div>
            {expanded && <StrategySnapshot strategy={s} />}
          </div>
        );
      })}
    </div>
  );
}

const AMBER = "hsl(45, 100%, 55%)";

const TIPOS = [
  { value: "decisao_estrategica", label: "Decisão Estratégica", color: "bg-amber-500/20 text-amber-400" },
  { value: "aprendizado", label: "Aprendizado", color: "bg-blue-500/20 text-blue-400" },
  { value: "mudanca_processo", label: "Mudança de Processo", color: "bg-purple-500/20 text-purple-400" },
  { value: "observacao_mercado", label: "Observação de Mercado", color: "bg-green-500/20 text-green-400" },
];

export default function CeoMemoria() {
  const { data: decisions, isLoading } = useStrategicDecisions();
  const addDecision = useAddStrategicDecision();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    tipo: "decisao_estrategica",
    titulo: "",
    descricao: "",
    resultado_esperado: "",
    tags: "",
  });

  const filtered = useMemo(() => {
    let items = decisions || [];
    if (filterTipo) items = items.filter(d => d.tipo === filterTipo);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(d =>
        d.titulo.toLowerCase().includes(q) ||
        d.descricao.toLowerCase().includes(q) ||
        d.tags?.some((t: string) => t.toLowerCase().includes(q))
      );
    }
    return items;
  }, [decisions, filterTipo, search]);

  const handleSubmit = async () => {
    if (!formData.titulo || !formData.descricao) return;
    await addDecision.mutateAsync({
      tipo: formData.tipo,
      titulo: formData.titulo,
      descricao: formData.descricao,
      resultado_esperado: formData.resultado_esperado || null,
      tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    setFormData({ tipo: "decisao_estrategica", titulo: "", descricao: "", resultado_esperado: "", tags: "" });
    setShowForm(false);
  };

  const getTipoStyle = (tipo: string) => TIPOS.find(t => t.value === tipo) || TIPOS[0];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1", color: AMBER }}>Memória Estratégica</h1>
          <p className="text-sm text-muted-foreground mt-1">Decisões, aprendizados e observações do fundador</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: "rgba(245,158,11,0.15)", color: AMBER, border: "1px solid rgba(245,158,11,0.3)" }}
        >
          <Plus className="w-4 h-4" /> Novo Registro
        </button>
      </div>

      <ArchivedStrategies />


      {showForm && (
        <div className="glass-card p-6 border-amber-500/20 space-y-4">
          <div className="flex gap-2">
            {TIPOS.map(t => (
              <button key={t.value} onClick={() => setFormData(f => ({ ...f, tipo: t.value }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${formData.tipo === t.value ? t.color : "text-muted-foreground bg-muted/30"}`}
              >{t.label}</button>
            ))}
          </div>
          <input
            value={formData.titulo}
            onChange={e => setFormData(f => ({ ...f, titulo: e.target.value }))}
            placeholder="Título"
            className="w-full glass-input px-4 py-2.5 text-sm text-foreground"
          />
          <textarea
            value={formData.descricao}
            onChange={e => setFormData(f => ({ ...f, descricao: e.target.value }))}
            placeholder="Descrição detalhada..."
            rows={4}
            className="w-full glass-input px-4 py-2.5 text-sm text-foreground resize-none"
          />
          <input
            value={formData.resultado_esperado}
            onChange={e => setFormData(f => ({ ...f, resultado_esperado: e.target.value }))}
            placeholder="Resultado esperado (opcional)"
            className="w-full glass-input px-4 py-2.5 text-sm text-foreground"
          />
          <input
            value={formData.tags}
            onChange={e => setFormData(f => ({ ...f, tags: e.target.value }))}
            placeholder="Tags separadas por vírgula: #vendas, #financeiro"
            className="w-full glass-input px-4 py-2.5 text-sm text-foreground"
          />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={addDecision.isPending}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: "rgba(245,158,11,0.2)", color: AMBER, border: "1px solid rgba(245,158,11,0.3)" }}
            >{addDecision.isPending ? "Salvando..." : "Salvar"}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por palavra-chave..."
            className="w-full glass-input pl-10 pr-4 py-2 text-sm text-foreground"
          />
        </div>
        <div className="flex gap-1">
          <button onClick={() => setFilterTipo(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!filterTipo ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground"}`}
          >Todos</button>
          {TIPOS.map(t => (
            <button key={t.value} onClick={() => setFilterTipo(filterTipo === t.value ? null : t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterTipo === t.value ? t.color : "text-muted-foreground"}`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map(d => {
          const style = getTipoStyle(d.tipo);
          const expanded = expandedId === d.id;
          return (
            <div key={d.id} className="glass-card p-4 cursor-pointer transition-all hover:bg-white/[0.03]"
              onClick={() => setExpandedId(expanded ? null : d.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${style.color}`}>{style.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {d.data ? format(parseISO(d.data), "dd MMM yyyy", { locale: ptBR }) : ""}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium">{d.titulo}</h3>
                  {!expanded && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{d.descricao}</p>}
                </div>
              </div>
              {expanded && (
                <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "var(--glass-border)" }}>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{d.descricao}</p>
                  {d.resultado_esperado && (
                    <div>
                      <p className="text-xs font-medium text-foreground">Resultado Esperado:</p>
                      <p className="text-xs text-muted-foreground">{d.resultado_esperado}</p>
                    </div>
                  )}
                  {d.tags?.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {d.tags.map((tag: string) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum registro encontrado</p>
            <button onClick={() => setShowForm(true)} className="text-xs mt-2" style={{ color: AMBER }}>
              + Adicionar primeiro registro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
