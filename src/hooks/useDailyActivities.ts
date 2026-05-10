import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DailyActivity = {
  id: string;
  user_id: string | null;
  assignee_label: string | null;
  scheduled_date: string;
  task_type: "cadence" | "strategic" | "reactivation" | "followup" | "meeting" | "custom";
  task_description: string;
  related_deal_id: number | null;
  related_campaign_id: string | null;
  priority: number;
  completed: boolean;
  completed_at: string | null;
  source: "auto" | "manual" | "claude_briefing";
  notes: string | null;
  created_at: string;
};

function todayISO() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return d.toISOString().slice(0, 10);
}

export function useDailyActivities(opts: { assignee?: string; date?: string; days?: number } = {}) {
  const date = opts.date ?? todayISO();
  return useQuery({
    queryKey: ["daily_activities", opts.assignee ?? "all", date, opts.days ?? 1],
    queryFn: async () => {
      let q = supabase
        .from("daily_activities")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (opts.days && opts.days > 1) {
        const end = new Date(date);
        end.setDate(end.getDate() + opts.days - 1);
        q = q.gte("scheduled_date", date).lte("scheduled_date", end.toISOString().slice(0, 10));
      } else {
        q = q.eq("scheduled_date", date);
      }
      if (opts.assignee) q = q.eq("assignee_label", opts.assignee);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DailyActivity[];
    },
  });
}

export function useToggleActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (act: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("daily_activities")
        .update({
          completed: act.completed,
          completed_at: act.completed ? new Date().toISOString() : null,
        })
        .eq("id", act.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily_activities"] }),
  });
}
