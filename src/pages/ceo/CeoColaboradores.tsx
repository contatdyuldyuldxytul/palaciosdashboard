import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useComissaoVendedorByName } from "@/hooks/useComissaoVendedor";
import { useMetasMensais } from "@/hooks/useMetasMensais";
import { useLeads } from "@/hooks/useLeads";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Trophy, Mail, ShieldCheck, ShieldAlert, ShieldX, UserCog, Crown } from "lucide-react";

const COLAB_DEFINITIONS: { slug: "thiago" | "aline" | "milena" | "felipe"; nome: string; cor: string; salarioFixo: number }[] = [
  { slug: "thiago", nome: "Thiago", cor: "hsl(45,80%,55%)", salarioFixo: 0 },
  { slug: "aline", nome: "Aline", cor: "hsl(190,70%,55%)", salarioFixo: 2000 },
  { slug: "milena", nome: "Milena", cor: "hsl(280,60%,60%)", salarioFixo: 1500 },
  { slug: "felipe", nome: "Felipe", cor: "hsl(150,60%,50%)", salarioFixo: 2000 },
];
const SUB_ROLE_OPTIONS = ["ceo", "bdr", "ldr", "cs", "closer"];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

interface ProfileRow {
  id: string;
  full_name: string;
  email: string | null;
  status: "pending" | "approved" | "rejected";
  colaborador_slug: string | null;
  sub_role: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string; Icon: any }> = {
    approved: { bg: "rgba(0,200,150,0.12)", color: "#00C896", label: "Aprovado", Icon: ShieldCheck },
    pending: { bg: "rgba(245,158,11,0.12)", color: "#F59E0B", label: "Pendente", Icon: ShieldAlert },
    rejected: { bg: "rgba(239,68,68,0.12)", color: "#EF4444", label: "Rejeitado", Icon: ShieldX },
  };
  const m = map[status] || map.pending;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: m.bg, color: m.color }}>
      <m.Icon className="w-3 h-3" /> {m.label}
    </span>
  );
}

