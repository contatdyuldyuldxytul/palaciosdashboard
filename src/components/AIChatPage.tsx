import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Send, Bot, User, Trash2, Database, Download, Edit3, MoveRight, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { useAIChat, type Assistant } from "@/hooks/useAIChat";
import ReactMarkdown from "react-markdown";

const markdownComponents = {
  a: ({ href, children, ...props }: any) => {
    if (href && href.startsWith("/")) {
      return (
        <Link
          to={href}
          className="inline-flex items-center bg-primary/10 text-primary hover:bg-primary/20 px-2 py-0.5 rounded-md font-medium no-underline transition-colors"
          {...props}
        >
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-primary underline" {...props}>
        {children}
      </a>
    );
  },
};

interface AIChatPageProps {
  assistant: Assistant;
  title: string;
  subtitle: string;
  quickPrompts: string[];
}

const WRITE_TOOLS = new Set([
  "move_deals_to_stage", "update_deal_owner", "add_deal_note", "add_activity", "bulk_update_deals",
]);

const TOOL_META: Record<string, { label: string; icon: any }> = {
  list_pipelines_and_stages: { label: "Consultando pipelines", icon: Database },
  query_deals: { label: "Consultando deals", icon: Database },
  get_deal_detail: { label: "Detalhando deal", icon: Database },
  query_leads: { label: "Consultando leads", icon: Database },
  query_activities: { label: "Consultando atividades", icon: Database },
  query_contacts: { label: "Buscando contatos", icon: Database },
  crm_metrics: { label: "Calculando métricas", icon: Database },
  rank_meeting_probability: { label: "Ranqueando leads", icon: Database },
  export_to_csv: { label: "Exportando CSV", icon: Download },
  move_deals_to_stage: { label: "Mover deals", icon: MoveRight },
  update_deal_owner: { label: "Reatribuir owner", icon: Edit3 },
  add_deal_note: { label: "Adicionar nota", icon: Edit3 },
  add_activity: { label: "Criar atividade", icon: Edit3 },
  bulk_update_deals: { label: "Atualizar deals em massa", icon: Edit3 },
};

function ToolCard({ part, onApprove, onDeny }: { part: any; onApprove: () => void; onDeny: () => void }) {
  const [open, setOpen] = useState(false);
  // AI SDK v5 tool-* parts: type = `tool-${name}`, state = 'input-streaming'|'input-available'|'output-available'|'output-error'
  const toolName = part.type?.startsWith("tool-") ? part.type.slice(5) : "tool";
  const meta = TOOL_META[toolName] ?? { label: toolName, icon: Database };
  const Icon = meta.icon;
  const isWrite = WRITE_TOOLS.has(toolName);
  const state = part.state;
  const needsApproval = state === "input-available" && isWrite;
  const hasOutput = state === "output-available";
  const hasError = state === "output-error";
  const output = part.output;
  const input = part.input;

  let statusColor = "text-muted-foreground";
  let StatusIcon: any = Loader2;
  let statusLabel = "Executando...";
  let spin = true;

  if (needsApproval) {
    statusColor = "text-amber-400";
    StatusIcon = AlertTriangle; spin = false;
    statusLabel = "Aguardando confirmação";
  } else if (hasOutput) {
    spin = false;
    if (output?.error) { statusColor = "text-red-400"; StatusIcon = XCircle; statusLabel = "Erro"; }
    else { statusColor = "text-emerald-400"; StatusIcon = CheckCircle2; statusLabel = "Concluído"; }
  } else if (hasError) {
    statusColor = "text-red-400"; StatusIcon = XCircle; spin = false; statusLabel = "Erro";
  }

  // Special: export_to_csv with url
  const csvUrl = toolName === "export_to_csv" && output?.url ? output.url : null;

  return (
    <div className="glass-card my-2 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 flex items-center gap-2 text-xs hover:bg-white/5 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-foreground font-medium">{meta.label}</span>
        <span className={`ml-auto flex items-center gap-1 ${statusColor}`}>
          <StatusIcon className={`w-3 h-3 ${spin ? "animate-spin" : ""}`} />
          <span>{statusLabel}</span>
        </span>
      </button>

      {needsApproval && (
        <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2">
          <p className="text-xs text-amber-400">Esta ação modifica dados. Revise os parâmetros antes de aprovar.</p>
          {input && (
            <pre className="text-[10px] bg-black/30 rounded p-2 overflow-x-auto text-muted-foreground max-h-32">
{JSON.stringify(input, null, 2)}
            </pre>
          )}
          <div className="flex gap-2">
            <button onClick={onApprove} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs hover:bg-emerald-500/30 transition-colors font-medium">
              Confirmar e executar
            </button>
            <button onClick={onDeny} className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs hover:text-foreground transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {open && !needsApproval && (
        <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2">
          {input && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Parâmetros</p>
              <pre className="text-[10px] bg-black/30 rounded p-2 overflow-x-auto text-muted-foreground max-h-40">
{JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {hasOutput && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Resultado</p>
              {csvUrl ? (
                <a href={csvUrl} target="_blank" rel="noopener noreferrer" download
                   className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs hover:opacity-90 transition-opacity">
                  <Download className="w-3.5 h-3.5" />
                  Baixar {output.filename} ({output.rows_exported} linhas)
                </a>
              ) : (
                <pre className="text-[10px] bg-black/30 rounded p-2 overflow-x-auto text-muted-foreground max-h-48">
{JSON.stringify(output, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AIChatPage({ assistant, title, subtitle, quickPrompts }: AIChatPageProps) {
  const { messages, isLoading, send, clearMessages, addToolResult } = useAIChat(assistant);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    send(text);
    setInput("");
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearMessages} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Trash2 className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 mb-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-7 h-7 text-primary" />
            </div>
            <p className="text-foreground font-semibold mb-1">Olá! Como posso ajudar?</p>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">{subtitle}</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  className="px-3 py-2 rounded-xl bg-muted text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-[0.97]"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 animate-slide-up ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div className={`max-w-[85%] ${msg.role === "user" ? "rounded-2xl px-4 py-3 bg-primary text-primary-foreground text-sm" : "text-foreground text-sm"}`}>
              {(msg.parts ?? []).map((part: any, i: number) => {
                if (part.type === "text") {
                  return msg.role === "assistant" ? (
                    <div key={i} className="prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&_table]:text-xs">
                      <ReactMarkdown>{part.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                  );
                }
                if (part.type?.startsWith("tool-")) {
                  return (
                    <ToolCard
                      key={i}
                      part={part}
                      onApprove={() => addToolResult({ tool: part.type.slice(5), toolCallId: part.toolCallId, output: { __approved: true } })}
                      onDeny={() => addToolResult({ tool: part.type.slice(5), toolCallId: part.toolCallId, output: { error: "Usuário cancelou a ação." } })}
                    />
                  );
                }
                return null;
              })}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
            <div className="glass-card px-4 py-3 rounded-2xl">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="glass-card p-2 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
          placeholder="Pergunte sobre leads, deals, métricas, ou peça uma ação..."
          className="flex-1 h-10 px-4 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
          disabled={isLoading}
        />
        <button
          onClick={() => handleSend(input)}
          disabled={!input.trim() || isLoading}
          className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 active:scale-[0.95] transition-all disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
