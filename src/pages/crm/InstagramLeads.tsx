import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Instagram, MessageSquare, Inbox, AlertCircle, ExternalLink, Search, ArrowUpDown,
  Check, Pencil, Trash2, Copy, Send, CheckCircle2, Sparkles, Loader2,
  Clock, ThumbsUp, Mail, Percent,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface InstagramLead {
  id: string;
  username: string;
  score: number;
  razao: string | null;
  tipo_lead: string | null;
  mensagem_rascunho: string | null;
  mensagem_aprovada: string | null;
  mensagem_editada: string | null;
  status: string;
  processado_em: string | null;
}

type StatusKey = "aguardando_revisao" | "aprovado" | "contatado" | "descartado";

const TABS: { key: StatusKey; label: string }[] = [
  { key: "aguardando_revisao", label: "Aguardando Revisão" },
  { key: "aprovado", label: "Aprovados" },
  { key: "contatado", label: "Contatados" },
  { key: "descartado", label: "Descartados" },
];

const TIPO_OPTIONS = [
  { value: "todos", label: "Todos os tipos" },
  { value: "arquiteto", label: "Arquiteto" },
  { value: "incorporadora", label: "Incorporadora" },
  { value: "construtora", label: "Construtora" },
  { value: "outro", label: "Outro" },
];

function useInstagramLeads(status: StatusKey) {
  return useQuery<InstagramLead[]>({
    queryKey: ["instagram-leads", status],
    queryFn: async () => {
      const res = await (supabase as any)
        .from("leads_qualified")
        .select("id, username, score, razao, tipo_lead, mensagem_rascunho, mensagem_aprovada, mensagem_editada, status, processado_em")
        .eq("status", status)
        .order("score", { ascending: false });
      if (res.error) throw res.error;
      return (res.data || []) as InstagramLead[];
    },
  });
}

interface StatsResult {
  counts: Record<string, number>;
  totalQualified: number;
  approvalRate: number;
}

function useStats() {
  return useQuery<StatsResult>({
    queryKey: ["instagram-leads", "stats"],
    queryFn: async () => {
      const res = await (supabase as any)
        .from("leads_qualified")
        .select("status, qualificado");
      if (res.error) throw res.error;
      const counts: Record<string, number> = {
        aguardando_revisao: 0, aprovado: 0, contatado: 0, descartado: 0, respondeu: 0,
      };
      let totalQualified = 0;
      (res.data || []).forEach((r: { status: string; qualificado: boolean | null }) => {
        if (r.status in counts) counts[r.status]++;
        if (r.qualificado === true) totalQualified++;
      });
      const approvalRate = totalQualified > 0
        ? Math.round(((counts.aprovado || 0) / totalQualified) * 100)
        : 0;
      return { counts, totalQualified, approvalRate };
    },
  });
}


const scoreBadge = (s: number) => {
  if (s >= 8) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (s >= 6) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
};

const tipoBadge = (tipo: string | null) => {
  const map: Record<string, string> = {
    arquiteto: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    incorporadora: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    construtora: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    outro: "bg-white/5 text-muted-foreground border-white/10",
  };
  return map[tipo?.toLowerCase() || "outro"] || map.outro;
};

const tipoLabel = (tipo: string | null) => {
  const map: Record<string, string> = {
    arquiteto: "Arquiteto", incorporadora: "Incorporadora",
    construtora: "Construtora", outro: "Outro",
  };
  return map[tipo?.toLowerCase() || "outro"] || (tipo || "Outro");
};

const emptyMessages: Record<StatusKey, string> = {
  aguardando_revisao: "Nenhum lead aguardando revisão",
  aprovado: "Nenhum lead aprovado",
  contatado: "Nenhum lead contatado",
  descartado: "Nenhum lead descartado",
};

