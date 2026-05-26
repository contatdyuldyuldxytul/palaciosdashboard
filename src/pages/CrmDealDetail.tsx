import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Building2, Mail, Phone, Calendar as CalendarIcon, User, Trophy, X, Edit,
  Plus, Check, Tag, Phone as PhoneIcon, Mail as MailIcon, ClipboardList, Users,
  Clock, MessageSquare, History, Linkedin, Instagram, MapPin, Globe, DollarSign,
  Briefcase, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  useCollaborators, useCrmLabels, useCreateLabel, useUpdateDeal, useUpdatePerson,
  useUpdateOrganization, useDealNotes, useCreateNote, useCreateActivity, useToggleActivity,
  useDealHistory,
} from "@/hooks/useCrm";
import { Composer } from "@/components/crm/email/Composer";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const ACTIVITY_TYPES = [
  { value: "ligacao", label: "Ligação", icon: PhoneIcon },
  { value: "email", label: "Email", icon: MailIcon },
  { value: "tarefa", label: "Tarefa", icon: ClipboardList },
  { value: "reuniao", label: "Reunião", icon: Users },
  { value: "prazo", label: "Prazo", icon: Clock },
] as const;

const LABEL_COLORS = [
  "#374151", "#facc15", "#10b981", "#2563eb", "#7c3aed",
  "#ef4444", "#f9a8d4", "#3b82f6", "#fb923c", "#ec4899",
];

