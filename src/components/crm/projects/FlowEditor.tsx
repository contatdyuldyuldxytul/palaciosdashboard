import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type Edge, type Node,
  type NodeChange, type EdgeChange, MarkerType, Handle, Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft, Save, Play, Mail, MessageCircle, Clock, GitBranch, Zap, Settings2, Trash2,
  Sparkles, StickyNote, Flag, HelpCircle, CheckSquare, Webhook,
  Star, Heart, Target, Lightbulb, Rocket, Bell, Bookmark, Camera, FileText, Folder,
  Image as ImageIcon, Layers, Link2, Map, Music, Package, Phone, Settings, Shield,
  ShoppingCart, Tag, Timer, Wrench, User, Users, Video, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFlow, useUpdateFlow, type FlowScope } from "@/hooks/useFlows";
import { useProjectPipelines, useProjectStages } from "@/hooks/useProjects";
import { useCrmPipelines, useCrmStages } from "@/hooks/useCrm";
import { toast } from "@/hooks/use-toast";

// =========================================
// Node metadata
// =========================================

const NODE_META: Record<string, { label: string; icon: any; color: string; group: "automation" | "custom" }> = {
  trigger: { label: "Trigger", icon: Zap, color: "#f59e0b", group: "automation" },
  email: { label: "Email", icon: Mail, color: "#3b82f6", group: "automation" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "#10b981", group: "automation" },
  delay: { label: "Delay", icon: Clock, color: "#8b5cf6", group: "automation" },
  condition: { label: "Condição", icon: GitBranch, color: "#ec4899", group: "automation" },
  update: { label: "Atualizar", icon: Settings2, color: "#06b6d4", group: "automation" },
  custom: { label: "Personalizado", icon: Sparkles, color: "#a855f7", group: "custom" },
  note: { label: "Anotação", icon: StickyNote, color: "#eab308", group: "custom" },
  milestone: { label: "Marco", icon: Flag, color: "#22c55e", group: "custom" },
  decision: { label: "Decisão", icon: HelpCircle, color: "#f97316", group: "custom" },
  task: { label: "Tarefa", icon: CheckSquare, color: "#0ea5e9", group: "custom" },
  webhook: { label: "Webhook", icon: Webhook, color: "#64748b", group: "custom" },
};

// Icon library for "custom" node
const CUSTOM_ICONS: Record<string, any> = {
  Sparkles, Star, Heart, Flag, Target, Lightbulb, Rocket, Bell, Bookmark, Camera,
  FileText, Folder, ImageIcon, Layers, Link2, Map, MessageSquare: MessageCircle,
  Music, Package, Phone, Settings, Shield, ShoppingCart, Tag, Timer, Wrench,
  User, Users, Video, Zap, CheckCircle,
};

const COLOR_SWATCHES = [
  "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#f59e0b",
  "#ef4444", "#06b6d4", "#64748b", "#22c55e", "#f97316",
];

// =========================================
// Custom node renderer
// =========================================

