/**
 * Cadence Cycle Engine
 * 
 * Anchor: 23/03/2026 (Monday) = Cycle 1, Day 1
 * Each cycle = 10 working days (Mon-Fri)
 * Odd days (1,3,5,7,9) = Group A
 * Even days (2,4,6,8,10) = Group B
 * After Day 10, next Monday starts a new cycle from Day 1
 */

// Timezone helper: get current date in São Paulo
export function nowSP(): Date {
  const str = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  return new Date(str);
}

export function todaySP(): string {
  const d = nowSP();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Anchor: 2026-03-23 is Cycle 1, Day 1
const ANCHOR_DATE = new Date(2026, 2, 23); // March 23, 2026 (Monday)

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isWorkingDay(d: Date): boolean {
  const dow = d.getDay();
  return dow >= 1 && dow <= 5;
}

/**
 * Get all working days from anchor forward/backward to cover a date range.
 * Returns the cycle info for a specific date.
 */
export interface CycleDayInfo {
  date: string; // YYYY-MM-DD
  isWorkingDay: boolean;
  cycleNumber: number;
  cycleDay: number; // 1-10
  group: "A" | "B";
  activities: CycleActivity[];
}

export interface CycleActivity {
  periodo: string; // "Manhã 1", "Manhã 2", "Tarde 1", "Tarde 2"
  periodoLabel: string; // "Manhã" or "Tarde"
  tipo: string; // "Email", "WhatsApp", "LinkedIn", "Ligação"
  emoji: string;
  grupo: "A" | "B";
  descricao: string; // short display name
}

// Activity map: cycleDay -> activities
const CYCLE_ACTIVITIES: Record<number, Array<{ periodo: string; periodoLabel: string; tipo: string; emoji: string }>> = {
  1: [
    { periodo: "Manhã 1", periodoLabel: "Manhã", tipo: "Email", emoji: "📧" },
    { periodo: "Manhã 2", periodoLabel: "Manhã", tipo: "WhatsApp", emoji: "📱" },
    { periodo: "Tarde 1", periodoLabel: "Tarde", tipo: "LinkedIn", emoji: "💼" },
  ],
  2: [
    { periodo: "Manhã 1", periodoLabel: "Manhã", tipo: "Email", emoji: "📧" },
    { periodo: "Manhã 2", periodoLabel: "Manhã", tipo: "WhatsApp", emoji: "📱" },
    { periodo: "Tarde 1", periodoLabel: "Tarde", tipo: "LinkedIn", emoji: "💼" },
  ],
  3: [
    { periodo: "Manhã 1", periodoLabel: "Manhã", tipo: "Email", emoji: "📧" },
    { periodo: "Manhã 2", periodoLabel: "Manhã", tipo: "Ligação", emoji: "📞" },
    { periodo: "Tarde 1", periodoLabel: "Tarde", tipo: "Ligação", emoji: "📞" },
  ],
  4: [
    { periodo: "Manhã 1", periodoLabel: "Manhã", tipo: "Email", emoji: "📧" },
    { periodo: "Manhã 2", periodoLabel: "Manhã", tipo: "Ligação", emoji: "📞" },
    { periodo: "Tarde 1", periodoLabel: "Tarde", tipo: "Ligação", emoji: "📞" },
    { periodo: "Tarde 2", periodoLabel: "Tarde", tipo: "WhatsApp", emoji: "📱" },
  ],
  5: [
    { periodo: "Manhã 1", periodoLabel: "Manhã", tipo: "Ligação", emoji: "📞" },
    { periodo: "Manhã 2", periodoLabel: "Manhã", tipo: "Ligação", emoji: "📞" },
    { periodo: "Tarde 1", periodoLabel: "Tarde", tipo: "LinkedIn", emoji: "💼" },
    { periodo: "Tarde 2", periodoLabel: "Tarde", tipo: "WhatsApp", emoji: "📱" },
  ],
  6: [
    { periodo: "Manhã 1", periodoLabel: "Manhã", tipo: "Ligação", emoji: "📞" },
    { periodo: "Manhã 2", periodoLabel: "Manhã", tipo: "LinkedIn", emoji: "💼" },
    { periodo: "Tarde 1", periodoLabel: "Tarde", tipo: "Ligação", emoji: "📞" },
    { periodo: "Tarde 2", periodoLabel: "Tarde", tipo: "WhatsApp", emoji: "📱" },
  ],
  7: [
    { periodo: "Manhã 1", periodoLabel: "Manhã", tipo: "Email", emoji: "📧" },
    { periodo: "Manhã 2", periodoLabel: "Manhã", tipo: "Ligação", emoji: "📞" },
    { periodo: "Tarde 1", periodoLabel: "Tarde", tipo: "Ligação", emoji: "📞" },
    { periodo: "Tarde 2", periodoLabel: "Tarde", tipo: "Ligação", emoji: "📞" },
  ],
  8: [
    { periodo: "Manhã 1", periodoLabel: "Manhã", tipo: "Email", emoji: "📧" },
    { periodo: "Manhã 2", periodoLabel: "Manhã", tipo: "Ligação", emoji: "📞" },
    { periodo: "Tarde 1", periodoLabel: "Tarde", tipo: "Ligação", emoji: "📞" },
    { periodo: "Tarde 2", periodoLabel: "Tarde", tipo: "Ligação", emoji: "📞" },
  ],
  9: [
    { periodo: "Manhã 1", periodoLabel: "Manhã", tipo: "Ligação", emoji: "📞" },
    { periodo: "Manhã 2", periodoLabel: "Manhã", tipo: "Ligação", emoji: "📞" },
    { periodo: "Tarde 1", periodoLabel: "Tarde", tipo: "WhatsApp", emoji: "📱" },
    { periodo: "Tarde 2", periodoLabel: "Tarde", tipo: "Ligação", emoji: "📞" },
  ],
  10: [
    { periodo: "Manhã 1", periodoLabel: "Manhã", tipo: "Ligação", emoji: "📞" },
    { periodo: "Manhã 2", periodoLabel: "Manhã", tipo: "Email", emoji: "📧" },
    { periodo: "Tarde 1", periodoLabel: "Tarde", tipo: "Email", emoji: "📧" },
    { periodo: "Tarde 2", periodoLabel: "Tarde", tipo: "WhatsApp", emoji: "📱" },
  ],
};

/**
 * Given a date string (YYYY-MM-DD), compute its cycle info.
 * Works by counting working days from the anchor.
 */
export function getCycleDayInfo(dateStr: string): CycleDayInfo | null {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);

  if (!isWorkingDay(target)) {
    return {
      date: dateStr,
      isWorkingDay: false,
      cycleNumber: 0,
      cycleDay: 0,
      group: "A",
      activities: [],
    };
  }

  // Count working days between anchor and target
  const anchor = toDateOnly(ANCHOR_DATE);
  const tgt = toDateOnly(target);
  
  let workingDayOffset = 0;
  
  if (tgt >= anchor) {
    const cur = new Date(anchor);
    while (cur < tgt) {
      cur.setDate(cur.getDate() + 1);
      if (isWorkingDay(cur)) workingDayOffset++;
    }
  } else {
    const cur = new Date(tgt);
    while (cur < anchor) {
      cur.setDate(cur.getDate() + 1);
      if (isWorkingDay(cur)) workingDayOffset--;
    }
    workingDayOffset++; // adjust since anchor is day 0
    workingDayOffset = workingDayOffset - 1;
  }

  // Normalize: anchor = working day index 0 = cycle day 1
  // For dates before anchor, handle negative modulo
  let idx = tgt >= anchor ? workingDayOffset : workingDayOffset;
  
  // Modulo 10 to get cycle day (0-based then +1)
  let cycleDayZero = ((idx % 10) + 10) % 10; // always positive
  const cycleDay = cycleDayZero + 1; // 1-10
  const cycleNumber = Math.floor(idx / 10) + 1;
  
  const group: "A" | "B" = cycleDay % 2 === 1 ? "A" : "B";
  
  const actDefs = CYCLE_ACTIVITIES[cycleDay] || [];
  const activities: CycleActivity[] = actDefs.map(a => ({
    ...a,
    grupo: group,
    descricao: `${a.tipo} Grupo ${group}`,
  }));

  return {
    date: dateStr,
    isWorkingDay: true,
    cycleNumber,
    cycleDay,
    group,
    activities,
  };
}