export default function CrmDealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: deal, isLoading } = useQuery({
    queryKey: ["crm", "deal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_deals")
        .select("*, organization:crm_organizations(*), person:crm_persons(*), pipeline:crm_pipelines(nome), stage:crm_stages(nome,cor,ordem)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: allStages = [] } = useQuery({
    queryKey: ["crm", "stages", deal?.pipeline_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_stages").select("*").eq("pipeline_id", deal!.pipeline_id).order("ordem");
      return data || [];
    },
    enabled: !!deal?.pipeline_id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["crm", "activities", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_activities").select("*").eq("deal_id", id!).order("scheduled_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: notes = [] } = useDealNotes(id);
  const { data: history = [] } = useDealHistory(id);
  const { data: labels = [] } = useCrmLabels();
  const { data: collaborators = [] } = useCollaborators();

  const updateDeal = useUpdateDeal();
  const updatePerson = useUpdatePerson();
  const updateOrg = useUpdateOrganization();
  const createNote = useCreateNote();
  const createActivity = useCreateActivity();
  const toggleActivity = useToggleActivity();
  const createLabel = useCreateLabel();

  const currentStageIdx = useMemo(
    () => allStages.findIndex(s => s.id === deal?.stage_id),
    [allStages, deal?.stage_id]
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ["crm", "deal", id] });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando deal…</div>;
  if (!deal) return <div className="p-6 text-sm text-muted-foreground">Deal não encontrado.</div>;

  const daysIn = Math.floor((Date.now() - new Date(deal.stage_entered_at).getTime()) / 86400000);

  const handleStageChange = async (stageId: string) => {
    if (stageId === deal.stage_id) return;
    try {
      await updateDeal.mutateAsync({ id: deal.id, patch: { stage_id: stageId } });
      refresh();
      toast({ title: "Etapa atualizada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handlePatchDeal = async (patch: Record<string, any>) => {
    try {
      await updateDeal.mutateAsync({ id: deal.id, patch });
      refresh();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const handlePatchPerson = async (patch: Record<string, any>) => {
    try {
      let personId = deal.person_id;
      if (!personId) {
        const { data: newP, error } = await supabase
          .from("crm_persons")
          .insert({ nome: patch.first_name || patch.last_name || patch.email || "Novo contato", ...patch })
          .select()
          .single();
        if (error) throw error;
        personId = newP.id;
        await updateDeal.mutateAsync({ id: deal.id, patch: { person_id: personId } });
      } else {
        await updatePerson.mutateAsync({ id: personId, patch });
      }
      refresh();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handlePatchOrg = async (patch: Record<string, any>) => {
    try {
      let orgId = deal.organization_id;
      if (!orgId) {
        const { data: newO, error } = await supabase
          .from("crm_organizations")
          .insert({ nome: patch.nome || "Nova empresa", ...patch })
          .select()
          .single();
        if (error) throw error;
        orgId = newO.id;
        await updateDeal.mutateAsync({ id: deal.id, patch: { organization_id: orgId } });
      } else {
        await updateOrg.mutateAsync({ id: orgId, patch });
      }
      refresh();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const person: any = deal.person;
  const org: any = deal.organization;
  const dealLabels = (deal as any).label_ids as string[] || [];

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      <button onClick={() => navigate("/crm")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao CRM
      </button>

      {/* Header */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{(deal as any).pipeline?.nome}</div>
            <InlineText
              value={deal.titulo}
              onSave={(v) => handlePatchDeal({ titulo: v })}
              className="text-2xl font-semibold text-foreground leading-tight"
              placeholder="Título do deal"
            />
            {org && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1">
                <Building2 className="w-3.5 h-3.5" />
                {org.nome}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor</div>
            <InlineNumber
              value={Number(deal.valor) || 0}
              onSave={(v) => handlePatchDeal({ valor: v })}
              className="text-3xl font-bold text-primary tabular-nums"
            />
          </div>
        </div>

        {/* Clickable stage bar */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5">
            {allStages.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => handleStageChange(s.id)}
                className="flex-1 group relative cursor-pointer"
                title={`Mover para ${s.nome}`}
              >
                <div
                  className={cn(
                    "h-4 rounded-full transition-all group-hover:h-5 shadow-sm",
                    idx <= currentStageIdx ? "" : "bg-white/5"
                  )}
                  style={idx <= currentStageIdx ? { background: s.cor || "hsl(var(--primary))" } : undefined}
                />
                <div className={cn(
                  "text-[10px] mt-2 text-center truncate transition-colors",
                  idx === currentStageIdx ? "text-foreground font-semibold" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {s.nome}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => handlePatchDeal({ status: "won", data_fechamento: new Date().toISOString() })}>
            <Trophy className="w-3.5 h-3.5 mr-1.5" /> Marcar como Ganho
          </Button>
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-300 hover:bg-red-500/10"
            onClick={() => handlePatchDeal({ status: "lost", data_fechamento: new Date().toISOString() })}>
            <X className="w-3.5 h-3.5 mr-1.5" /> Marcar como Perdido
          </Button>
          {daysIn >= 7 && (
            <div className={cn(
              "ml-auto text-[10px] px-2.5 py-1 rounded-full self-center",
              daysIn >= 14 ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"
            )}>
              {daysIn} dias no estágio atual
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main column (now RIGHT) */}
        <div className="lg:col-span-2 lg:order-2 space-y-4">
          <Tabs defaultValue="atividades">
            <TabsList className="glass-card border border-white/10">
              <TabsTrigger value="atividades">Atividades</TabsTrigger>
              <TabsTrigger value="notas">Notas</TabsTrigger>
              <TabsTrigger value="email">E-mail</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
            </TabsList>

            <TabsContent value="atividades" className="mt-4">
              <ActivitiesPanel
                dealId={deal.id}
                activities={activities}
                collaborators={collaborators}
                onCreate={async (p) => { await createActivity.mutateAsync({ ...p, deal_id: deal.id }); }}
                onToggle={async (a) => { await toggleActivity.mutateAsync({ id: a.id, concluida: !a.concluida, deal_id: deal.id }); }}
              />
            </TabsContent>

            <TabsContent value="notas" className="mt-4">
              <NotesPanel
                notes={notes}
                onCreate={async (conteudo) => { await createNote.mutateAsync({ deal_id: deal.id, conteudo }); }}
              />
            </TabsContent>

            <TabsContent value="email" className="mt-4">
              <EmailPanel
                dealId={deal.id}
                personEmail={person?.email || ""}
                personName={person?.nome || ""}
              />
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              <FilesPanel dealId={deal.id} />
            </TabsContent>
          </Tabs>

          {/* History always visible below the tabs */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Histórico</h3>
            </div>
            <HistoryList
              dealCreatedAt={deal.created_at}
              stageEnteredAt={deal.stage_entered_at}
              history={history}
              activities={activities}
              notes={notes}
              stages={allStages}
            />
          </div>
        </div>

        {/* Sidebar (now LEFT) */}
        <div className="lg:order-1 space-y-4">
          {/* SUMÁRIO */}
          <SectionCard title="Sumário">
            <Field label="Valor">
              <InlineNumber
                value={Number(deal.valor) || 0}
                onSave={(v) => handlePatchDeal({ valor: v })}
                className="text-sm font-semibold text-primary"
              />
            </Field>
            <Field label="Empresa">
              <span className="text-sm text-foreground">{org?.nome || "—"}</span>
            </Field>
            <Field label="Contato (Decisor)">
              <span className="text-sm text-foreground">{person?.nome || "—"}</span>
            </Field>
            <Field label="Etiquetas">
              <LabelPicker
                allLabels={labels}
                selectedIds={dealLabels}
                onChange={(ids) => handlePatchDeal({ label_ids: ids })}
                onCreate={async (nome, cor) => {
                  const newLabel = await createLabel.mutateAsync({ nome, cor });
                  await handlePatchDeal({ label_ids: [...dealLabels, newLabel.id] });
                }}
              />
            </Field>
            <Field label="Probabilidade">
              <ProbSlider
                value={(deal as any).probabilidade ?? 0}
                onChange={(v) => handlePatchDeal({ probabilidade: v })}
              />
            </Field>
            <Field label="Fechamento esperado">
              <InlineText
                value={deal.expected_close_date || ""}
                onSave={(v) => handlePatchDeal({ expected_close_date: v || null })}
                placeholder="AAAA-MM-DD"
                inputType="date"
                className="text-sm text-foreground"
              />
            </Field>
          </SectionCard>

          {/* DADOS DO LEAD */}
          <SectionCard title="Dados do Lead">
            <Field label="Telefone">
              <InlineText value={person?.telefone || ""} onSave={(v) => handlePatchPerson({ telefone: v })} placeholder="—" disabled={!deal.person_id} />
            </Field>
            <Field label="Email">
              <InlineText value={person?.email || ""} onSave={(v) => handlePatchPerson({ email: v })} placeholder="—" disabled={!deal.person_id} />
            </Field>
            <Field label="First name">
              <InlineText value={person?.first_name || ""} onSave={(v) => handlePatchPerson({ first_name: v })} placeholder="—" disabled={!deal.person_id} />
            </Field>
            <Field label="Last name">
              <InlineText value={person?.last_name || ""} onSave={(v) => handlePatchPerson({ last_name: v })} placeholder="—" disabled={!deal.person_id} />
            </Field>
            <Field label="Cargo">
              <InlineText value={person?.cargo || ""} onSave={(v) => handlePatchPerson({ cargo: v })} placeholder="—" disabled={!deal.person_id} />
            </Field>
            <Field label="LinkedIn">
              <InlineText value={person?.linkedin || ""} onSave={(v) => handlePatchPerson({ linkedin: v })} placeholder="—" disabled={!deal.person_id} />
            </Field>
          </SectionCard>

          {/* DADOS DA EMPRESA */}
          <SectionCard title="Dados da Empresa">
            <Field label="Nome">
              <InlineText value={org?.nome || ""} onSave={(v) => handlePatchOrg({ nome: v })} placeholder="—" disabled={!deal.organization_id} />
            </Field>
            <Field label="Endereço">
              <InlineText value={org?.endereco || ""} onSave={(v) => handlePatchOrg({ endereco: v })} placeholder="—" disabled={!deal.organization_id} />
            </Field>
            <Field label="Website">
              <InlineText value={org?.site || ""} onSave={(v) => handlePatchOrg({ site: v })} placeholder="—" disabled={!deal.organization_id} />
            </Field>
            <Field label="Nº Colaboradores">
              <InlineText value={org?.num_colaboradores ?? ""} onSave={(v) => handlePatchOrg({ num_colaboradores: v ? Number(v) : null })} placeholder="—" disabled={!deal.organization_id} />
            </Field>
            <Field label="Porte">
              <InlineText value={org?.porte || ""} onSave={(v) => handlePatchOrg({ porte: v })} placeholder="—" disabled={!deal.organization_id} />
            </Field>
            <Field label="Faturamento">
              <InlineText value={org?.faturamento ?? ""} onSave={(v) => handlePatchOrg({ faturamento: v ? Number(v) : null })} placeholder="—" disabled={!deal.organization_id} />
            </Field>
            <Field label="Instagram">
              <InlineText value={org?.instagram || ""} onSave={(v) => handlePatchOrg({ instagram: v })} placeholder="—" disabled={!deal.organization_id} />
            </Field>
            <Field label="LinkedIn">
              <InlineText value={org?.linkedin || ""} onSave={(v) => handlePatchOrg({ linkedin: v })} placeholder="—" disabled={!deal.organization_id} />
            </Field>
            <Field label="WhatsApp">
              <InlineText value={org?.whatsapp || ""} onSave={(v) => handlePatchOrg({ whatsapp: v })} placeholder="—" disabled={!deal.organization_id} />
            </Field>
          </SectionCard>

          {/* RESPONSÁVEL */}
          <SectionCard title="Responsável">
            <Select
              value={deal.owner_user_id || "__none"}
              onValueChange={(v) => {
                if (v === "__none") {
                  handlePatchDeal({ owner_user_id: null, owner_label: null });
                } else {
                  const c = collaborators.find((c: any) => c.id === v);
                  handlePatchDeal({ owner_user_id: v, owner_label: c?.full_name || c?.email || null });
                }
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecionar…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Sem responsável —</SelectItem>
                {collaborators.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SectionCard>

          {/* DATAS */}
          <SectionCard title="Datas">
            <Field label="Criado em">
              <span className="text-sm text-foreground">{fmtDate(deal.created_at)}</span>
            </Field>
            <Field label="Entrou no estágio">
              <span className="text-sm text-foreground">{fmtDate(deal.stage_entered_at)}</span>
            </Field>
            <Field label="Fechamento esperado">
              <span className="text-sm text-foreground">{fmtDate(deal.expected_close_date)}</span>
            </Field>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

/* ============ Helpers ============ */

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 min-h-[28px]">
      <span className="text-[11px] text-muted-foreground flex-shrink-0">{label}</span>
      <div className="text-right min-w-0 flex-1">{children}</div>
    </div>
  );
}

function InlineText({
  value, onSave, placeholder = "—", className, inputType = "text", disabled = false,
}: {
  value: string | number;
  onSave: (v: string) => void | Promise<void>;
  placeholder?: string;
  className?: string;
  inputType?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value ?? ""));
  useEffect(() => setVal(String(value ?? "")), [value]);

  if (editing && !disabled) {
    return (
      <Input
        autoFocus
        type={inputType}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { setEditing(false); if (val !== String(value ?? "")) onSave(val); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); }
          if (e.key === "Escape") { setVal(String(value ?? "")); setEditing(false); }
        }}
        className={cn("h-8 text-sm bg-background/50", className)}
      />
    );
  }
  return (
    <div className="flex items-center justify-end gap-1 group/inline w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setEditing(true)}
        className={cn(
          "text-sm text-foreground text-right truncate hover:bg-white/5 px-1.5 py-0.5 rounded transition-colors min-w-0",
          disabled && "cursor-not-allowed opacity-60",
          !value && "text-muted-foreground italic",
          className
        )}
      >
        {value === "" || value === null || value === undefined ? placeholder : String(value)}
      </button>
      {!disabled && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Editar"
          className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-white/10 opacity-70 group-hover/inline:opacity-100 transition-all flex-shrink-0"
        >
          <Edit className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function InlineNumber({
  value, onSave, className,
}: {
  value: number;
  onSave: (v: number) => void | Promise<void>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  useEffect(() => setVal(String(value)), [value]);

  if (editing) {
    return (
      <Input
        autoFocus
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { setEditing(false); const n = Number(val) || 0; if (n !== value) onSave(n); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") { setVal(String(value)); setEditing(false); }
        }}
        className={cn("h-9 text-right tabular-nums", className)}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn("hover:bg-white/5 px-1.5 py-0.5 rounded transition-colors", className)}
    >
      {fmt(value)}
    </button>
  );
}

function ProbSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <div className="flex items-center gap-2 w-full">
      <Slider
        value={[local]}
        onValueChange={(v) => setLocal(v[0])}
        onValueCommit={(v) => onChange(v[0])}
        min={0} max={100} step={5}
        className="flex-1"
      />
      <span className="text-xs text-foreground tabular-nums w-10 text-right">{local}%</span>
    </div>
  );
}

function LabelPicker({
  allLabels, selectedIds, onChange, onCreate,
}: {
  allLabels: any[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreate: (nome: string, cor: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [newColor, setNewColor] = useState(LABEL_COLORS[0]);

  const filtered = allLabels.filter(l => l.nome.toLowerCase().includes(search.toLowerCase()));
  const selected = allLabels.filter(l => selectedIds.includes(l.id));

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id));
    else onChange([...selectedIds, id]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-full text-right hover:bg-white/5 px-1.5 py-1 rounded transition-colors min-h-[28px]">
          {selected.length === 0 ? (
            <span className="text-xs text-muted-foreground italic">+ etiquetas</span>
          ) : (
            <div className="flex flex-wrap gap-1 justify-end">
              {selected.map(l => (
                <span key={l.id} className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded text-white" style={{ background: l.cor }}>
                  {l.nome}
                </span>
              ))}
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2 bg-background/95 backdrop-blur-xl border-white/10" align="end">
        <Input
          placeholder="Buscar etiquetas…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs mb-2"
        />
        <div className="max-h-56 overflow-y-auto space-y-1">
          {filtered.map(l => (
            <button
              key={l.id}
              onClick={() => toggle(l.id)}
              className="w-full flex items-center justify-between text-left px-1.5 py-1 hover:bg-white/5 rounded"
            >
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-white" style={{ background: l.cor }}>
                {l.nome}
              </span>
              {selectedIds.includes(l.id) && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          ))}
        </div>
        {search && !allLabels.find(l => l.nome.toLowerCase() === search.toLowerCase()) && (
          <div className="border-t border-white/10 mt-2 pt-2 space-y-2">
            <div className="flex gap-1 flex-wrap">
              {LABEL_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={cn("w-5 h-5 rounded", newColor === c && "ring-2 ring-foreground")}
                  style={{ background: c }}
                />
              ))}
            </div>
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={async () => { await onCreate(search.toUpperCase(), newColor); setSearch(""); }}
            >
              <Plus className="w-3 h-3 mr-1" /> Criar "{search.toUpperCase()}"
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ============ Activities ============ */

function ActivitiesPanel({
  dealId, activities, collaborators, onCreate, onToggle,
}: {
  dealId: string;
  activities: any[];
  collaborators: any[];
  onCreate: (p: any) => Promise<void>;
  onToggle: (a: any) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Atividades</h3>
        <Button size="sm" variant={open ? "outline" : "default"} onClick={() => setOpen(!open)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> {open ? "Fechar" : "Nova Atividade"}
        </Button>
      </div>

      {open && (
        <ActivityForm
          collaborators={collaborators}
          onCancel={() => setOpen(false)}
          onSave={async (p) => { await onCreate(p); setOpen(false); }}
        />
      )}

      <div className="space-y-1 pt-2">
        {activities.length === 0 && !open && (
          <div className="text-xs text-muted-foreground text-center py-6">Sem atividades.</div>
        )}
        {activities.map((a) => {
          const TypeIcon = ACTIVITY_TYPES.find(t => t.value === a.tipo)?.icon || ClipboardList;
          return (
            <div key={a.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
              <Checkbox checked={a.concluida} onCheckedChange={() => onToggle(a)} className="mt-0.5" />
              <TypeIcon className="w-3.5 h-3.5 text-muted-foreground mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className={cn("text-sm text-foreground", a.concluida && "line-through opacity-60")}>{a.titulo}</div>
                {a.descricao && <div className="text-[11px] text-muted-foreground mt-0.5">{a.descricao}</div>}
                <div className="text-[10px] text-muted-foreground/80 mt-0.5 flex gap-2">
                  {a.scheduled_at && <span>{new Date(a.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>}
                  {a.owner_label && <span>· {a.owner_label}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityForm({
  collaborators, onCancel, onSave,
}: {
  collaborators: any[];
  onCancel: () => void;
  onSave: (p: any) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<string>("ligacao");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [descricao, setDescricao] = useState("");
  const [owner, setOwner] = useState<string>("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!titulo.trim()) { toast({ title: "Informe um título", variant: "destructive" }); return; }
    setSaving(true);
    try {
      let scheduled_at: string | null = null;
      let duracao_min: number | null = null;
      if (date && startTime) {
        scheduled_at = new Date(`${date}T${startTime}:00`).toISOString();
        if (endTime) {
          const start = new Date(`${date}T${startTime}:00`);
          const end = new Date(`${date}T${endTime}:00`);
          duracao_min = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
        }
      }
      await onSave({
        tipo, titulo, descricao: descricao || null, scheduled_at, duracao_min,
        owner_label: owner || null, concluida: done,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <Input
        autoFocus
        placeholder="Título da atividade"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="text-base font-medium"
      />

      <div className="flex gap-1 flex-wrap">
        {ACTIVITY_TYPES.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTipo(t.value)}
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors border",
                tipo === t.value
                  ? "bg-primary/20 border-primary text-primary"
                  : "border-white/10 text-muted-foreground hover:bg-white/5"
              )}
              title={t.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-xs" />
        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 text-xs" placeholder="Início" />
        <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-9 text-xs" placeholder="Fim" />
      </div>

      <Textarea
        placeholder="Descrição (opcional)"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        rows={2}
        className="text-sm"
      />

      <Select value={owner} onValueChange={setOwner}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Responsável (opcional)" />
        </SelectTrigger>
        <SelectContent>
          {collaborators.map((c: any) => (
            <SelectItem key={c.id} value={c.full_name || c.email}>{c.full_name || c.email}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Checkbox checked={done} onCheckedChange={(v) => setDone(!!v)} />
          Marcar como concluída
        </label>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============ Notes ============ */

function NotesPanel({
  notes, onCreate,
}: {
  notes: any[];
  onCreate: (content: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await onCreate(text.trim());
      setText("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card rounded-xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Notas</h3>
      <div className="space-y-2">
        <Textarea
          placeholder="Escrever nova nota…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="text-sm"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={saving || !text.trim()}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar nota
          </Button>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-white/5">
        {notes.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">Nenhuma nota ainda.</div>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>{n.author_label || "—"}</span>
                <span>{new Date(n.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
              <div className="text-sm text-foreground whitespace-pre-wrap">{n.conteudo}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ============ History ============ */

function HistoryList({
  dealCreatedAt, stageEnteredAt, history, activities, notes, stages,
}: {
  dealCreatedAt: string;
  stageEnteredAt: string;
  history: any[];
  activities: any[];
  notes: any[];
  stages: any[];
}) {
  const stageMap = new Map(stages.map((s: any) => [s.id, s.nome]));

  const items: Array<{ date: string; icon: any; title: string; sub?: string }> = [];
  items.push({ date: dealCreatedAt, icon: CalendarIcon, title: "Deal criado" });
  history.forEach((h: any) => {
    if (h.evento === "stage_changed") {
      const from = stageMap.get(h.payload?.from) || "?";
      const to = stageMap.get(h.payload?.to) || "?";
      items.push({ date: h.created_at, icon: Edit, title: "Etapa alterada", sub: `${from} → ${to}` });
    } else if (h.evento === "status_changed") {
      items.push({ date: h.created_at, icon: Edit, title: "Status alterado", sub: `${h.payload?.from} → ${h.payload?.to}` });
    } else {
      items.push({ date: h.created_at, icon: Edit, title: h.evento });
    }
  });
  activities.filter((a: any) => a.concluida_em).forEach((a: any) => {
    items.push({ date: a.concluida_em, icon: Check, title: `Atividade concluída`, sub: a.titulo });
  });
  notes.forEach((n: any) => {
    items.push({ date: n.created_at, icon: MessageSquare, title: `Nota adicionada`, sub: (n.author_label || "") });
  });

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (items.length === 0) {
    return <div className="text-xs text-muted-foreground text-center py-4">Sem eventos.</div>;
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
      {items.map((it, idx) => {
        const Icon = it.icon;
        return (
          <div key={idx} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-foreground">{it.title}</div>
              {it.sub && <div className="text-[11px] text-muted-foreground">{it.sub}</div>}
              <div className="text-[10px] text-muted-foreground/70">
                {new Date(it.date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============ E-mail Panel ============ */
function EmailPanel({ dealId, personEmail, personName }: { dealId: string; personEmail: string; personName: string }) {
  const [open, setOpen] = useState(false);
  const { data: messages = [] } = useQuery({
    queryKey: ["deal_emails", dealId, personEmail],
    queryFn: async () => {
      let q = supabase.from("email_messages" as any).select("*").order("received_at", { ascending: false }).limit(50);
      if (personEmail) {
        q = q.or(`deal_id.eq.${dealId},from_email.eq.${personEmail}`);
      } else {
        q = q.eq("deal_id", dealId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!dealId,
  });

  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MailIcon className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">E-mails</h3>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} disabled={!personEmail}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Novo e-mail
        </Button>
      </div>
      {!personEmail && (
        <p className="text-xs text-muted-foreground">Adicione um e-mail no contato para enviar mensagens.</p>
      )}
      {messages.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-6">Nenhum e-mail encontrado para este deal.</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {messages.map((m: any) => (
            <div key={m.id} className="border border-white/5 rounded-lg p-3 hover:bg-white/[0.02]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground truncate">
                  {m.direction === "out" ? `Para: ${(m.to_emails || []).join(", ")}` : `De: ${m.from_name || m.from_email}`}
                </span>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {new Date(m.received_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              <div className="text-sm text-foreground mt-1 truncate">{m.subject || "(sem assunto)"}</div>
              {m.snippet && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.snippet}</div>}
            </div>
          ))}
        </div>
      )}
      {open && (
        <EmailComposerInline
          open={open}
          onClose={() => setOpen(false)}
          to={personEmail}
          name={personName}
        />
      )}
    </div>
  );
}

function EmailComposerInline({ open, onClose, to, name }: { open: boolean; onClose: () => void; to: string; name: string }) {
  return <Composer open={open} onClose={onClose} initialTo={to} initialSubject={name ? `Sobre ${name}` : ""} />;
}

/* ============ Files Panel ============ */
function FilesPanel({ dealId }: { dealId: string }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: files = [] } = useQuery({
    queryKey: ["deal_files", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_deal_files" as any)
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${dealId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("deal-files").upload(path, file);
      if (upErr) throw upErr;
      const { data: userData } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("crm_deal_files" as any).insert({
        deal_id: dealId,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: userData.user?.id ?? null,
      });
      if (insErr) throw insErr;
      toast({ title: "Arquivo enviado" });
      qc.invalidateQueries({ queryKey: ["deal_files", dealId] });
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async (path: string, fileName: string) => {
    const { data, error } = await supabase.storage.from("deal-files").createSignedUrl(path, 60);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = fileName;
    a.click();
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Excluir este arquivo?")) return;
    await supabase.storage.from("deal-files").remove([path]);
    await supabase.from("crm_deal_files" as any).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["deal_files", dealId] });
    toast({ title: "Arquivo excluído" });
  };

  const fmtSize = (b?: number | null) => {
    if (!b) return "—";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Arquivos</h3>
        </div>
        <label className="cursor-pointer">
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="w-3.5 h-3.5" /> {uploading ? "Enviando..." : "Adicionar arquivo"}
          </span>
        </label>
      </div>
      {files.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-6">Nenhum arquivo anexado.</div>
      ) : (
        <div className="space-y-2">
          {files.map((f: any) => (
            <div key={f.id} className="flex items-center gap-3 border border-white/5 rounded-lg p-3 hover:bg-white/[0.02]">
              <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground truncate">{f.file_name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {fmtSize(f.size_bytes)} · {new Date(f.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
              <button
                onClick={() => handleDownload(f.storage_path, f.file_name)}
                className="text-xs text-primary hover:underline"
              >Baixar</button>
              <button
                onClick={() => handleDelete(f.id, f.storage_path)}
                className="text-xs text-red-400 hover:underline"
              >Excluir</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
