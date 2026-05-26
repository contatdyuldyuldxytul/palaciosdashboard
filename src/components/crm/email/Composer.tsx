import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Minus, Maximize2, Minimize2, X, Trash2, Paperclip, Link as LinkIcon,
  Smile, Image as ImageIcon, Lock, PenLine, Calendar, MoreVertical,
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
  contextKey?: string; // for draft autosave
}

type WinState = "normal" | "minimized" | "fullscreen";

export function Composer({ open, onClose, replyTo, initialTo, initialSubject, initialBody, contextKey }: ComposerProps) {
  const isReply = !!replyTo;
  const draftKey = useMemo(
    () => `gmail-draft:${contextKey || (isReply ? `reply-${replyTo?.id}` : "new")}`,
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

  // Initialize / restore draft when opened
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

  // Autosave
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
    ? { position: "fixed", inset: "5vh 10vw", zIndex: 100, width: "auto", height: "auto" }
    : isMin
    ? { position: "fixed", right: "24px", bottom: 0, zIndex: 100, width: "320px", height: "40px" }
    : { position: "fixed", right: "24px", bottom: 0, zIndex: 100, width: "540px", height: "min(560px, 85vh)" };

  const composer = (
    <div
      style={shellStyle}
      className="flex flex-col bg-white text-zinc-900 rounded-t-lg shadow-2xl border border-zinc-200 overflow-hidden font-sans"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-10 bg-[#f2f6fc] text-zinc-800 select-none cursor-pointer"
        onClick={() => isMin && setWinState("normal")}
      >
        <span className="text-sm font-medium truncate">
          {isReply ? `Re: ${replyTo?.subject || "Mensagem"}` : (subject || "Nova mensagem")}
        </span>
        <div className="flex items-center gap-1 text-zinc-600">
          <button
            onClick={(e) => { e.stopPropagation(); setWinState(isMin ? "normal" : "minimized"); }}
            className="p-1.5 hover:bg-zinc-200 rounded" title="Minimizar"
          ><Minus className="h-3.5 w-3.5" /></button>
          <button
            onClick={(e) => { e.stopPropagation(); setWinState(isFull ? "normal" : "fullscreen"); }}
            className="p-1.5 hover:bg-zinc-200 rounded" title={isFull ? "Sair da tela cheia" : "Tela cheia"}
          >{isFull ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}</button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1.5 hover:bg-zinc-200 rounded" title="Fechar"
          ><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {!isMin && (
        <>
          {/* Recipients */}
          <div className="flex items-center px-4 border-b border-zinc-200">
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Destinatários"
              className="flex-1 py-2.5 text-sm bg-transparent outline-none placeholder:text-zinc-500"
            />
            <div className="flex items-center gap-2 text-xs text-zinc-600 pl-2">
              {!showCc && <button onClick={() => setShowCc(true)} className="hover:text-zinc-900">Cc</button>}
              {!showBcc && <button onClick={() => setShowBcc(true)} className="hover:text-zinc-900">Cco</button>}
            </div>
          </div>
          {showCc && (
            <div className="px-4 border-b border-zinc-200">
              <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Cc"
                className="w-full py-2 text-sm bg-transparent outline-none placeholder:text-zinc-500" />
            </div>
          )}
          {showBcc && (
            <div className="px-4 border-b border-zinc-200">
              <input value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="Cco"
                className="w-full py-2 text-sm bg-transparent outline-none placeholder:text-zinc-500" />
            </div>
          )}

          {/* Subject */}
          <div className="px-4 border-b border-zinc-200">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto"
              className="w-full py-2.5 text-sm bg-transparent outline-none placeholder:text-zinc-500"
            />
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto px-4 py-3">
            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[180px] outline-none text-sm leading-relaxed text-zinc-900 empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400"
              data-placeholder='Pressione "/" para usar o recurso "Me ajude a escrever"'
              onKeyDown={(e) => {
                if (e.key === "/" && !bodyRef.current?.textContent) {
                  // placeholder action; do nothing real
                }
              }}
            />
          </div>

          {/* Formatting toolbar */}
          <div className="flex items-center gap-1 px-2 py-1.5 mx-3 mb-1 rounded-full bg-zinc-100 text-zinc-700 overflow-x-auto">
            <button onClick={() => exec("undo")} className="p-1.5 hover:bg-zinc-200 rounded" title="Desfazer"><Undo2 className="h-4 w-4" /></button>
            <button onClick={() => exec("redo")} className="p-1.5 hover:bg-zinc-200 rounded" title="Refazer"><Redo2 className="h-4 w-4" /></button>
            <span className="w-px h-5 bg-zinc-300 mx-1" />
            <button className="px-2 h-7 text-xs hover:bg-zinc-200 rounded flex items-center gap-1"><span>Sans Serif</span><ChevronDown className="h-3 w-3" /></button>
            <span className="w-px h-5 bg-zinc-300 mx-1" />
            <button onClick={() => exec("bold")} className="p-1.5 hover:bg-zinc-200 rounded" title="Negrito"><Bold className="h-4 w-4" /></button>
            <button onClick={() => exec("italic")} className="p-1.5 hover:bg-zinc-200 rounded" title="Itálico"><Italic className="h-4 w-4" /></button>
            <button onClick={() => exec("underline")} className="p-1.5 hover:bg-zinc-200 rounded" title="Sublinhado"><Underline className="h-4 w-4" /></button>
            <span className="w-px h-5 bg-zinc-300 mx-1" />
            <button onClick={() => exec("justifyLeft")} className="p-1.5 hover:bg-zinc-200 rounded" title="Alinhar"><AlignLeft className="h-4 w-4" /></button>
            <button onClick={() => exec("insertOrderedList")} className="p-1.5 hover:bg-zinc-200 rounded" title="Lista numerada"><ListOrdered className="h-4 w-4" /></button>
            <button onClick={() => exec("removeFormat")} className="p-1.5 hover:bg-zinc-200 rounded" title="Limpar formatação"><Type className="h-4 w-4" /></button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-200 bg-white">
            <div className="flex items-center gap-1">
              <div className="flex items-stretch rounded-full overflow-hidden shadow-sm">
                <button
                  onClick={handleSend}
                  disabled={send.isPending}
                  className="px-6 h-9 bg-[#0b57d0] hover:bg-[#0a4cb8] text-white text-sm font-medium disabled:opacity-60"
                >
                  {send.isPending ? "Enviando..." : "Enviar"}
                </button>
                <button className="px-1.5 bg-[#0b57d0] hover:bg-[#0a4cb8] text-white border-l border-white/20" title="Mais opções de envio">
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <span className="w-2" />
              <ToolBtn icon={<Type className="h-4 w-4" />} title="Formatação" />
              <ToolBtn icon={<Sparkles className="h-4 w-4" />} title="Me ajude a escrever" />
              <ToolBtn icon={<Paperclip className="h-4 w-4" />} title="Anexar arquivo" />
              <ToolBtn icon={<LinkIcon className="h-4 w-4" />} title="Inserir link" />
              <ToolBtn icon={<Smile className="h-4 w-4" />} title="Emoji" />
              <ToolBtn icon={<ImageIcon className="h-4 w-4" />} title="Inserir foto" />
              <ToolBtn icon={<Lock className="h-4 w-4" />} title="Modo confidencial" />
              <ToolBtn icon={<PenLine className="h-4 w-4" />} title="Assinatura" />
              <ToolBtn icon={<Calendar className="h-4 w-4" />} title="Convite" />
              <ToolBtn icon={<MoreVertical className="h-4 w-4" />} title="Mais opções" />
            </div>
            <button onClick={discard} className="p-2 hover:bg-zinc-100 rounded text-zinc-600" title="Descartar rascunho">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );

  return createPortal(composer, document.body);
}

function ToolBtn({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <button title={title} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-600">
      {icon}
    </button>
  );
}