function FlowNode({ data, selected }: any) {
  const kind = data.kind as keyof typeof NODE_META;
  const meta = NODE_META[kind] || NODE_META.trigger;
  const isTrigger = kind === "trigger";
  const isNote = kind === "note";

  // Resolve icon + color (custom node can override)
  const color = (kind === "custom" && data.color) ? data.color : meta.color;
  const Icon = (kind === "custom" && data.icon && CUSTOM_ICONS[data.icon])
    ? CUSTOM_ICONS[data.icon]
    : meta.icon;

  if (isNote) {
    return (
      <div
        className={`px-3 py-2.5 rounded-lg min-w-[180px] max-w-[240px] transition-all ${
          selected ? "ring-2 ring-primary" : ""
        }`}
        style={{
          background: "linear-gradient(135deg, rgba(234,179,8,0.25), rgba(234,179,8,0.08))",
          border: "1px solid rgba(234,179,8,0.4)",
          boxShadow: "0 4px 16px -4px rgba(234,179,8,0.3)",
        }}
      >
        <Handle type="target" position={Position.Top} style={{ background: "#eab308", opacity: 0.5 }} />
        <div className="flex items-center gap-1.5 mb-1">
          <StickyNote className="w-3 h-3 text-amber-400" />
          <div className="text-[10px] uppercase tracking-wider text-amber-300/80">Nota</div>
        </div>
        <div className="text-xs text-foreground whitespace-pre-wrap break-words">
          {data.config?.text || data.label || "Clique para editar…"}
        </div>
        <Handle type="source" position={Position.Bottom} style={{ background: "#eab308", opacity: 0.5 }} />
      </div>
    );
  }

  return (
    <div
      className={`px-3 py-2.5 rounded-xl border backdrop-blur-xl min-w-[180px] transition-all ${
        selected ? "ring-2 ring-primary border-primary" : "border-white/15"
      }`}
      style={{
        background: `linear-gradient(135deg, ${color}25, rgba(255,255,255,0.03))`,
        boxShadow: `0 4px 16px -4px ${color}40`,
      }}
    >
      {!isTrigger && <Handle type="target" position={Position.Top} style={{ background: color }} />}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}40` }}>
          <Icon className="w-3.5 h-3.5 text-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{meta.label}</div>
          <div className="text-xs font-medium text-foreground truncate max-w-[140px]">{data.label || meta.label}</div>
        </div>
      </div>
      {kind === "custom" && data.config?.description && (
        <div className="mt-1.5 text-[10px] text-muted-foreground line-clamp-2">{data.config.description}</div>
      )}
      {kind === "decision" ? (
        <>
          <Handle type="source" position={Position.Bottom} id="yes" style={{ background: "#22c55e", left: "30%" }} />
          <Handle type="source" position={Position.Bottom} id="no" style={{ background: "#ef4444", left: "70%" }} />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} style={{ background: color }} />
      )}
      {kind === "condition" && (
        <Handle type="source" position={Position.Right} id="else" style={{ background: "#ef4444" }} />
      )}
    </div>
  );
}

const nodeTypes = { flow: FlowNode };

// =========================================
// Editor
// =========================================

export function FlowEditor({ flowId, onClose, scope = "projects" }: { flowId: string; onClose: () => void; scope?: FlowScope }) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner flowId={flowId} onClose={onClose} scope={scope} />
    </ReactFlowProvider>
  );
}

function FlowEditorInner({ flowId, onClose, scope }: { flowId: string; onClose: () => void; scope: FlowScope }) {
  const { data: flow, isLoading } = useFlow(flowId);
  const update = useUpdateFlow();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<Node | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (flow) {
      setNodes((flow.nodes as any[]) || []);
      setEdges((flow.edges as any[]) || []);
      setName(flow.nome);
    }
  }, [flow]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes(ns => applyNodeChanges(changes, ns)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges(es => applyEdgeChanges(changes, es)), []);
  const onConnect = useCallback((c: Connection) => setEdges(es => addEdge({ ...c, markerEnd: { type: MarkerType.ArrowClosed } }, es)), []);

  const addNode = (kind: keyof typeof NODE_META) => {
    const id = `${kind}-${Date.now()}`;
    const baseData: any = { kind, label: NODE_META[kind].label, config: {} };
    if (kind === "custom") {
      baseData.icon = "Sparkles";
      baseData.color = NODE_META.custom.color;
    }
    const newNode: Node = {
      id,
      type: "flow",
      position: { x: 250 + Math.random() * 200, y: 150 + nodes.length * 100 },
      data: baseData,
    };
    setNodes(ns => [...ns, newNode]);
  };

  const updateSelected = (patch: any) => {
    if (!selected) return;
    setNodes(ns => ns.map(n => n.id === selected.id ? { ...n, data: { ...n.data, ...patch } } : n));
    setSelected(s => s ? { ...s, data: { ...s.data, ...patch } } : s);
  };

  const deleteSelected = () => {
    if (!selected) return;
    setNodes(ns => ns.filter(n => n.id !== selected.id));
    setEdges(es => es.filter(e => e.source !== selected.id && e.target !== selected.id));
    setSelected(null);
  };

  const save = async () => {
    try {
      await update.mutateAsync({ id: flowId, patch: { nodes: nodes as any, edges: edges as any, nome: name } as any });
      toast({ title: "Fluxo salvo" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading || !flow) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando fluxo…</div>;
  }

  const automationNodes = (Object.keys(NODE_META) as (keyof typeof NODE_META)[]).filter(k => NODE_META[k].group === "automation");
  const customNodes = (Object.keys(NODE_META) as (keyof typeof NODE_META)[]).filter(k => NODE_META[k].group === "custom");

  const renderPaletteButton = (k: keyof typeof NODE_META) => {
    const m = NODE_META[k];
    const Icon = m.icon;
    return (
      <button
        key={k}
        onClick={() => addNode(k)}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition text-xs text-foreground"
      >
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${m.color}30` }}>
          <Icon className="w-3 h-3" />
        </div>
        {m.label}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] -mx-4 lg:-mx-6 -mb-4 lg:-mb-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-background/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
          </Button>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            className="h-8 w-[260px] bg-white/5 border-white/10 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled title="Em breve">
            <Play className="w-3.5 h-3.5 mr-1.5" /> Testar
          </Button>
          <Button size="sm" onClick={save} disabled={update.isPending}>
            <Save className="w-3.5 h-3.5 mr-1.5" /> {update.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Palette */}
        <div className="w-44 border-r border-white/5 bg-background/40 p-2 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">Automação</div>
          {automationNodes.map(renderPaletteButton)}
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5 mt-3">Personalizado</div>
          {customNodes.map(renderPaletteButton)}
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-background/20">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelected(n)}
            onPaneClick={() => setSelected(null)}
            fitView
            colorMode="dark"
          >
            <Background gap={20} size={1} color="rgba(255,255,255,0.08)" />
            <Controls className="!bg-background/80 !border-white/10" />
            <MiniMap pannable zoomable className="!bg-background/80 !border-white/10" />
          </ReactFlow>
        </div>

        {/* Inspector */}
        {selected && (
          <div className="w-72 border-l border-white/5 bg-background/40 p-3 overflow-y-auto">
            <NodeInspector node={selected} scope={scope} onChange={updateSelected} onDelete={deleteSelected} />
          </div>
        )}
      </div>
    </div>
  );
}

