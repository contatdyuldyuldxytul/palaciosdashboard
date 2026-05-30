import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Assistant = "vendas" | "fundador" | "geral";

interface UseAIChatOptions {
  onFirstUserMessage?: (text: string) => void;
}

export function useAIChat(assistant: Assistant, threadId: string | null, options?: UseAIChatOptions) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const onFirstUserMessageRef = useRef(options?.onFirstUserMessage);
  onFirstUserMessageRef.current = options?.onFirstUserMessage;

  // Load persisted history for this thread
  useEffect(() => {
    let cancelled = false;
    setHistoryLoaded(false);
    setInitialMessages([]);
    if (!threadId) { setHistoryLoaded(true); return; }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setHistoryLoaded(true); return; }
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, content, parts, created_at")
        .eq("conversation_id", threadId)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      const msgs: UIMessage[] = (data ?? []).map((m: any) => {
        if (m.parts && Array.isArray(m.parts) && m.parts.length > 0) {
          return { id: m.id, role: m.role, parts: m.parts } as UIMessage;
        }
        return { id: m.id, role: m.role, parts: [{ type: "text", text: m.content ?? "" }] } as UIMessage;
      });
      setInitialMessages(msgs);
      setHistoryLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [threadId]);

  const transport = useMemo(() => new DefaultChatTransport({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
    headers: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return {
        Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
      };
    },
    body: { assistant },
  }), [assistant]);

  const chat = useChat({
    transport,
    messages: initialMessages,
    id: `${assistant}-${threadId ?? "none"}-${historyLoaded ? "loaded" : "loading"}`,
    onFinish: async ({ message }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !threadId) return;
      const textContent = (message.parts ?? []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("");
      await (supabase.from("chat_messages") as any).insert({
        user_id: user.id,
        assistant,
        role: "assistant",
        content: textContent,
        parts: message.parts as any,
        conversation_id: threadId,
      });
      await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    },
  });

  // Persist user message on send
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !threadId) return;
    const trimmed = text.trim();
    const isFirst = chat.messages.length === 0;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await (supabase.from("chat_messages") as any).insert({
        user_id: user.id,
        assistant,
        role: "user",
        content: trimmed,
        parts: [{ type: "text", text: trimmed }] as any,
        conversation_id: threadId,
      });
      await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    }
    if (isFirst) onFirstUserMessageRef.current?.(trimmed);
    await chat.sendMessage({ text: trimmed });
  }, [chat, assistant, threadId]);

  const clearMessages = useCallback(async () => {
    chat.setMessages([]);
    if (!threadId) return;
    await supabase.from("chat_messages").delete().eq("conversation_id", threadId);
  }, [chat, threadId]);

  return {
    messages: chat.messages,
    status: chat.status,
    isLoading: chat.status === "submitted" || chat.status === "streaming",
    send: sendMessage,
    clearMessages,
    historyLoaded,
    addToolResult: chat.addToolResult,
  };
}
