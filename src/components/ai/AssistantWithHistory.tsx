import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AIChatPage } from "@/components/AIChatPage";
import { ChatHistorySidebar } from "@/components/ai/ChatHistorySidebar";
import { useChatConversations } from "@/hooks/useChatConversations";
import type { Assistant } from "@/hooks/useAIChat";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  assistant: Assistant;
  basePath: string;
  title: string;
  subtitle: string;
  quickPrompts: string[];
}

function makeTitle(text: string) {
  const clean = text.trim().replace(/\s+/g, " ");
  const truncated = clean.length > 50 ? clean.slice(0, 50).trim() + "…" : clean;
  const date = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${truncated} — ${date}`;
}

export function AssistantWithHistory({ assistant, basePath, title, subtitle, quickPrompts }: Props) {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { conversations, refresh, create, rename } = useChatConversations(assistant);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (threadId || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    (async () => {
      const list = await refresh();
      if (list.length > 0) {
        navigate(`${basePath}/${list[0].id}`, { replace: true });
      } else {
        const conv = await create();
        if (conv) navigate(`${basePath}/${conv.id}`, { replace: true });
      }
    })();
  }, [threadId, refresh, create, navigate, basePath]);

  const handleFirstUserMessage = async (text: string) => {
    if (!threadId) return;
    const conv = conversations.find((c) => c.id === threadId);
    if (!conv || conv.title !== "Nova conversa") {
      const { data } = await supabase.from("chat_conversations").select("title").eq("id", threadId).single();
      if (!data || data.title !== "Nova conversa") return;
    }
    await rename(threadId, makeTitle(text));
  };

  return (
    <div className="flex h-[calc(100vh-7rem)]">
      <div className="hidden md:block h-full">
        <ChatHistorySidebar assistant={assistant} activeId={threadId ?? null} basePath={basePath} />
      </div>
      <div className="flex-1 min-w-0">
        {threadId && (
          <AIChatPage
            key={threadId}
            assistant={assistant}
            threadId={threadId}
            title={title}
            subtitle={subtitle}
            quickPrompts={quickPrompts}
            onFirstUserMessage={handleFirstUserMessage}
          />
        )}
      </div>
    </div>
  );
}
