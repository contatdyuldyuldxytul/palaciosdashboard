import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type WhatsAppInstance = {
  id: string;
  user_id: string;
  instance_name: string;
  status: "disconnected" | "connecting" | "connected" | "error";
  phone_number: string | null;
  profile_name: string | null;
  profile_picture_url: string | null;
  qr_code: string | null;
  qr_updated_at: string | null;
  last_connected_at: string | null;
  webhook_configured: boolean;
  created_at: string;
  updated_at: string;
};

export type WhatsAppMessage = {
  id: string;
  instance_id: string;
  direction: "in" | "out";
  remote_jid: string;
  content: string | null;
  status: string;
  deal_id: string | null;
  person_id: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
  is_read: boolean;
};

export type WhatsAppScheduled = {
  id: string;
  instance_id: string;
  to_number: string;
  content: string;
  scheduled_for: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  error_message: string | null;
  created_at: string;
  campaign_id?: string | null;
  recipient_name?: string | null;
};

export type WhatsAppCampaign = {
  id: string;
  instance_id: string;
  created_by: string;
  nome: string;
  message_template: string;
  total: number;
  sent: number;
  failed: number;
  status: "draft" | "running" | "paused" | "completed" | "cancelled";
  settings: any;
  created_at: string;
  updated_at: string;
};

export type WhatsAppTemplate = {
  id: string;
  owner_user_id: string;
  nome: string;
  conteudo: string;
  created_at: string;
  updated_at: string;
};

async function invoke(action: string, init: RequestInit = {}) {
  const { data, error } = await supabase.functions.invoke(
    `evolution-instance?action=${action}`,
    { method: init.method as any || "POST", body: init.body ? JSON.parse(init.body as string) : undefined },
  );
  if (error) throw error;
  return data;
}

export function useMyWhatsAppInstance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["whatsapp-instance", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances" as any).select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return (data as any) as WhatsAppInstance | null;
    },
  });
}

export function useAllWhatsAppInstances(enabled: boolean) {
  return useQuery({
    queryKey: ["whatsapp-instances-all"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) as WhatsAppInstance[];
    },
  });
}

export function useWhatsAppRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("wa-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_instances" }, () => {
        qc.invalidateQueries({ queryKey: ["whatsapp-instance"] });
        qc.invalidateQueries({ queryKey: ["whatsapp-instances-all"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["whatsapp-messages"] });
        qc.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_scheduled_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["whatsapp-scheduled"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_campaigns" }, () => {
        qc.invalidateQueries({ queryKey: ["whatsapp-campaigns"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
}

export function useWhatsAppActions() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["whatsapp-instance"] });
    qc.invalidateQueries({ queryKey: ["whatsapp-instances-all"] });
  };
  return {
    connect: useMutation({ mutationFn: () => invoke("create"), onSuccess: refresh }),
    refreshQr: useMutation({ mutationFn: () => invoke("qr", { method: "GET" }), onSuccess: refresh }),
    status: useMutation({ mutationFn: () => invoke("status", { method: "GET" }), onSuccess: refresh }),
    disconnect: useMutation({ mutationFn: () => invoke("disconnect"), onSuccess: refresh }),
    remove: useMutation({ mutationFn: () => invoke("delete", { method: "DELETE" }), onSuccess: refresh }),
  };
}

export function useWhatsAppMessages(instanceId?: string | null, remoteJid?: string | null) {
  return useQuery({
    queryKey: ["whatsapp-messages", instanceId, remoteJid],
    enabled: !!(instanceId && remoteJid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages" as any)
        .select("*")
        .eq("instance_id", instanceId!)
        .eq("remote_jid", remoteJid!)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data as any) as WhatsAppMessage[];
    },
  });
}

export function useConversations(instanceId?: string | null) {
  const { data, ...rest } = useQuery({
    queryKey: ["whatsapp-conversations", instanceId],
    enabled: !!instanceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages" as any)
        .select("id, remote_jid, content, direction, is_read, created_at, person_id, deal_id")
        .eq("instance_id", instanceId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as any[];
    },
  });

  const conversations = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, any>();
    for (const m of data) {
      if (!map.has(m.remote_jid)) {
        map.set(m.remote_jid, {
          remote_jid: m.remote_jid,
          last: m,
          unread: 0,
          person_id: m.person_id,
          deal_id: m.deal_id,
        });
      }
      const c = map.get(m.remote_jid);
      if (m.direction === "in" && !m.is_read) c.unread++;
      if (!c.person_id && m.person_id) c.person_id = m.person_id;
      if (!c.deal_id && m.deal_id) c.deal_id = m.deal_id;
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime());
  }, [data]);

  return { conversations, ...rest };
}