/**
 * Get cycle info for all days in a month.
 */
export function getMonthCycleData(year: number, month: number): CycleDayInfo[] {
  const result: CycleDayInfo[] = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const info = getCycleDayInfo(dateStr);
    if (info) result.push(info);
  }
  return result;
}

/**
 * Get cycle info for a specific week (Mon-Fri).
 */
export function getWeekCycleData(refDate: Date): CycleDayInfo[] {
  const d = new Date(refDate);
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  
  const result: CycleDayInfo[] = [];
  for (let i = 0; i < 5; i++) {
    const wd = new Date(monday);
    wd.setDate(monday.getDate() + i);
    const dateStr = `${wd.getFullYear()}-${String(wd.getMonth() + 1).padStart(2, "0")}-${String(wd.getDate()).padStart(2, "0")}`;
    const info = getCycleDayInfo(dateStr);
    if (info) result.push(info);
  }
  return result;
}

export function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Check if a given date is a follow-up day.
 * Follow-up happens every 3 working days starting from 2026-03-27.
 */
const FOLLOWUP_ANCHOR = new Date(2026, 2, 27); // March 27, 2026

export function isFollowUpDay(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  if (!isWorkingDay(target)) return false;

  const anchor = toDateOnly(FOLLOWUP_ANCHOR);
  const tgt = toDateOnly(target);

  if (tgt < anchor) return false;

  // Count working days between anchor and target
  let count = 0;
  const cur = new Date(anchor);
  while (cur < tgt) {
    cur.setDate(cur.getDate() + 1);
    if (isWorkingDay(cur)) count++;
  }

  return count % 3 === 0; // every 3 working days (0, 3, 6, 9...)
}

/**
 * Get Pipedrive group lead counts from deal stages.
 */
export function getGroupLeadCounts(deals: Array<{ status: string; pipedrive_stage: string }>): { groupA: number; groupB: number } {
  const groupA = deals.filter(d => d.status === "open" && (d.pipedrive_stage === "Tentando Contato #A" || d.pipedrive_stage === "Contato Realizado #A")).length;
  const groupB = deals.filter(d => d.status === "open" && (d.pipedrive_stage === "Tentando Contato #B" || d.pipedrive_stage === "Contato Realizado #B")).length;
  return { groupA, groupB };
}
