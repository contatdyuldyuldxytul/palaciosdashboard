import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Assistant } from "./useAIChat";

export interface ChatConversation {
  id: string;
  assistant: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useChatConversations(assistant: Assistant) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setConversations([]);
      setLoading(false);
      return [];
    }
    const { data } = await supabase
      .from("chat_conversations")
      .select("id, assistant, title, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("assistant", assistant)
      .order("updated_at", { ascending: false });
    const list = (data ?? []) as ChatConversation[];
    setConversations(list);
    setLoading(false);
    return list;
  }, [assistant]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (title = "Nova conversa"): Promise<ChatConversation | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ user_id: user.id, assistant, title })
      .select("id, assistant, title, created_at, updated_at")
      .single();
    if (error || !data) return null;
    const conv = data as ChatConversation;
    setConversations((prev) => [conv, ...prev]);
    return conv;
  }, [assistant]);

  const rename = useCallback(async (id: string, title: string) => {
    await supabase.from("chat_conversations").update({ title }).eq("id", id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await supabase.from("chat_conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const touch = useCallback(async (id: string) => {
    await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", id);
  }, []);

  return { conversations, loading, refresh, create, rename, remove, touch };
}
