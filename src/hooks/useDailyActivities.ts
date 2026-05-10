import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DailyActivity = {
  id: string;
  user_id: string | null;
  user_pipedrive_id: number | null;
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

export function todayISO() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Opts = {
  /** Pipedrive user id to filter by */
  pipedriveUserId?: number | null;
  /** Special mode for Milena: pipedrive_user_id IS NULL AND task_description ILIKE '%Milena%' */
  milenaMode?: boolean;
  /** Legacy: filter by assignee_label text */
  assignee?: string;
  /** ISO date (defaults to today, BR tz). When `days` > 1, this is the start. */
  date?: string;
  /** Number of days to include (1 = only that date, 7 = today+6) */
  days?: number;
  /** Disable the query entirely (returns empty) */
  enabled?: boolean;
};

export function useDailyActivities(opts: Opts = {}) {
  const date = opts.date ?? todayISO();
  const days = opts.days ?? 1;
  return useQuery({
    queryKey: [
      "daily_activities",
      opts.pipedriveUserId ?? null,
      opts.milenaMode ?? false,
      opts.assignee ?? null,
      date,
      days,
    ],
    enabled: opts.enabled !== false,
    queryFn: async () => {
      let q = supabase
        .from("daily_activities")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (days > 1) {
        q = q.gte("scheduled_date", date).lte("scheduled_date", addDays(date, days - 1));
      } else {
        q = q.eq("scheduled_date", date);
      }

      if (opts.pipedriveUserId != null) {
        q = q.eq("user_pipedrive_id", opts.pipedriveUserId);
      } else if (opts.milenaMode) {
        q = q.is("user_pipedrive_id", null).ilike("task_description", "%Milena%");
      } else if (opts.assignee) {
        q = q.eq("assignee_label", opts.assignee);
      }

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