export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ instance_id, remote_jid }: { instance_id: string; remote_jid: string }) => {
      const { error } = await supabase.from("whatsapp_messages" as any)
        .update({ is_read: true })
        .eq("instance_id", instance_id)
        .eq("remote_jid", remote_jid)
        .eq("direction", "in")
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-messages"] });
    },
  });
}

export function useLinkConversationToPerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ instance_id, remote_jid, person_id, deal_id }: { instance_id: string; remote_jid: string; person_id?: string | null; deal_id?: string | null }) => {
      const patch: any = {};
      if (person_id !== undefined) patch.person_id = person_id;
      if (deal_id !== undefined) patch.deal_id = deal_id;
      const { error } = await supabase.from("whatsapp_messages" as any)
        .update(patch).eq("instance_id", instance_id).eq("remote_jid", remote_jid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-conversations"] }),
  });
}

export function useSendWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { instance_id?: string; to: string; content: string; deal_id?: string; person_id?: string }) => {
      const { data, error } = await supabase.functions.invoke("evolution-send", { body: args });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-messages"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
  });
}

// ===== Campaigns =====
export function useWhatsAppCampaigns(instanceId?: string | null) {
  return useQuery({
    queryKey: ["whatsapp-campaigns", instanceId],
    enabled: !!instanceId,
    queryFn: async () => {
      const { data, error } = await supabase.from("whatsapp_campaigns" as any)
        .select("*").eq("instance_id", instanceId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) as WhatsAppCampaign[];
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { instance_id: string; nome: string; message_template: string; recipients: any[]; settings: any }) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-campaign-create", { body: args });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-campaigns"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-scheduled"] });
    },
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<WhatsAppCampaign> }) => {
      const { error } = await supabase.from("whatsapp_campaigns" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-campaigns"] }),
  });
}

// ===== Templates =====
export function useWhatsAppTemplates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["whatsapp-templates", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("whatsapp_templates" as any)
        .select("*").order("nome", { ascending: true });
      if (error) throw error;
      return (data as any) as WhatsAppTemplate[];
    },
  });
}

export function useTemplateActions() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const refresh = () => qc.invalidateQueries({ queryKey: ["whatsapp-templates"] });
  return {
    create: useMutation({
      mutationFn: async ({ nome, conteudo }: { nome: string; conteudo: string }) => {
        const { error } = await supabase.from("whatsapp_templates" as any)
          .insert({ owner_user_id: user!.id, nome, conteudo });
        if (error) throw error;
      },
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: async ({ id, nome, conteudo }: { id: string; nome: string; conteudo: string }) => {
        const { error } = await supabase.from("whatsapp_templates" as any)
          .update({ nome, conteudo }).eq("id", id);
        if (error) throw error;
      },
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("whatsapp_templates" as any).delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: refresh,
    }),
  };
}

export function renderTemplate(tpl: string, vars: Record<string, any>) {
  return (tpl || "").replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, k) => {
    const v = vars?.[k];
    return v == null ? "" : String(v);
  });
}

// kept for backwards compat (scheduled list view)
export function useWhatsAppScheduled(instanceId?: string | null) {
  return useQuery({
    queryKey: ["whatsapp-scheduled", instanceId],
    enabled: !!instanceId,
    queryFn: async () => {
      const { data, error } = await supabase.from("whatsapp_scheduled_messages" as any)
        .select("*").eq("instance_id", instanceId!).order("scheduled_for", { ascending: true });
      if (error) throw error;
      return (data as any) as WhatsAppScheduled[];
    },
  });
}

export function useScheduleWhatsApp() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: { instance_id: string; to: string; content: string; scheduled_for: string; deal_id?: string; person_id?: string }) => {
      const { error } = await supabase.from("whatsapp_scheduled_messages" as any).insert({
        instance_id: args.instance_id, created_by: user!.id, to_number: args.to,
        content: args.content, scheduled_for: args.scheduled_for,
        deal_id: args.deal_id || null, person_id: args.person_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-scheduled"] }),
  });
}

export function useCancelScheduled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_scheduled_messages" as any).update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-scheduled"] }),
  });
}
