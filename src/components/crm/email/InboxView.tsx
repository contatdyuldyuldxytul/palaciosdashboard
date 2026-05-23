import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Inbox, Send, Star, Link2, Unlink, RefreshCw, Search, Mail } from "lucide-react";
import { useEmailMessages, useEmailThread, useSyncGmail, type EmailMessage, type InboxFilter } from "@/hooks/useEmail";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Composer } from "./Composer";
import { toast } from "sonner";

const FOLDERS: Array<{ key: InboxFilter; label: string; icon: any }> = [
  { key: "all", label: "Todos", icon: Inbox },
  { key: "unread", label: "Não lidos", icon: Star },
  { key: "sent", label: "Enviados", icon: Send },
  { key: "linked", label: "Vinculados", icon: Link2 },
  { key: "unlinked", label: "Não vinculados", icon: Unlink },
];

export function InboxView() {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [search, setSearch] = useState("");
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [composing, setComposing] = useState<null | { mode: "new" | "reply"; thread?: EmailMessage[] }>(null);

  const { data: messages = [], isLoading } = useEmailMessages(filter, search);
  const { data: thread = [] } = useEmailThread(activeThread || undefined);
  const sync = useSyncGmail();

  // Group by thread, show latest per thread
  const threads = useMemo(() => {
    const map = new Map<string, EmailMessage>();
    for (const m of messages) {
      const prev = map.get(m.gmail_thread_id);
      if (!prev || new Date(m.received_at) > new Date(prev.received_at)) map.set(m.gmail_thread_id, m);
    }
    return Array.from(map.values()).sort((a, b) => +new Date(b.received_at) - +new Date(a.received_at));
  }, [messages]);

  const handleSync = async () => {
    try {
      const r: any = await sync.mutateAsync();
      toast.success(`Sincronizado: ${r?.imported || 0} novos`);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao sincronizar");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_1.3fr] gap-3 md:gap-4 md:h-[calc(100vh-220px)] md:min-h-[600px]">
      {activeThread && (
        <button
          onClick={() => setActiveThread(null)}
          className="md:hidden text-xs text-muted-foreground hover:text-foreground self-start px-2 py-1 rounded-md bg-white/5"
        >
          ← Voltar para a lista
        </button>
      )}
      {/* Sidebar */}
      <Card className={`p-3 bg-white/5 border-white/10 backdrop-blur-xl flex flex-col gap-2 ${activeThread ? "hidden md:flex" : ""}`}>
        <Button onClick={() => setComposing({ mode: "new" })} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
          <Mail className="w-4 h-4 mr-2" /> Novo e-mail
        </Button>
        <Button variant="ghost" size="sm" onClick={handleSync} disabled={sync.isPending} className="w-full justify-start text-xs">
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${sync.isPending ? "animate-spin" : ""}`} />
          {sync.isPending ? "Sincronizando..." : "Sincronizar agora"}
        </Button>
        <div className="h-px bg-white/10 my-1" />
        {FOLDERS.map((f) => {
          const Icon = f.icon;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setActiveThread(null); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
                active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" /> {f.label}
            </button>
          );
        })}
      </Card>

      {/* List */}
      <Card className={`bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden flex flex-col min-h-[60vh] md:min-h-0 ${activeThread ? "hidden md:flex" : ""}`}>
        <div className="p-3 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar e-mails..."
              className="pl-8 bg-white/5 border-white/10 h-9"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-6 text-center text-white/40 text-sm">Carregando…</div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center text-white/40 text-sm">
              Nenhum e-mail. Clique em "Sincronizar agora".
            </div>
          ) : (
            threads.map((m) => {
              const active = activeThread === m.gmail_thread_id;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveThread(m.gmail_thread_id)}
                  className={`w-full text-left px-3 py-3 border-b border-white/5 transition ${
                    active ? "bg-white/10" : "hover:bg-white/5"
                  } ${!m.is_read && m.direction === "in" ? "border-l-2 border-l-emerald-400" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-sm font-medium text-white truncate">
                      {m.direction === "out" ? `Para: ${m.to_emails?.[0] || ""}` : m.from_name || m.from_email}
                    </span>
                    <span className="text-[10px] text-white/40 shrink-0">
                      {format(new Date(m.received_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="text-sm text-white/80 truncate">{m.subject || "(sem assunto)"}</div>
                  <div className="text-xs text-white/40 truncate">{m.snippet}</div>
                  {m.deal_id && (
                    <Badge className="mt-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                      Lead vinculado
                    </Badge>
                  )}
                </button>
              );
            })
          )}
        </ScrollArea>
      </Card>

      {/* Thread view */}
      <Card className={`bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden flex flex-col min-h-[60vh] md:min-h-0 ${!activeThread ? "hidden md:flex" : ""}`}>
        {!activeThread ? (
          <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
            Selecione uma conversa
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-white">{thread[0]?.subject || "(sem assunto)"}</div>
                <div className="text-xs text-white/40 mt-0.5">{thread.length} mensagem(ns)</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setComposing({ mode: "reply", thread })}>
                Responder
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {thread.map((m) => (
                  <div key={m.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm">
                        <span className="font-medium text-white">{m.from_name || m.from_email}</span>
                        <span className="text-white/40 ml-2 text-xs">para {m.to_emails?.join(", ")}</span>
                      </div>
                      <span className="text-[11px] text-white/40">
                        {format(new Date(m.received_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {m.body_html ? (
                      <div
                        className="prose prose-invert prose-sm max-w-none text-white/80"
                        dangerouslySetInnerHTML={{ __html: m.body_html }}
                      />
                    ) : (
                      <pre className="text-sm text-white/80 whitespace-pre-wrap font-sans">{m.body_text}</pre>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </Card>

      {composing && (
        <Composer
          open
          onClose={() => setComposing(null)}
          replyTo={composing.mode === "reply" ? thread[thread.length - 1] : undefined}
        />
      )}
    </div>
  );
}
