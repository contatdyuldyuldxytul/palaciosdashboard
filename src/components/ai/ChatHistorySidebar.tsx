import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MessageSquare, Pencil, Trash2, Check, X } from "lucide-react";
import { useChatConversations, type ChatConversation } from "@/hooks/useChatConversations";
import type { Assistant } from "@/hooks/useAIChat";

interface Props {
  assistant: Assistant;
  activeId: string | null;
  basePath: string; // e.g. "/assistente"
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function ChatHistorySidebar({ assistant, activeId, basePath }: Props) {
  const navigate = useNavigate();
  const { conversations, create, rename, remove } = useChatConversations(assistant);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleNew = async () => {
    const conv = await create();
    if (conv) navigate(`${basePath}/${conv.id}`);
  };

  const startEdit = (c: ChatConversation) => {
    setEditingId(c.id);
    setEditValue(c.title);
  };

  const saveEdit = async () => {
    if (editingId && editValue.trim()) {
      await rename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleDelete = async (c: ChatConversation) => {
    if (!confirm(`Excluir a conversa "${c.title}"?`)) return;
    await remove(c.id);
    if (activeId === c.id) {
      navigate(basePath);
    }
  };

  return (
    <aside className="w-64 flex-shrink-0 border-r border-white/5 flex flex-col h-full">
      <div className="p-3 border-b border-white/5">
        <button
          onClick={handleNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Nova conversa
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {conversations.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhuma conversa ainda.</p>
        )}
        {conversations.map((c) => {
          const isActive = c.id === activeId;
          const isEditing = editingId === c.id;
          return (
            <div
              key={c.id}
              className={`group rounded-lg px-2 py-2 text-sm transition-colors ${
                isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 bg-black/30 rounded px-2 py-1 text-xs text-foreground border border-white/10 focus:outline-none focus:border-primary"
                  />
                  <button onClick={saveEdit} className="p-1 text-emerald-400 hover:bg-white/5 rounded">
                    <Check className="w-3 h-3" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-white/5 rounded">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`${basePath}/${c.id}`)}
                    className="flex-1 flex items-center gap-2 min-w-0 text-left"
                  >
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium">{c.title}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(c.updated_at)}</p>
                    </div>
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                    <button onClick={() => startEdit(c)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded" title="Renomear">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDelete(c)} className="p-1 text-muted-foreground hover:text-red-400 hover:bg-white/5 rounded" title="Excluir">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
