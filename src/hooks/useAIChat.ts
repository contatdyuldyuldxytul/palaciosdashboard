import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Assistant = "vendas" | "fundador" | "geral";

export function useAIChat(assistant: Assistant) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load persisted history
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setHistoryLoaded(true); return; }
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, content, parts, created_at")
        .eq("user_id", user.id)
        .eq("assistant", assistant)
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
  }, [assistant]);

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
    id: `${assistant}-${historyLoaded ? "loaded" : "loading"}`,
    onFinish: async ({ message }) => {
      // Persist the completed assistant message + ensure last user message persisted
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Persist assistant
      const textContent = (message.parts ?? []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("");
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        assistant,
        role: "assistant",
        content: textContent,
        parts: message.parts as any,
      });
    },
  });

  // Persist user message on send
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        assistant,
        role: "user",
        content: text.trim(),
        parts: [{ type: "text", text: text.trim() }] as any,
      });
    }
    await chat.sendMessage({ text: text.trim() });
  }, [chat, assistant]);

  const clearMessages = useCallback(async () => {
    chat.setMessages([]);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("chat_messages").delete().eq("user_id", user.id).eq("assistant", assistant);
  }, [chat, assistant]);

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
