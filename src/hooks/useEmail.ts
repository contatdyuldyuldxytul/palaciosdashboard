import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmailMessage {
  id: string;
  gmail_message_id: string;
  gmail_thread_id: string;
  direction: "in" | "out";
  from_email: string | null;
  from_name: string | null;
  to_emails: string[] | null;
  subject: string | null;
  snippet: string | null;
  body_html: string | null;
  body_text: string | null;
  received_at: string;
  is_read: boolean;
  deal_id: string | null;
  person_id: string | null;
}

export type InboxFilter = "all" | "unread" | "sent" | "linked" | "unlinked";

export function useEmailMessages(filter: InboxFilter = "all", search = "") {
  return useQuery({
    queryKey: ["email_messages", filter, search],
    queryFn: async () => {
      let q = supabase.from("email_messages" as any).select("*").order("received_at", { ascending: false }).limit(200);
      if (filter === "unread") q = q.eq("is_read", false).eq("direction", "in");
      if (filter === "sent") q = q.eq("direction", "out");
      if (filter === "linked") q = q.not("deal_id", "is", null);
      if (filter === "unlinked") q = q.is("deal_id", null);
      if (search) q = q.or(`subject.ilike.%${search}%,from_email.ilike.%${search}%,snippet.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as EmailMessage[];
    },
    staleTime: 30_000,
  });
}

export function useEmailThread(threadId?: string) {
  return useQuery({
    queryKey: ["email_thread", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("email_messages" as any)
        .select("*")
        .eq("gmail_thread_id", threadId)
        .order("received_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as EmailMessage[];
    },
    enabled: !!threadId,
  });
}

export function useSyncGmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("gmail-sync", { body: { maxResults: 50 } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email_messages"] }),
  });
}

export function useSendEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { to: string; cc?: string; bcc?: string; subject: string; html: string; threadId?: string; inReplyTo?: string; mode?: "send" | "draft" }) => {
      const { data, error } = await supabase.functions.invoke("gmail-send", { body: { mode: "send", ...payload } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email_messages"] });
      setTimeout(() => qc.invalidateQueries({ queryKey: ["email_messages"] }), 2000);
    },
  });
}
