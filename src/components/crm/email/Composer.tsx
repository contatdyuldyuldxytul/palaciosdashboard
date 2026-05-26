import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Minus, Maximize2, Minimize2, X, Trash2, Paperclip, Link as LinkIcon,
  Smile, Image as ImageIcon, Send,
  Bold, Italic, Underline, Undo2, Redo2, AlignLeft, ListOrdered, ChevronDown, Sparkles, Type,
} from "lucide-react";
import { useSendEmail, type EmailMessage } from "@/hooks/useEmail";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ComposerProps {
  open: boolean;
  onClose: () => void;
  replyTo?: EmailMessage;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  contextKey?: string;
  /** popup = floating bottom-right (default, Gmail-like).
   *  inline = renders in normal document flow, full width of parent.
   *  modal  = centered overlay with backdrop. */
  variant?: "popup" | "inline" | "modal";
}

type WinState = "normal" | "minimized" | "fullscreen";

export function Composer({ open, onClose, replyTo, initialTo, initialSubject, initialBody, contextKey, variant = "popup" }: ComposerProps) {
  const isReply = !!replyTo;
  const draftKey = useMemo(
    () => `palacios-draft:${contextKey || (isReply ? `reply-${replyTo?.id}` : "new")}`,
    [contextKey, isReply, replyTo?.id]
  );

  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [winState, setWinState] = useState<WinState>("normal");
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const send = useSendEmail();

  useEffect(() => {
    if (!open) return;
    const saved = (() => {
      try { return JSON.parse(localStorage.getItem(draftKey) || "null"); } catch { return null; }
    })();
    setTo(saved?.to ?? initialTo ?? (isReply ? (replyTo?.from_email || "") : ""));
    setCc(saved?.cc ?? "");
    setBcc(saved?.bcc ?? "");
    setShowCc(!!saved?.cc);
    setShowBcc(!!saved?.bcc);
    setSubject(saved?.subject ?? initialSubject ?? (isReply ? `Re: ${replyTo?.subject || ""}` : ""));
    setTimeout(() => {
      if (bodyRef.current) bodyRef.current.innerHTML = saved?.body ?? initialBody ?? "";
    }, 0);
    setWinState("normal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draftKey]);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      const body = bodyRef.current?.innerHTML || "";
      const payload = { to, cc, bcc, subject, body };
      try { localStorage.setItem(draftKey, JSON.stringify(payload)); } catch {}
    }, 1500);
    return () => clearInterval(id);
  }, [open, draftKey, to, cc, bcc, subject]);

  const handleSend = async () => {
    const html = bodyRef.current?.innerHTML || "";
    if (!to.trim() || !subject.trim()) { toast.error("Preencha destinatário e assunto"); return; }
    try {
      await send.mutateAsync({
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        html: html || " ",
        threadId: replyTo?.gmail_thread_id,
        inReplyTo: replyTo?.gmail_message_id,
      });
      toast.success("E-mail enviado");
      try { localStorage.removeItem(draftKey); } catch {}
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar");
    }
  };

  const discard = () => {
    try { localStorage.removeItem(draftKey); } catch {}
    onClose();
  };

  const exec = (cmd: string, val?: string) => {
    bodyRef.current?.focus();
    document.execCommand(cmd, false, val);
  };

  if (!open) return null;

  const isMin = winState === "minimized";
  const isFull = winState === "fullscreen";

  const sizeClass = isFull
    ? "fixed inset-y-[5vh] inset-x-[8vw] w-auto h-auto"
    : isMin
    ? "fixed right-6 bottom-0 w-[340px] h-11"
    : "fixed right-6 bottom-0 w-[580px] h-[min(600px,88vh)]";

  const composer = (
    <div
      className={cn(
        sizeClass,
        "z-[100] flex flex-col bg-card text-card-foreground border border-border rounded-t-2xl shadow-2xl overflow-hidden"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 h-11 select-none cursor-pointer",
          "bg-muted/60 border-b border-border"
        )}
        onClick={() => isMin && setWinState("normal")}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-sm font-medium truncate text-foreground">
            {isReply ? `Re: ${replyTo?.subject || "Mensagem"}` : (subject || "Nova mensagem")}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <HeaderBtn onClick={(e) => { e.stopPropagation(); setWinState(isMin ? "normal" : "minimized"); }} title="Minimizar">
            <Minus className="h-3.5 w-3.5" />
          </HeaderBtn>
          <HeaderBtn onClick={(e) => { e.stopPropagation(); setWinState(isFull ? "normal" : "fullscreen"); }} title={isFull ? "Sair da tela cheia" : "Tela cheia"}>
            {isFull ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </HeaderBtn>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition"
            title="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!isMin && (
        <>
          {/* Recipients */}
          <FieldRow label="Para">
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="destinatario@exemplo.com"
              className="flex-1 py-2.5 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/70"
            />
            <div className="flex items-center gap-3 text-xs text-muted-foreground pl-2">
              {!showCc && <button onClick={() => setShowCc(true)} className="hover:text-foreground transition">Cc</button>}
              {!showBcc && <button onClick={() => setShowBcc(true)} className="hover:text-foreground transition">Cco</button>}
            </div>
          </FieldRow>

          {showCc && (
            <FieldRow label="Cc">
              <input value={cc} onChange={(e) => setCc(e.target.value)}
                className="w-full py-2 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/70" />
            </FieldRow>
          )}
          {showBcc && (
            <FieldRow label="Cco">
              <input value={bcc} onChange={(e) => setBcc(e.target.value)}
                className="w-full py-2 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/70" />
            </FieldRow>
          )}

          {/* Subject */}
          <FieldRow label="Assunto">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Sobre o que é este e-mail?"
              className="w-full py-2.5 text-sm bg-transparent outline-none text-foreground font-medium placeholder:text-muted-foreground/70"
            />
          </FieldRow>

          {/* Body */}
          <div className="flex-1 overflow-auto px-5 py-4">
            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[180px] outline-none text-sm leading-relaxed text-foreground empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60"
              data-placeholder="Escreva sua mensagem..."
            />
          </div>

          {/* Formatting toolbar */}
          <div className="flex items-center gap-0.5 px-2 py-1.5 mx-3 mb-2 rounded-xl bg-muted border border-border overflow-x-auto">
            <ToolIcon onClick={() => exec("undo")} title="Desfazer"><Undo2 className="h-3.5 w-3.5" /></ToolIcon>
            <ToolIcon onClick={() => exec("redo")} title="Refazer"><Redo2 className="h-3.5 w-3.5" /></ToolIcon>
            <Divider />
            <ToolIcon onClick={() => exec("bold")} title="Negrito"><Bold className="h-3.5 w-3.5" /></ToolIcon>
            <ToolIcon onClick={() => exec("italic")} title="Itálico"><Italic className="h-3.5 w-3.5" /></ToolIcon>
            <ToolIcon onClick={() => exec("underline")} title="Sublinhado"><Underline className="h-3.5 w-3.5" /></ToolIcon>
            <Divider />
            <ToolIcon onClick={() => exec("justifyLeft")} title="Alinhar"><AlignLeft className="h-3.5 w-3.5" /></ToolIcon>
            <ToolIcon onClick={() => exec("insertOrderedList")} title="Lista"><ListOrdered className="h-3.5 w-3.5" /></ToolIcon>
            <ToolIcon onClick={() => exec("removeFormat")} title="Limpar formatação"><Type className="h-3.5 w-3.5" /></ToolIcon>
            <Divider />
            <ToolIcon title="Anexar"><Paperclip className="h-3.5 w-3.5" /></ToolIcon>
            <ToolIcon title="Link"><LinkIcon className="h-3.5 w-3.5" /></ToolIcon>
            <ToolIcon title="Emoji"><Smile className="h-3.5 w-3.5" /></ToolIcon>
            <ToolIcon title="Imagem"><ImageIcon className="h-3.5 w-3.5" /></ToolIcon>
            <ToolIcon title="IA"><Sparkles className="h-3.5 w-3.5 text-primary" /></ToolIcon>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-border bg-muted/40">
            <div className="flex items-stretch rounded-lg overflow-hidden">
              <button
                onClick={handleSend}
                disabled={send.isPending}
                className="px-5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold disabled:opacity-60 transition flex items-center gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                {send.isPending ? "Enviando..." : "Enviar"}
              </button>
              <button className="px-2 bg-primary hover:bg-primary/90 text-primary-foreground border-l border-primary-foreground/20 transition" title="Mais opções">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground hidden sm:block">Rascunho salvo</span>
              <button
                onClick={discard}
                className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition"
                title="Descartar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return createPortal(composer, document.body);
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center px-4 border-b border-border">
      <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">{label}</span>
      {children}
    </div>
  );
}

function HeaderBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
    >
      {children}
    </button>
  );
}

function ToolIcon({ children, title, onClick }: { children: React.ReactNode; title: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-4 bg-border mx-0.5" />;
}
