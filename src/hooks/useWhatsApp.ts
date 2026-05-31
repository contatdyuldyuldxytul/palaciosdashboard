import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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
        .from("whatsapp_instances" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
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
        .from("whatsapp_instances" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) as WhatsAppInstance[];
    },
  });
}

export function useWhatsAppRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("wa-instances-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_instances" }, () => {
        qc.invalidateQueries({ queryKey: ["whatsapp-instance"] });
        qc.invalidateQueries({ queryKey: ["whatsapp-instances-all"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["whatsapp-messages"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_scheduled_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["whatsapp-scheduled"] });
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

export function useWhatsAppMessages(instanceId?: string | null, dealId?: string | null) {
  return useQuery({
    queryKey: ["whatsapp-messages", instanceId, dealId],
    enabled: !!(instanceId || dealId),
    queryFn: async () => {
      let q = supabase.from("whatsapp_messages" as any).select("*").order("created_at", { ascending: false }).limit(100);
      if (instanceId) q = q.eq("instance_id", instanceId);
      if (dealId) q = q.eq("deal_id", dealId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any) as WhatsAppMessage[];
    },
  });
}

export function useWhatsAppScheduled(instanceId?: string | null) {
  return useQuery({
    queryKey: ["whatsapp-scheduled", instanceId],
    enabled: !!instanceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_scheduled_messages" as any)
        .select("*")
        .eq("instance_id", instanceId!)
        .order("scheduled_for", { ascending: true });
      if (error) throw error;
      return (data as any) as WhatsAppScheduled[];
    },
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-messages"] }),
  });
}

export function useScheduleWhatsApp() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: { instance_id: string; to: string; content: string; scheduled_for: string; deal_id?: string; person_id?: string }) => {
      const { error } = await supabase.from("whatsapp_scheduled_messages" as any).insert({
        instance_id: args.instance_id,
        created_by: user!.id,
        to_number: args.to,
        content: args.content,
        scheduled_for: args.scheduled_for,
        deal_id: args.deal_id || null,
        person_id: args.person_id || null,
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