export default function CeoColaboradores() {
  const qc = useQueryClient();
  const mesAtual = new Date().toISOString().slice(0, 7);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["all_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, status, colaborador_slug, sub_role")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ProfileRow[];
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (p: Partial<ProfileRow> & { id: string }) => {
      const { id, ...rest } = p;
      const { error } = await supabase.from("profiles").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_profiles"] });
      qc.invalidateQueries({ queryKey: ["vendedores_profiles"] });
      toast({ title: "Atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const pendingProfiles = profiles.filter((p) => p.status === "pending");
  const profileBySlug = (slug: string) => profiles.find((p) => p.colaborador_slug === slug && p.status === "approved");

  // Compute % meta + comissões per colaborador
  const { data: metas } = useMetasMensais(mesAtual);
  const { data: leads = [] } = useLeads();

  const stats = useMemo(() => {
    return COLAB_DEFINITIONS.map((c) => {
      const profile = profileBySlug(c.slug);
      // Default meta target per slug
      const metaContratos = metas?.contratos || 0;
      const metaDemos = c.slug === "aline" ? (metas?.demos_aline || 0) : 0;
      const metaLeads = c.slug === "milena" ? (metas?.leads_milena || 0) : 0;

      // Realizado (basic counts based on leads)
      const myLeads = leads.filter((l: any) =>
        (l.responsavel_nome || "").toLowerCase().includes(c.nome.toLowerCase())
      );
      const realizadoContratos = myLeads.filter((l: any) => l.status === "fechado").length;
      const realizadoDemos = myLeads.filter((l: any) => l.status === "reuniao_realizada" || l.status === "proposta" || l.status === "fechado").length;

      const meta = metaContratos + metaDemos + metaLeads;
      const realizado = realizadoContratos + (c.slug === "aline" ? realizadoDemos : 0);
      const pct = meta > 0 ? Math.min(100, (realizado / meta) * 100) : 0;

      return { ...c, profile, pct, realizado, meta };
    });
  }, [profiles, leads, metas]);

  const ranking = [...stats].sort((a, b) => b.pct - a.pct);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Colaboradores</h1>
        <p className="text-sm text-muted-foreground mt-1">Time comercial — performance, salário e acesso</p>
      </div>

      {/* Pending approvals */}
      {pendingProfiles.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-3" style={{ borderColor: "rgba(245,158,11,0.3)" }}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-300">{pendingProfiles.length} solicitação(ões) de acesso pendente(s)</h2>
          </div>
          <div className="space-y-2">
            {pendingProfiles.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="min-w-0">
                  <div className="text-sm text-foreground truncate">{p.full_name || "(sem nome)"}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    defaultValue=""
                    onChange={(e) => updateProfile.mutate({ id: p.id, colaborador_slug: (e.target.value || null) as any })}
                    className="text-xs px-2 py-1 rounded-lg bg-transparent border border-white/10 text-foreground"
                  >
                    <option value="">Atribuir…</option>
                    {COLAB_DEFINITIONS.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.nome}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => updateProfile.mutate({ id: p.id, status: "approved" })}
                    className="px-3 py-1 text-xs font-medium rounded-lg" style={{ background: "rgba(0,200,150,0.15)", color: "#00C896" }}
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => updateProfile.mutate({ id: p.id, status: "rejected" })}
                    className="px-3 py-1 text-xs font-medium rounded-lg" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((c, idx) => {
          const rankIdx = ranking.findIndex((r) => r.slug === c.slug);
          return (
            <ColaboradorCard
              key={c.slug}
              colab={c}
              rank={rankIdx + 1}
              salarioFixo={c.salarioFixo}
              mesAtual={mesAtual}
              allProfiles={profiles}
              onAssignEmail={(profileId, slug) => updateProfile.mutate({ id: profileId, colaborador_slug: slug as any })}
              onSetSubRole={(profileId, sub) => updateProfile.mutate({ id: profileId, sub_role: sub })}
              isFirst={rankIdx === 0}
            />
          );
        })}
      </div>

      {/* Ranking */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-foreground">Ranking do mês</h2>
        </div>
        <div className="space-y-2">
          {ranking.map((r, i) => (
            <div key={r.slug} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: i === 0 ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)" }}>
              <div className="w-7 text-center font-bold" style={{ color: i === 0 ? "#F59E0B" : "hsl(var(--muted-foreground))" }}>{i + 1}º</div>
              <div className="flex-1 text-sm text-foreground">{r.nome}</div>
              <div className="text-xs text-muted-foreground">{r.realizado}/{r.meta || "—"}</div>
              <div className="w-12 text-right text-sm font-semibold" style={{ color: r.cor }}>{Math.round(r.pct)}%</div>
            </div>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
    </div>
  );
}

function ColaboradorCard({
  colab, rank, salarioFixo, mesAtual, allProfiles, onAssignEmail, onSetSubRole, isFirst,
}: any) {
  const { comissao } = useComissaoVendedorByName(colab.nome, mesAtual);
  const profile = colab.profile;
  const availableProfiles = allProfiles.filter((p: ProfileRow) =>
    p.status === "approved" && (!p.colaborador_slug || p.colaborador_slug === colab.slug)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 relative overflow-hidden"
      style={{ borderColor: isFirst ? "rgba(245,158,11,0.4)" : undefined }}
    >
      {isFirst && (
        <div className="absolute top-3 right-3">
          <Crown className="w-4 h-4 text-amber-400" />
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white"
          style={{ background: colab.cor }}
        >
          {colab.nome[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{colab.nome}</h3>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "hsl(var(--muted-foreground))" }}>
              {profile?.sub_role || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Mail className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">{profile?.email || "Sem conta vinculada"}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">Rank</div>
          <div className="text-lg font-bold" style={{ color: colab.cor }}>{rank}º</div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="text-[10px] text-muted-foreground">% Meta</div>
          <div className="text-base font-semibold text-foreground">{Math.round(colab.pct)}%</div>
        </div>
        <div className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="text-[10px] text-muted-foreground">Salário</div>
          <div className="text-sm font-semibold text-foreground">{fmt(salarioFixo)}</div>
        </div>
        <div className="p-2 rounded-lg" style={{ background: "rgba(0,200,150,0.08)" }}>
          <div className="text-[10px] text-muted-foreground">Comissão</div>
          <div className="text-sm font-semibold text-primary">{fmt(comissao || 0)}</div>
        </div>
      </div>

      {/* Profile controls */}
      <div className="space-y-2 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <UserCog className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Conta</span>
          {profile && <StatusBadge status={profile.status} />}
        </div>
        <select
          value={profile?.id || ""}
          onChange={(e) => {
            const newId = e.target.value;
            if (profile && profile.id !== newId) {
              onAssignEmail(profile.id, null); // unassign old
            }
            if (newId) onAssignEmail(newId, colab.slug);
          }}
          className="w-full text-xs px-2 py-1.5 rounded-lg bg-transparent border border-white/10 text-foreground"
        >
          <option value="">— Sem conta —</option>
          {availableProfiles.map((p: ProfileRow) => (
            <option key={p.id} value={p.id}>{p.email}</option>
          ))}
        </select>
        {profile && (
          <select
            value={profile.sub_role || ""}
            onChange={(e) => onSetSubRole(profile.id, e.target.value || null)}
            className="w-full text-xs px-2 py-1.5 rounded-lg bg-transparent border border-white/10 text-foreground"
          >
            <option value="">— Sub-cargo —</option>
            {SUB_ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r.toUpperCase()}</option>
            ))}
          </select>
        )}
      </div>
    </motion.div>
  );
}
