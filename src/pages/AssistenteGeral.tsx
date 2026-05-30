import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AIChatPage } from "@/components/AIChatPage";
import { ChatHistorySidebar } from "@/components/ai/ChatHistorySidebar";
import { useChatConversations } from "@/hooks/useChatConversations";
import { supabase } from "@/integrations/supabase/client";

const ASSISTANT = "geral" as const;
const BASE_PATH = "/assistente";

const quickPrompts = [
  "Quantos deals abertos temos por pipeline?",
  "Top 10 leads com maior probabilidade de fechar reunião",
  "Liste deals parados há mais de 30 dias e exporte em CSV",
  "Quais atividades estão pendentes esta semana?",
  "Resuma o funil de vendas hoje",
];

function makeTitle(text: string) {
  const clean = text.trim().replace(/\s+/g, " ");
  const truncated = clean.length > 50 ? clean.slice(0, 50).trim() + "…" : clean;
  const date = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${truncated} — ${date}`;
}

export default function AssistenteGeral() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { conversations, refresh, create, rename } = useChatConversations(ASSISTANT);
  const bootstrappedRef = useRef(false);

  // Bootstrap: if no threadId, pick most recent or create new
  useEffect(() => {
    if (threadId || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    (async () => {
      const list = await refresh();
      if (list.length > 0) {
        navigate(`${BASE_PATH}/${list[0].id}`, { replace: true });
      } else {
        const conv = await create();
        if (conv) navigate(`${BASE_PATH}/${conv.id}`, { replace: true });
      }
    })();
  }, [threadId, refresh, create, navigate]);

  // Auto-title: when conversation still has "Nova conversa", set title from first user message
  const handleFirstUserMessage = async (text: string) => {
    if (!threadId) return;
    const conv = conversations.find((c) => c.id === threadId);
    if (!conv || conv.title !== "Nova conversa") {
      // Fallback: fetch fresh in case state is stale
      const { data } = await supabase.from("chat_conversations").select("title").eq("id", threadId).single();
      if (!data || data.title !== "Nova conversa") return;
    }
    await rename(threadId, makeTitle(text));
  };

  return (
    <div className="flex h-[calc(100vh-7rem)]">
      <div className="hidden md:block h-full">
        <ChatHistorySidebar assistant={ASSISTANT} activeId={threadId ?? null} basePath={BASE_PATH} />
      </div>
      <div className="flex-1 min-w-0">
        {threadId && (
          <AIChatPage
            key={threadId}
            assistant={ASSISTANT}
            threadId={threadId}
            title="Assistente IA"
            subtitle="Especialista em mercado imobiliário, vendas B2B e renderização 3D"
            quickPrompts={quickPrompts}
            onFirstUserMessage={handleFirstUserMessage}
          />
        )}
      </div>
    </div>
  );
}
