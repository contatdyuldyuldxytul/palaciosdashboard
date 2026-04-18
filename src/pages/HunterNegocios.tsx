import { useState, useEffect, useMemo } from "react";

const SUPABASE_URL = "https://ebxfxjsmparfcbbkeied.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieGZ4anNtcGFyZmNiYmtlaWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjkxNTQsImV4cCI6MjA5MjEwNTE1NH0.aRQz1lWb9ihK_lJF4OtUhvhk8H4MTV70_syll1a74Wk";

const supabaseFetch = async (endpoint: string, options: any = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.method === "PATCH" ? "return=representation" : "return=minimal",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const DEMO_DATA: any[] = [
  { id: "demo1", title: "3D Architectural Visualization for Luxury Condo Development", description: "Looking for experienced 3D artist to create photorealistic renders of a 20-story residential tower. Need exterior, lobby, and 3 unit types. Timeline: 4 weeks.", platform: "Upwork", url: "#", score: 92, category: "archviz", budget_estimated_usd: 3500, urgency: "high", country: "US", summary_pt: "Incorporadora americana busca artista 3D para renderizar torre residencial de luxo de 20 andares.", summary_en: "US developer seeking 3D artist for luxury 20-story residential tower renders.", recommended_action: "Contatar imediatamente — projeto de alto valor e urgência.", status: "new", created_at: new Date().toISOString(), posted_at: new Date().toISOString() },
  { id: "demo2", title: "Renderização de Empreendimento Residencial — SP", description: "Precisamos de imagens 3D para lançamento imobiliário na zona sul de São Paulo. 12 unidades, fachada + áreas comuns + decorados.", platform: "Workana", url: "#", score: 95, category: "real_estate", budget_estimated_usd: 2800, urgency: "high", country: "BR", summary_pt: "Construtora em SP precisa de renders para lançamento residencial — fachada, áreas comuns e decorados.", summary_en: "Construction company in São Paulo needs renders for residential launch.", recommended_action: "Contato direto — cliente ideal, lançamento iminente.", status: "new", created_at: new Date(Date.now() - 86400000).toISOString(), posted_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "demo3", title: "Interior Design 3D Renders for Home Renovation", description: "Need 5 rooms rendered in modern minimalist style. Kitchen, living room, master bedroom, bathroom, and home office.", platform: "Reddit", url: "#", score: 68, category: "interior_design", budget_estimated_usd: 1200, urgency: "medium", country: "US", summary_pt: "Cliente americano precisa de 5 ambientes renderizados para reforma residencial.", summary_en: "US client needs 5 room renders for home renovation project.", recommended_action: "Bom projeto de entrada — ticket menor mas conversão fácil.", status: "contacted", created_at: new Date(Date.now() - 172800000).toISOString(), posted_at: new Date(Date.now() - 172800000).toISOString() },
  { id: "demo4", title: "Maquete Eletrônica para Prédio Comercial", description: "Empresa de engenharia busca parceiro para maquete eletrônica de prédio comercial de 8 andares no centro do RJ.", platform: "99Freelas", url: "#", score: 88, category: "archviz", budget_estimated_usd: 2200, urgency: "medium", country: "BR", summary_pt: "Empresa de engenharia no RJ precisa de maquete eletrônica de prédio comercial.", summary_en: "Engineering firm in Rio needs electronic model of commercial building.", recommended_action: "Projeto alinhado ao core — abordar com portfólio imobiliário.", status: "proposal_sent", created_at: new Date(Date.now() - 259200000).toISOString(), posted_at: new Date(Date.now() - 259200000).toISOString() },
  { id: "demo5", title: "Product 3D Rendering for E-commerce Catalog", description: "Furniture company needs 50 products rendered for their online store. White background, lifestyle shots.", platform: "Upwork", url: "#", score: 52, category: "product_3d", budget_estimated_usd: 4000, urgency: "low", country: "EU", summary_pt: "Empresa de móveis europeia precisa de 50 renders de produto para e-commerce.", summary_en: "European furniture company needs 50 product renders for e-commerce.", recommended_action: "Volume alto mas fora do core — avaliar capacidade antes de propor.", status: "new", created_at: new Date(Date.now() - 345600000).toISOString(), posted_at: new Date(Date.now() - 345600000).toISOString() },
  { id: "demo6", title: "Animação 3D para Lançamento Imobiliário", description: "Incorporadora em Curitiba precisa de animação flythrough de 60 segundos para novo empreendimento residencial.", platform: "Workana", url: "#", score: 90, category: "animation", budget_estimated_usd: 5000, urgency: "high", country: "BR", summary_pt: "Incorporadora em Curitiba busca animação flythrough de 60s para lançamento residencial.", summary_en: "Developer in Curitiba needs 60s flythrough animation for residential launch.", recommended_action: "Oportunidade premium — ticket alto e cliente recorrente em potencial.", status: "negotiating", created_at: new Date(Date.now() - 432000000).toISOString(), posted_at: new Date(Date.now() - 432000000).toISOString() },
];

export default function HunterNegocios() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [selectedOpp, setSelectedOpp] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (SUPABASE_URL.includes("COLE_SEU")) {
        setOpportunities(DEMO_DATA);
        setIsDemo(true);
        setLoading(false);
        return;
      }
      try {
        const data = await supabaseFetch(
          "opportunities?select=*&order=created_at.desc&limit=500"
        );
        setOpportunities(data || []);
      } catch (err: any) {
        setError(err.message);
        setOpportunities(DEMO_DATA);
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    const extra: any = {};
    if (newStatus === "contacted") extra.contacted_at = new Date().toISOString();
    if (["won", "lost"].includes(newStatus)) extra.closed_at = new Date().toISOString();
    if (!isDemo) {
      try {
        await supabaseFetch(`opportunities?id=eq.${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus, ...extra }),
        });
      } catch (err) {
        console.error(err);
      }
    }
    setOpportunities((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus, ...extra } : o))
    );
    if (selectedOpp?.id === id) {
      setSelectedOpp((prev: any) => ({ ...prev, status: newStatus, ...extra }));
    }
  };

  const filtered = useMemo(() => {
    let result = opportunities.filter((o) => {
      if (filterPlatform !== "all" && o.platform !== filterPlatform) return false;
      if (filterCountry !== "all" && o.country !== filterCountry) return false;
      if (filterStatus !== "all" && o.status !== filterStatus) return false;
      if (filterCategory !== "all" && o.category !== filterCategory) return false;
      if (o.score < minScore) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          o.title?.toLowerCase().includes(s) ||
          o.summary_pt?.toLowerCase().includes(s) ||
          o.description?.toLowerCase().includes(s)
        );
      }
      return true;
    });
    result.sort((a, b) => {
      if (sortBy === "score") return (b.score || 0) - (a.score || 0);
      if (sortBy === "budget") return (b.budget_estimated_usd || 0) - (a.budget_estimated_usd || 0);
      if (sortBy === "date") return +new Date(b.created_at) - +new Date(a.created_at);
      return 0;
    });
    return result;
  }, [opportunities, filterPlatform, filterCountry, filterStatus, filterCategory, minScore, searchTerm, sortBy]);

  const stats = useMemo(() => {
    const total = opportunities.length;
    const newCount = opportunities.filter((o) => o.status === "new").length;
    const contacted = opportunities.filter((o) => o.status === "contacted").length;
    const proposals = opportunities.filter((o) => o.status === "proposal_sent").length;
    const won = opportunities.filter((o) => o.status === "won").length;
    const highPriority = opportunities.filter((o) => o.score >= 70).length;
    const avgScore = total ? Math.round(opportunities.reduce((s, o) => s + (o.score || 0), 0) / total) : 0;
    const totalBudget = opportunities.filter((o) => o.status !== "lost").reduce((s, o) => s + (o.budget_estimated_usd || 0), 0);
    const wonBudget = opportunities.filter((o) => o.status === "won").reduce((s, o) => s + (o.budget_estimated_usd || 0), 0);
    return { total, newCount, contacted, proposals, won, highPriority, avgScore, totalBudget, wonBudget };
  }, [opportunities]);

  const platformColors: Record<string, string> = { Reddit: "#FF4500", Upwork: "#14a800", Workana: "#2D9CDB", "99Freelas": "#FF6B35" };
  const statusColors: Record<string, string> = { new: "#3B82F6", contacted: "#F59E0B", proposal_sent: "#8B5CF6", negotiating: "#EC4899", won: "#10B981", lost: "#6B7280", archived: "#374151" };
  const statusLabels: Record<string, string> = { new: "Novo", contacted: "Contatado", proposal_sent: "Proposta", negotiating: "Negociando", won: "Fechado ✓", lost: "Perdido", archived: "Arquivado" };
  const urgencyIcons: Record<string, string> = { high: "🔴", medium: "🟡", low: "🟢" };
  const categoryLabels: Record<string, string> = { archviz: "Archviz", product_3d: "Produto 3D", interior_design: "Interiores", real_estate: "Imobiliário", animation: "Animação", general_3d: "3D Geral" };

  const formatCurrency = (val: number) => val ? `$${val.toLocaleString("en-US")}` : "—";
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, animation: "pulse 1.5s infinite" }}>🎯</div>
          <p style={{ marginTop: 16, opacity: 0.6 }}>Carregando oportunidades...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#E2E8F0", padding: 24, fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>🎯 Opportunity Hunter</h1>
          <p style={{ margin: "4px 0 0", opacity: 0.6, fontSize: 14 }}>Palacios 3D Studio — Oportunidades em tempo real</p>
        </div>
        {isDemo && (
          <div style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", padding: "8px 14px", borderRadius: 8, fontSize: 12, border: "1px solid rgba(245,158,11,0.3)" }}>
            ⚠️ Modo Demo — Configure o Supabase para dados reais
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total", value: stats.total, color: "#64748B", icon: "📊" },
          { label: "Novas", value: stats.newCount, color: "#3B82F6", icon: "🆕" },
          { label: "Contatadas", value: stats.contacted, color: "#F59E0B", icon: "📞" },
          { label: "Propostas", value: stats.proposals, color: "#8B5CF6", icon: "📋" },
          { label: "Fechadas", value: stats.won, color: "#10B981", icon: "🏆" },
          { label: "Alta Prioridade", value: stats.highPriority, color: "#EF4444", icon: "🎯" },
          { label: "Score Médio", value: stats.avgScore, color: "#06B6D4", icon: "📈" },
          { label: "Pipeline ($)", value: formatCurrency(stats.totalBudget), color: "#10B981", icon: "💰" },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>
              {card.icon} {card.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: card.color, fontFamily: "'JetBrains Mono', monospace" }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <input
          type="text"
          placeholder="🔍 Buscar por título, resumo ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: "1 1 220px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 14px", color: "#E2E8F0", fontSize: 14, outline: "none" }}
        />
        {[
          { val: filterPlatform, set: setFilterPlatform, options: [["all", "Plataforma"], ["Reddit", "Reddit"], ["Upwork", "Upwork"], ["Workana", "Workana"], ["99Freelas", "99Freelas"]] },
          { val: filterCountry, set: setFilterCountry, options: [["all", "País"], ["BR", "🇧🇷 Brasil"], ["US", "🇺🇸 EUA"], ["EU", "🇪🇺 Europa"], ["OTHER", "Outro"]] },
          { val: filterStatus, set: setFilterStatus, options: [["all", "Status"], ["new", "Novo"], ["contacted", "Contatado"], ["proposal_sent", "Proposta"], ["negotiating", "Negociando"], ["won", "Fechado"], ["lost", "Perdido"]] },
          { val: filterCategory, set: setFilterCategory, options: [["all", "Categoria"], ["archviz", "Archviz"], ["real_estate", "Imobiliário"], ["interior_design", "Interiores"], ["animation", "Animação"], ["product_3d", "Produto 3D"], ["general_3d", "3D Geral"]] },
          { val: sortBy, set: setSortBy, options: [["score", "↓ Score"], ["budget", "↓ Budget"], ["date", "↓ Recente"]] },
        ].map((filter, i) => (
          <select
            key={i}
            value={filter.val}
            onChange={(e) => filter.set(e.target.value)}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#E2E8F0", fontSize: 13, cursor: "pointer", outline: "none" }}
          >
            {filter.options.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.7 }}>
          Score ≥ {minScore}
          <input type="range" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} style={{ width: 80, accentColor: "#3B82F6" }} />
        </div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 10 }}>
        {filtered.length} oportunidade{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((opp) => (
          <div
            key={opp.id}
            onClick={() => setSelectedOpp(opp)}
            style={{
              background: selectedOpp?.id === opp.id ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${selectedOpp?.id === opp.id ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 10,
              padding: "14px 18px",
              cursor: "pointer",
              transition: "all 0.15s",
              display: "grid",
              gridTemplateColumns: "52px 1fr auto",
              gap: 14,
              alignItems: "center",
            }}
            onMouseEnter={(e) => { if (selectedOpp?.id !== opp.id) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={(e) => { if (selectedOpp?.id !== opp.id) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: `conic-gradient(${opp.score >= 70 ? "#10B981" : opp.score >= 40 ? "#F59E0B" : "#6B7280"} ${opp.score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>
                {opp.score}
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {urgencyIcons[opp.urgency] || ""} {opp.title}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11 }}>
                <span style={{ background: `${platformColors[opp.platform] || "#64748B"}22`, color: platformColors[opp.platform] || "#64748B", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                  {opp.platform}
                </span>
                <span style={{ background: `${statusColors[opp.status] || "#64748B"}22`, color: statusColors[opp.status] || "#64748B", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                  {statusLabels[opp.status] || opp.status}
                </span>
                <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4, opacity: 0.7 }}>{categoryLabels[opp.category] || opp.category}</span>
                <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4, opacity: 0.7 }}>{opp.country}</span>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>
                {formatCurrency(opp.budget_estimated_usd)}
              </div>
              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{formatDate(opp.created_at)}</div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.5 }}>
          <div style={{ fontSize: 40 }}>🔍</div>
          <p>Nenhuma oportunidade encontrada com esses filtros.</p>
        </div>
      )}

      {selectedOpp && (
        <div
          onClick={() => setSelectedOpp(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 600, maxHeight: "85vh", overflow: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                  {selectedOpp.title}
                </h2>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, fontSize: 11 }}>
                  <span style={{ background: `${platformColors[selectedOpp.platform] || "#64748B"}22`, color: platformColors[selectedOpp.platform] || "#64748B", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                    {selectedOpp.platform}
                  </span>
                  <span style={{ background: `${statusColors[selectedOpp.status] || "#64748B"}22`, color: statusColors[selectedOpp.status] || "#64748B", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                    {statusLabels[selectedOpp.status]}
                  </span>
                  <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4, opacity: 0.7 }}>
                    {selectedOpp.country} · {categoryLabels[selectedOpp.category]}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedOpp(null)} style={{ background: "none", border: "none", color: "#E2E8F0", fontSize: 24, cursor: "pointer", opacity: 0.5, padding: 0 }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>SCORE</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: selectedOpp.score >= 70 ? "#10B981" : "#F59E0B", fontFamily: "'JetBrains Mono', monospace" }}>{selectedOpp.score}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>BUDGET EST.</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(selectedOpp.budget_estimated_usd)}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>URGÊNCIA</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{urgencyIcons[selectedOpp.urgency]} {selectedOpp.urgency}</div>
              </div>
            </div>

            {selectedOpp.summary_pt && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>RESUMO</div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{selectedOpp.summary_pt}</p>
              </div>
            )}

            {selectedOpp.recommended_action && (
              <div style={{ marginBottom: 14, padding: 12, background: "rgba(16,185,129,0.08)", borderLeft: "3px solid #10B981", borderRadius: 4 }}>
                <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4, color: "#10B981" }}>AÇÃO RECOMENDADA</div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{selectedOpp.recommended_action}</p>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>DESCRIÇÃO ORIGINAL</div>
              <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.8, maxHeight: 120, overflow: "auto", padding: 10, background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                {selectedOpp.description || "Sem descrição disponível."}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {selectedOpp.url && selectedOpp.url !== "#" && (
                <a href={selectedOpp.url} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 14px", borderRadius: 8, background: "#3B82F6", color: "white", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>
                  🔗 Abrir Post Original
                </a>
              )}
              {["new", "contacted", "proposal_sent", "negotiating", "won", "lost", "archived"].map((s) => (
                selectedOpp.status !== s && (
                  <button
                    key={s}
                    onClick={() => updateStatus(selectedOpp.id, s)}
                    style={{ padding: "8px 14px", borderRadius: 8, background: `${statusColors[s]}22`, color: statusColors[s], border: `1px solid ${statusColors[s]}44`, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    → {statusLabels[s]}
                  </button>
                )
              ))}
            </div>

            <div style={{ fontSize: 10, opacity: 0.4, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
              Criado em: {new Date(selectedOpp.created_at).toLocaleString("pt-BR")} · ID: {selectedOpp.id}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        select option { background: #1a1f2e; }
      `}</style>
    </div>
  );
}