function NodeInspector({ node, onChange, onDelete, scope }: { node: Node; onChange: (p: any) => void; onDelete: () => void; scope: FlowScope }) {
  const data: any = node.data;
  const kind = data.kind as keyof typeof NODE_META;
  const config = data.config || {};
  const projHooks = { pipelines: useProjectPipelines(), stages: useProjectStages(config.pipeline_id) };
  const crmHooks = { pipelines: useCrmPipelines(), stages: useCrmStages(config.pipeline_id) };
  const pipelines = (scope === "deals" ? crmHooks.pipelines.data : projHooks.pipelines.data) || [];
  const stages = (scope === "deals" ? crmHooks.stages.data : projHooks.stages.data) || [];

  const setCfg = (patch: any) => onChange({ config: { ...config, ...patch } });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{NODE_META[kind].label}</div>
        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 h-7 px-2" onClick={onDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      <div>
        <Label className="text-xs">Rótulo</Label>
        <Input value={data.label || ""} onChange={e => onChange({ label: e.target.value })} className="bg-white/5 border-white/10 h-8 text-sm" />
      </div>

      {kind === "custom" && (
        <>
          <div>
            <Label className="text-xs">Ícone</Label>
            <div className="grid grid-cols-6 gap-1 mt-1 p-2 rounded-lg bg-white/5 border border-white/10 max-h-[180px] overflow-y-auto">
              {Object.entries(CUSTOM_ICONS).map(([name, Icon]) => {
                const active = data.icon === name;
                return (
                  <button
                    key={name}
                    onClick={() => onChange({ icon: name })}
                    className={`aspect-square rounded-md flex items-center justify-center transition ${
                      active ? "bg-primary/30 ring-1 ring-primary" : "hover:bg-white/10"
                    }`}
                    title={name}
                  >
                    <Icon className="w-3.5 h-3.5 text-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="text-xs">Cor</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {COLOR_SWATCHES.map(c => {
                const active = (data.color || NODE_META.custom.color).toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    onClick={() => onChange({ color: c })}
                    className={`w-6 h-6 rounded-md border transition ${active ? "ring-2 ring-primary border-transparent scale-110" : "border-white/10"}`}
                    style={{ background: c }}
                  />
                );
              })}
              <Input
                type="color"
                value={data.color || NODE_META.custom.color}
                onChange={e => onChange({ color: e.target.value })}
                className="w-12 h-7 p-0.5 bg-transparent border-white/10 cursor-pointer"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea value={config.description || ""} onChange={e => setCfg({ description: e.target.value })} rows={4} className="bg-white/5 border-white/10 text-sm" />
          </div>
        </>
      )}

      {kind === "note" && (
        <div>
          <Label className="text-xs">Texto da anotação</Label>
          <Textarea value={config.text || ""} onChange={e => setCfg({ text: e.target.value })} rows={6} className="bg-white/5 border-white/10 text-sm" placeholder="Escreva uma observação livre…" />
        </div>
      )}

      {kind === "milestone" && (
        <div>
          <Label className="text-xs">Data prevista</Label>
          <Input type="date" value={config.date || ""} onChange={e => setCfg({ date: e.target.value })} className="bg-white/5 border-white/10 h-8 text-sm" />
        </div>
      )}

      {kind === "decision" && (
        <>
          <div>
            <Label className="text-xs">Pergunta</Label>
            <Textarea value={config.question || ""} onChange={e => setCfg({ question: e.target.value })} rows={3} className="bg-white/5 border-white/10 text-sm" />
          </div>
          <p className="text-[10px] text-muted-foreground">Saída esquerda = Sim · direita = Não</p>
        </>
      )}

      {kind === "task" && (
        <>
          <div>
            <Label className="text-xs">Responsável</Label>
            <Input value={config.assignee || ""} onChange={e => setCfg({ assignee: e.target.value })} className="bg-white/5 border-white/10 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Prazo</Label>
            <Input type="date" value={config.due || ""} onChange={e => setCfg({ due: e.target.value })} className="bg-white/5 border-white/10 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea value={config.description || ""} onChange={e => setCfg({ description: e.target.value })} rows={3} className="bg-white/5 border-white/10 text-sm" />
          </div>
        </>
      )}

      {kind === "webhook" && (
        <>
          <div>
            <Label className="text-xs">URL</Label>
            <Input value={config.url || ""} onChange={e => setCfg({ url: e.target.value })} placeholder="https://…" className="bg-white/5 border-white/10 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Método</Label>
            <Select value={config.method || "POST"} onValueChange={v => setCfg({ method: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background border-white/10">
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Payload (JSON)</Label>
            <Textarea value={config.payload || ""} onChange={e => setCfg({ payload: e.target.value })} rows={5} className="bg-white/5 border-white/10 text-sm font-mono" />
          </div>
        </>
      )}

      {kind === "trigger" && (
        <>
          <div>
            <Label className="text-xs">Quando disparar</Label>
            <Select value={config.event || "stage_enter"} onValueChange={v => setCfg({ event: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background border-white/10">
                <SelectItem value="project_created">{scope === "deals" ? "Deal criado" : "Projeto criado"}</SelectItem>
                <SelectItem value="stage_enter">Entrar em uma etapa</SelectItem>
                {scope === "deals" && <SelectItem value="status_won">Deal ganho</SelectItem>}
                {scope === "deals" && <SelectItem value="status_lost">Deal perdido</SelectItem>}
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {config.event === "stage_enter" && (
            <>
              <div>
                <Label className="text-xs">Pipeline</Label>
                <Select value={config.pipeline_id || ""} onValueChange={v => setCfg({ pipeline_id: v, stage_id: "" })}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    {pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Etapa</Label>
                <Select value={config.stage_id || ""} onValueChange={v => setCfg({ stage_id: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </>
      )}

      {kind === "email" && (
        <>
          <div>
            <Label className="text-xs">Para (email)</Label>
            <Input value={config.to || ""} onChange={e => setCfg({ to: e.target.value })} placeholder="{{cliente.email}}" className="bg-white/5 border-white/10 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Assunto</Label>
            <Input value={config.subject || ""} onChange={e => setCfg({ subject: e.target.value })} className="bg-white/5 border-white/10 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Corpo (HTML)</Label>
            <Textarea value={config.body || ""} onChange={e => setCfg({ body: e.target.value })} rows={6} className="bg-white/5 border-white/10 text-sm" />
          </div>
          <p className="text-[10px] text-muted-foreground">Use {`{{titulo}}`}, {`{{valor}}`}, {`{{responsavel}}`} como variáveis.</p>
        </>
      )}

      {kind === "whatsapp" && (
        <>
          <div>
            <Label className="text-xs">Telefone (E.164)</Label>
            <Input value={config.to || ""} onChange={e => setCfg({ to: e.target.value })} placeholder="+5511999999999" className="bg-white/5 border-white/10 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Mensagem</Label>
            <Textarea value={config.message || ""} onChange={e => setCfg({ message: e.target.value })} rows={5} className="bg-white/5 border-white/10 text-sm" />
          </div>
        </>
      )}

      {kind === "delay" && (
        <div>
          <Label className="text-xs">Esperar</Label>
          <div className="flex gap-2">
            <Input type="number" value={config.amount || 1} onChange={e => setCfg({ amount: Number(e.target.value) })} className="bg-white/5 border-white/10 h-8 text-sm" />
            <Select value={config.unit || "hours"} onValueChange={v => setCfg({ unit: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background border-white/10">
                <SelectItem value="minutes">minutos</SelectItem>
                <SelectItem value="hours">horas</SelectItem>
                <SelectItem value="days">dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {kind === "condition" && (
        <>
          <div>
            <Label className="text-xs">Campo</Label>
            <Select value={config.field || "valor"} onValueChange={v => setCfg({ field: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background border-white/10">
                <SelectItem value="valor">Valor</SelectItem>
                <SelectItem value="progresso">Progresso (%)</SelectItem>
                <SelectItem value="responsavel_label">Responsável</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Operador</Label>
            <Select value={config.op || ">="} onValueChange={v => setCfg({ op: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background border-white/10">
                <SelectItem value="=">igual</SelectItem>
                <SelectItem value=">">maior que</SelectItem>
                <SelectItem value=">=">≥</SelectItem>
                <SelectItem value="<">menor que</SelectItem>
                <SelectItem value="<=">≤</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Valor</Label>
            <Input value={config.value ?? ""} onChange={e => setCfg({ value: e.target.value })} className="bg-white/5 border-white/10 h-8 text-sm" />
          </div>
          <p className="text-[10px] text-muted-foreground">Saída inferior = verdadeiro · direita = falso.</p>
        </>
      )}

      {kind === "update" && (
        <>
          <div>
            <Label className="text-xs">Pipeline</Label>
            <Select value={config.pipeline_id || ""} onValueChange={v => setCfg({ pipeline_id: v, stage_id: "" })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="bg-background border-white/10">
                {pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Mover para etapa</Label>
            <Select value={config.stage_id || ""} onValueChange={v => setCfg({ stage_id: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="bg-background border-white/10">
                {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Progresso (%)</Label>
            <Input type="number" value={config.progresso ?? ""} onChange={e => setCfg({ progresso: e.target.value ? Number(e.target.value) : null })} className="bg-white/5 border-white/10 h-8 text-sm" />
          </div>
        </>
      )}
    </div>
  );
}
