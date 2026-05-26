import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Minus, Maximize2, Minimize2, X, Trash2, Paperclip, Link as LinkIcon,
  Smile, Image as ImageIcon, Send,
  Bold, Italic, Underline, Undo2, Redo2, AlignLeft, ListOrdered, ChevronDown, Sparkles, Type,
} from "lucide-react";
import { useSendEmail, type EmailMessage } from "@/hooks/useEmail";
import { toast } from "sonner";

interface ComposerProps {
  open: boolean;
  onClose: () => void;
  replyTo?: EmailMessage;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  contextKey?: string;
}

type WinState = "normal" | "minimized" | "fullscreen";

export function Composer({ open, onClose, replyTo, initialTo, initialSubject, initialBody, contextKey }: ComposerProps) {
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

  const shellStyle: React.CSSProperties = isFull
    ? { position: "fixed", inset: "5vh 8vw", zIndex: 100, width: "auto", height: "auto" }
    : isMin
    ? { position: "fixed", right: "24px", bottom: 0, zIndex: 100, width: "340px", height: "44px" }
    : { position: "fixed", right: "24px", bottom: 0, zIndex: 100, width: "580px", height: "min(600px, 88vh)" };

  const composer = (
    <div
      style={{
        ...shellStyle,
        background: "linear-gradient(180deg, rgba(20,28,55,0.92) 0%, rgba(10,16,38,0.92) 100%)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        border: "1px solid var(--glass-border)",
        boxShadow: "0 20px 60px rgba(0,8,32,0.65), 0 0 0 1px rgba(120,160,230,0.06) inset",
      }}
      className="flex flex-col rounded-t-2xl overflow-hidden text-foreground"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-11 select-none cursor-pointer border-b"
        style={{
          background: "linear-gradient(90deg, rgba(59,130,246,0.12) 0%, rgba(255,255,255,0.02) 100%)",
          borderColor: "var(--glass-border)",
        }}
        onClick={() => isMin && setWinState("normal")}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
          <span className="text-sm font-medium truncate text-foreground/90">
            {isReply ? `Re: ${replyTo?.subject || "Mensagem"}` : (subject || "Nova mensagem")}
          </span>
        </div>
        <div className="flex items-center gap-0.5 text-foreground/60">
          <button onClick={(e) => { e.stopPropagation(); setWinState(isMin ? "normal" : "minimized"); }}
            className="p-1.5 hover:bg-white/10 rounded-md transition" title="Minimizar"
          ><Minus className="h-3.5 w-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); setWinState(isFull ? "normal" : "fullscreen"); }}
            className="p-1.5 hover:bg-white/10 rounded-md transition" title={isFull ? "Sair da tela cheia" : "Tela cheia"}
          >{isFull ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}</button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1.5 hover:bg-destructive/30 hover:text-foreground rounded-md transition" title="Fechar"
          ><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {!isMin && (
        <>
          {/* Recipients */}
          <div className="flex items-center px-4 border-b" style={{ borderColor: "var(--glass-border)" }}>
            <span className="text-xs font-medium text-foreground/40 w-20 shrink-0">Para</span>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="destinatario@exemplo.com"
              className="flex-1 py-2.5 text-sm bg-transparent outline-none placeholder:text-foreground/30 text-foreground"
            />
            <div className="flex items-center gap-2 text-xs text-foreground/50 pl-2">
              {!showCc && <button onClick={() => setShowCc(true)} className="hover:text-primary transition">Cc</button>}
              {!showBcc && <button onClick={() => setShowBcc(true)} className="hover:text-primary transition">Cco</button>}
            </div>
          </div>
          {showCc && (
            <div className="flex items-center px-4 border-b" style={{ borderColor: "var(--glass-border)" }}>
              <span className="text-xs font-medium text-foreground/40 w-20 shrink-0">Cc</span>
              <input value={cc} onChange={(e) => setCc(e.target.value)}
                className="w-full py-2 text-sm bg-transparent outline-none placeholder:text-foreground/30 text-foreground" />
            </div>
          )}
          {showBcc && (
            <div className="flex items-center px-4 border-b" style={{ borderColor: "var(--glass-border)" }}>
              <span className="text-xs font-medium text-foreground/40 w-20 shrink-0">Cco</span>
              <input value={bcc} onChange={(e) => setBcc(e.target.value)}
                className="w-full py-2 text-sm bg-transparent outline-none placeholder:text-foreground/30 text-foreground" />
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center px-4 border-b" style={{ borderColor: "var(--glass-border)" }}>
            <span className="text-xs font-medium text-foreground/40 w-20 shrink-0">Assunto</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Sobre o que é este e-mail?"
              className="w-full py-2.5 text-sm bg-transparent outline-none placeholder:text-foreground/30 text-foreground font-medium"
            />
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto px-5 py-4">
            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[180px] outline-none text-sm leading-relaxed text-foreground/90 empty:before:content-[attr(data-placeholder)] empty:before:text-foreground/30"
              data-placeholder="Escreva sua mensagem..."
            />
          </div>

          {/* Formatting toolbar */}
          <div
            className="flex items-center gap-0.5 px-2 py-1.5 mx-3 mb-2 rounded-xl text-foreground/70 overflow-x-auto"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)" }}
          >
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
          <div
            className="flex items-center justify-between px-3 py-2.5 border-t"
            style={{ borderColor: "var(--glass-border)", background: "rgba(255,255,255,0.02)" }}
          >
            <div className="flex items-stretch rounded-lg overflow-hidden shadow-[0_4px_14px_rgba(59,130,246,0.35)]">
              <button
                onClick={handleSend}
                disabled={send.isPending}
                className="px-5 h-9 bg-primary hover:brightness-110 text-primary-foreground text-sm font-semibold disabled:opacity-60 transition flex items-center gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                {send.isPending ? "Enviando..." : "Enviar"}
              </button>
              <button className="px-2 bg-primary hover:brightness-110 text-primary-foreground border-l border-primary-foreground/20 transition" title="Mais opções">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-foreground/40 hidden sm:block">Rascunho salvo</span>
              <button onClick={discard} className="p-2 hover:bg-destructive/20 hover:text-destructive rounded-lg text-foreground/50 transition" title="Descartar">
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

function ToolIcon({ children, title, onClick }: { children: React.ReactNode; title: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={title} className="p-1.5 hover:bg-white/10 rounded-md transition text-foreground/70 hover:text-foreground">
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-4 bg-white/10 mx-0.5" />;
}
