import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useSendEmail, type EmailMessage } from "@/hooks/useEmail";
import { toast } from "sonner";

export function Composer({ open, onClose, replyTo }: { open: boolean; onClose: () => void; replyTo?: EmailMessage }) {
  const isReply = !!replyTo;
  const [to, setTo] = useState(isReply ? (replyTo?.from_email || "") : "");
  const [subject, setSubject] = useState(isReply ? `Re: ${replyTo?.subject || ""}` : "");
  const [body, setBody] = useState("");
  const send = useSendEmail();

  const handleSend = async () => {
    if (!to || !subject) { toast.error("Preencha destinatário e assunto"); return; }
    try {
      const html = body.replace(/\n/g, "<br>");
      await send.mutateAsync({
        to, subject, html,
        threadId: replyTo?.gmail_thread_id,
        inReplyTo: replyTo?.gmail_message_id,
      });
      toast.success("E-mail enviado");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-border">
        <DialogHeader>
          <DialogTitle>{isReply ? "Responder" : "Novo e-mail"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Para (e-mail)" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input placeholder="Assunto" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Escreva sua mensagem..." rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSend} disabled={send.isPending} className="bg-emerald-500 hover:bg-emerald-600">
            {send.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