export default function InstagramLeads() {
  const [activeTab, setActiveTab] = useState<StatusKey>("aguardando_revisao");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const [editingLead, setEditingLead] = useState<InstagramLead | null>(null);
  const [editingText, setEditingText] = useState("");
  const [confirmDiscardId, setConfirmDiscardId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleGenerateLeads = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("trigger-instagram-worker");
      if (error) throw error;
      toast.success("Worker iniciado! Os leads aparecerão em alguns minutos.");
      setCooldown(60);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao iniciar worker");
    } finally {
      setGenerating(false);
    }
  };

  const queryClient = useQueryClient();
  const { data: leads, isLoading, error } = useInstagramLeads(activeTab);
  const { data: stats } = useStats();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["instagram-leads"] });
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const res = await (supabase as any)
        .from("leads_qualified")
        .update(patch)
        .eq("id", id);
      if (res.error) throw res.error;
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar lead"),
  });

  const handleApprove = (lead: InstagramLead) => {
    updateMutation.mutate(
      {
        id: lead.id,
        patch: {
          status: "aprovado",
          aprovado_em: new Date().toISOString(),
          mensagem_aprovada: lead.mensagem_rascunho || "",
        },
      },
      { onSuccess: () => { invalidate(); toast.success("Lead aprovado"); } },
    );
  };

  const openEdit = (lead: InstagramLead) => {
    setEditingLead(lead);
    setEditingText(lead.mensagem_editada || lead.mensagem_rascunho || "");
  };

  const saveEdit = () => {
    if (!editingLead) return;
    updateMutation.mutate(
      {
        id: editingLead.id,
        patch: {
          status: "aprovado",
          aprovado_em: new Date().toISOString(),
          mensagem_editada: editingText,
          mensagem_aprovada: editingText,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          toast.success("Mensagem salva e lead aprovado");
          setEditingLead(null);
        },
      },
    );
  };

  const handleDiscard = (id: string) => {
    updateMutation.mutate(
      { id, patch: { status: "descartado" } },
      {
        onSuccess: () => {
          invalidate();
          toast.success("Lead descartado");
          setConfirmDiscardId(null);
        },
      },
    );
  };

  const handleCopy = async (lead: InstagramLead) => {
    const text = lead.mensagem_aprovada || lead.mensagem_editada || lead.mensagem_rascunho || "";
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensagem copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleContacted = (lead: InstagramLead) => {
    updateMutation.mutate(
      {
        id: lead.id,
        patch: { status: "contatado", contatado_em: new Date().toISOString() },
      },
      { onSuccess: () => { invalidate(); toast.success("Marcado como contatado"); } },
    );
  };

  const handleResponded = (lead: InstagramLead) => {
    updateMutation.mutate(
      { id: lead.id, patch: { status: "respondeu" } },
      { onSuccess: () => { invalidate(); toast.success("Marcado como respondeu"); } },
    );
  };

  const filtered = useMemo(() => {
    if (!leads) return [];
    let out = leads;
    if (tipoFilter !== "todos") {
      out = out.filter((l) => (l.tipo_lead || "outro").toLowerCase() === tipoFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase().replace(/^@/, "");
      out = out.filter((l) => l.username.toLowerCase().includes(q));
    }
    out = [...out].sort((a, b) => (sortDesc ? b.score - a.score : a.score - b.score));
    return out;
  }, [leads, tipoFilter, search, sortDesc]);

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/10">
            <Instagram className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Leads do Instagram</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Prospecção qualificada por IA de escritórios de arquitetura e incorporadoras
            </p>
          </div>
        </div>
        <Button
          onClick={handleGenerateLeads}
          disabled={generating || cooldown > 0}
          className="h-9 bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-pink-200 hover:from-pink-500/30 hover:to-purple-500/30"
        >
          {generating ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Iniciando…</>
          ) : cooldown > 0 ? (
            <><Sparkles className="w-3.5 h-3.5" /> Aguarde {cooldown}s</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> Gerar Novos Leads</>
          )}
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Aguardando Revisão</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{stats?.counts?.aguardando_revisao ?? 0}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
            <ThumbsUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Aprovados</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{stats?.counts?.aprovado ?? 0}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
            <Mail className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Contatados</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{stats?.counts?.contatado ?? 0}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20">
            <Percent className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Taxa de Aprovação</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{stats?.approvalRate ?? 0}%</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] overflow-x-auto">
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          const count = stats?.counts?.[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`relative px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {t.label}
                {typeof count === "number" && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      isActive ? "bg-primary/15 text-primary" : "bg-white/5 text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </span>
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-px bg-primary" />}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por @username..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:bg-white/[0.06] transition-colors"
          />
        </div>
        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
          className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-foreground focus:outline-none focus:border-primary/40 transition-colors min-w-[160px]"
        >
          {TIPO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-background">
              {o.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setSortDesc((v) => !v)}
          className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-foreground hover:bg-white/[0.06] transition-colors inline-flex items-center gap-1.5"
          title={sortDesc ? "Maior score primeiro" : "Menor score primeiro"}
        >
          <ArrowUpDown className="w-3 h-3" />
          Score {sortDesc ? "↓" : "↑"}
        </button>
      </div>

      {/* States */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 glass-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-xl p-8 flex flex-col items-center text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-destructive mb-3" />
          <h3 className="text-sm font-medium text-foreground mb-1">Erro ao carregar leads</h3>
          <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Inbox className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">
            {leads && leads.length > 0 ? "Nenhum resultado para os filtros" : emptyMessages[activeTab]}
          </h3>
          <p className="text-xs text-muted-foreground">
            {leads && leads.length > 0
              ? "Tente ajustar a busca ou o tipo selecionado."
              : "Os próximos leads aparecerão aqui."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((lead) => {
            const displayMessage =
              lead.status === "aprovado" || lead.status === "contatado"
                ? lead.mensagem_aprovada || lead.mensagem_editada || lead.mensagem_rascunho
                : lead.mensagem_rascunho;
            return (
              <article
                key={lead.id}
                className="glass-card rounded-xl p-5 flex flex-col gap-4 hover:bg-white/[0.06] transition-all duration-300"
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <a
                      href={`https://instagram.com/${lead.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 group"
                    >
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        @{lead.username}
                      </span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </a>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${scoreBadge(lead.score)}`}>
                        Score {lead.score}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${tipoBadge(lead.tipo_lead)}`}>
                        {tipoLabel(lead.tipo_lead)}
                      </span>
                    </div>
                  </div>
                </header>

                {lead.razao && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Por quê qualificou
                    </span>
                    <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">{lead.razao}</p>
                  </div>
                )}

                {displayMessage && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <MessageSquare className="w-3 h-3 text-primary" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        {lead.status === "aguardando_revisao" ? "Mensagem rascunho" : "Mensagem aprovada"}
                      </span>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-3.5">
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {displayMessage}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-auto pt-2 flex flex-wrap gap-2">
                  {lead.status === "aguardando_revisao" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(lead)}
                        disabled={updateMutation.isPending}
                        className="h-8 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                      >
                        <Check className="w-3 h-3" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(lead)}
                        className="h-8 text-xs bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]"
                      >
                        <Pencil className="w-3 h-3" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDiscardId(lead.id)}
                        className="h-8 text-xs bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3 h-3" /> Descartar
                      </Button>
                    </>
                  )}

                  {lead.status === "aprovado" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(lead)}
                        className="h-8 text-xs bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]"
                      >
                        <Copy className="w-3 h-3" /> Copiar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-8 text-xs bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]"
                      >
                        <a
                          href={`https://instagram.com/${lead.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Instagram className="w-3 h-3" /> Instagram
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleContacted(lead)}
                        disabled={updateMutation.isPending}
                        className="h-8 text-xs bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                      >
                        <Send className="w-3 h-3" /> Marcar contatado
                      </Button>
                    </>
                  )}

                  {lead.status === "contatado" && (
                    <Button
                      size="sm"
                      onClick={() => handleResponded(lead)}
                      disabled={updateMutation.isPending}
                      className="h-8 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Marcar respondeu
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      <Dialog open={!!editingLead} onOpenChange={(o) => !o && setEditingLead(null)}>
        <DialogContent className="glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>Editar mensagem</DialogTitle>
            <DialogDescription>
              @{editingLead?.username} — ao salvar, o lead é aprovado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            rows={10}
            className="bg-white/[0.04] border-white/[0.08] text-sm resize-none"
            placeholder="Mensagem para o lead..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLead(null)}>
              Cancelar
            </Button>
            <Button
              onClick={saveEdit}
              disabled={updateMutation.isPending || !editingText.trim()}
              className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
            >
              <Check className="w-3 h-3" /> Salvar e aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard confirmation */}
      <AlertDialog open={!!confirmDiscardId} onOpenChange={(o) => !o && setConfirmDiscardId(null)}>
        <AlertDialogContent className="glass-card border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar lead?</AlertDialogTitle>
            <AlertDialogDescription>
              O lead será movido para a aba "Descartados". Você pode reativá-lo depois se mudar de ideia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDiscardId && handleDiscard(confirmDiscardId)}
              className="bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
