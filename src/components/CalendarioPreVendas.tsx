import { useState, useMemo } from "react";
import { useChecklistChecks } from "@/hooks/useMetasMensais";
import { useCustomActivitiesForMonth } from "@/hooks/useCustomActivities";
import { usePipedrive } from "@/hooks/usePipedrive";
import { useLeads } from "@/hooks/useLeads";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, Mail, Phone, Globe, MessageSquare, Sun, Sunset, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getCycleDayInfo, getMonthCycleData, getWeekCycleData,
  todaySP, CycleDayInfo, CycleActivity, formatDateBR, getGroupLeadCounts,
} from "@/lib/cadenceEngine";

const AMBER = "hsl(45, 100%, 55%)";
const GREEN = "hsl(160, 100%, 39%)";

const typeEmoji: Record<string, string> = {
  Email: "📧", WhatsApp: "📱", LinkedIn: "💼", Ligação: "📞", "Geração de Leads": "🎯",
};

const typePillColors: Record<string, string> = {
  Email: "bg-amber-500/20 text-amber-400",
  WhatsApp: "bg-blue-500/20 text-blue-400",
  LinkedIn: "bg-indigo-500/20 text-indigo-400",
  Ligação: "bg-purple-500/20 text-purple-400",
  "Geração de Leads": "bg-teal-500/20 text-teal-400",
};

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const dayHeaders = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type ViewMode = "month" | "week" | "day";
type FilterMode = "Todas" | "Aline" | "Milena" | "Grupo A" | "Grupo B";

interface Props {
  defaultFilter?: FilterMode;
}

export function CalendarioPreVendas({ defaultFilter = "Todas" }: Props) {
  const today = todaySP();
  const [currentDate, setCurrentDate] = useState(() => {
    const [y, m, d] = today.split("-").map(Number);
    return new Date(y, m - 1, d);
  });
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [filter, setFilter] = useState<FilterMode>(defaultFilter);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data: checksAline = [] } = useChecklistChecks("Aline");
  const { data: checksMilena = [] } = useChecklistChecks("Milena");
  const { data: allLeads = [] } = useLeads();
  const { deals } = usePipedrive();
  const { data: customActivitiesMonth = [] } = useCustomActivitiesForMonth(year, month);
  const allChecks = [...checksAline, ...checksMilena];
  const leadCounts = useMemo(() => getGroupLeadCounts(deals), [deals]);

  // Month cycle data
  const monthData = useMemo(() => getMonthCycleData(year, month), [year, month]);
  const monthDataMap = useMemo(() => {
    const m: Record<string, CycleDayInfo> = {};
    monthData.forEach(d => { m[d.date] = d; });
    return m;
  }, [monthData]);

  // Week data
  const weekData = useMemo(() => getWeekCycleData(currentDate), [currentDate]);

  // Milena leads this month
  const milenaLeadsMonth = useMemo(() => {
    return allLeads.filter(l => {
      const name = (l.responsavel_nome || "").toLowerCase();
      if (!name.includes("milena")) return false;
      const d = new Date(l.data_criacao);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
  }, [allLeads, month, year]);

  // Summary stats from cycle engine
  const summary = useMemo(() => {
    const workingDays = monthData.filter(d => d.isWorkingDay);
    let emails = 0, calls = 0, totalActivities = 0;
    workingDays.forEach(d => {
      d.activities.forEach(a => {
        totalActivities++;
        if (a.tipo === "Email") emails++;
        if (a.tipo === "Ligação") calls++;
      });
    });
    const completedTasks = allChecks.filter(c => c.concluido).length;
    return { emails, calls, milenaLeadsMonth, totalActivities, completedTasks };
  }, [monthData, allChecks, milenaLeadsMonth]);

  // Nav
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevWeek = () => setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000));
  const nextWeek = () => setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000));

  // Calendar grid for month view
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startPad = firstDay.getDay() - 1;
    if (startPad < 0) startPad = 6;

    const grid: Array<{ date: number | null; dateStr: string; isWeekend: boolean }> = [];
    for (let i = 0; i < startPad; i++) grid.push({ date: null, dateStr: "", isWeekend: false });
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dt = new Date(year, month, d);
      const dow = dt.getDay();
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      grid.push({ date: d, dateStr, isWeekend: dow === 0 || dow === 6 });
    }
    return grid;
  }, [year, month]);

  // Filter activities
  const filterActivities = (info: CycleDayInfo, forPerson?: "Aline" | "Milena"): CycleActivity[] => {
    if (!info.isWorkingDay) return [];
    const person = forPerson || filter;
    if (person === "Milena") return []; // Milena has lead gen, not cadence activities
    if (person === "Aline") return info.activities;
    if (filter === "Grupo A") return info.activities.filter(a => a.grupo === "A");
    if (filter === "Grupo B") return info.activities.filter(a => a.grupo === "B");
    return info.activities; // "Todas"
  };

  // Get custom activities for a specific date
  const getCustomActivitiesForDate = (dateStr: string) => {
    let filtered = customActivitiesMonth.filter(ca => ca.data === dateStr);
    if (filter === "Aline") filtered = filtered.filter(ca => ca.responsavel === "Aline");
    else if (filter === "Milena") filtered = filtered.filter(ca => ca.responsavel === "Milena");
    return filtered;
  };

  // Selected day info
  const selectedDayInfo = useMemo(() => {
    if (!selectedDay) return null;
    return getCycleDayInfo(selectedDay);
  }, [selectedDay]);

  const timeSlots = ["Manhã 1", "Manhã 2", "Tarde 1", "Tarde 2"];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: "📧", label: "Emails este mês", value: summary.emails, sub: "planejados" },
          { icon: "📞", label: "Ligações este mês", value: summary.calls, sub: "planejadas" },
          { icon: "🎯", label: "Leads gerados", value: summary.milenaLeadsMonth, sub: "meta" },
          { icon: "✅", label: "Tarefas concluídas", value: summary.totalActivities > 0 ? Math.round((summary.completedTasks / summary.totalActivities) * 100) : 0, sub: "%" },
        ].map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{c.icon}</span>
              <span className="text-[10px] text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{c.value} <span className="text-xs text-muted-foreground font-normal">{c.sub}</span></p>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={viewMode === "month" ? prevMonth : prevWeek}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold text-foreground min-w-[140px] text-center">
            {viewMode === "month" ? `${monthNames[month]} ${year}` :
             viewMode === "week" ? `${formatDateBR(weekData[0]?.date || "")} — ${formatDateBR(weekData[4]?.date || "")}` :
             currentDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h2>
          <button onClick={viewMode === "month" ? nextMonth : nextWeek}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {(["month", "week", "day"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === v ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground hover:text-foreground"}`}>
              {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {(["Todas", "Aline", "Milena", "Grupo A", "Grupo B"] as FilterMode[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${filter === f ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: AMBER }} /> Grupo A</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: GREEN }} /> Grupo B</span>
        <span>📧 Email</span><span>📱 WhatsApp</span><span>💼 LinkedIn</span><span>📞 Ligação</span><span>🎯 Leads</span>
      </div>

      {/* MONTH VIEW */}
      {viewMode === "month" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
          <div className="grid grid-cols-7 gap-1">
            {dayHeaders.map(d => (
              <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1.5">{d}</div>
            ))}
            {calendarGrid.map((cell, i) => {
              const info = cell.dateStr ? monthDataMap[cell.dateStr] : null;
              const isToday = cell.dateStr === today;
              const acts = info ? filterActivities(info) : [];

              return (
                <div key={i}
                  className={`min-h-[80px] rounded-lg p-1.5 transition-all ${
                    cell.date === null ? "" :
                    cell.isWeekend ? "opacity-40" :
                    "cursor-pointer hover:bg-white/[0.05]"
                  }`}
                  style={{
                    background: cell.isWeekend || !info?.isWorkingDay ? "rgba(255,255,255,0.01)" :
                      info?.group === "A" ? "rgba(245,158,11,0.05)" :
                      info?.group === "B" ? "rgba(0,200,150,0.05)" : "rgba(255,255,255,0.02)",
                    border: isToday ? `2px solid ${GREEN}` :
                      info?.group === "A" && info?.isWorkingDay ? "1px solid rgba(245,158,11,0.15)" :
                      info?.group === "B" && info?.isWorkingDay ? "1px solid rgba(0,200,150,0.15)" : "1px solid transparent",
                  }}
                  onClick={() => cell.dateStr && !cell.isWeekend && setSelectedDay(cell.dateStr)}
                >
                  {cell.date !== null && (
                    <>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-foreground"}`}>{cell.date}</span>
                        {info?.isWorkingDay && (
                          <span className={`text-[7px] px-1 rounded ${info.group === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                            C{info.cycleNumber}·D{info.cycleDay}
                          </span>
                        )}
                      </div>
                      {info?.isWorkingDay && (
                        <div className="flex items-center gap-0.5 mb-0.5">
                          <span className={`text-[7px] px-1 rounded ${info.group === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                            {info.group === "A" ? "🟡A" : "🟢B"}
                          </span>
                        </div>
                      )}
                      {cell.isWeekend ? (
                        <p className="text-[8px] text-muted-foreground mt-1">Fim de semana</p>
                      ) : (
                        <div className="flex flex-wrap gap-0.5">
                          {acts.slice(0, 4).map((a, ai) => (
                            <span key={ai} className={`text-[7px] px-1 py-0.5 rounded ${typePillColors[a.tipo] || "bg-muted/30 text-muted-foreground"}`}>
                              {a.emoji}
                            </span>
                          ))}
                          {acts.length > 4 && (
                            <span className="text-[7px] px-1 py-0.5 rounded bg-muted/30 text-muted-foreground">+{acts.length - 4}</span>
                          )}
                          {(filter === "Milena" || filter === "Todas") && info?.isWorkingDay && (
                            <span className="text-[7px] px-1 py-0.5 rounded bg-teal-500/20 text-teal-400">🎯</span>
                          )}
                          {getCustomActivitiesForDate(cell.dateStr).map((ca, ci) => (
                            <span key={`ca-${ci}`} className="text-[7px] px-1 py-0.5 rounded bg-white/10 text-white/70">⭐</span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* WEEK VIEW */}
      {viewMode === "week" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
          <div className="grid grid-cols-6 gap-1">
            {/* Header row */}
            <div className="text-[10px] text-muted-foreground font-medium py-2 px-1">Horário</div>
            {weekData.map((info, wi) => {
              const isToday = info.date === today;
              const dayNum = info.date.split("-")[2];
              const dayName = ["Seg", "Ter", "Qua", "Qui", "Sex"][wi];
              return (
                <div key={info.date} className={`text-center py-2 rounded-lg ${isToday ? "bg-primary/10" : ""}`}
                  style={{ borderBottom: isToday ? `2px solid ${GREEN}` : "none" }}>
                  <p className="text-[10px] text-muted-foreground">{dayName}</p>
                  <p className={`text-xs font-medium ${isToday ? "text-primary" : "text-foreground"}`}>{dayNum}</p>
                  {info.isWorkingDay && (
                    <>
                      <span className={`text-[7px] px-1 rounded ${info.group === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                        {info.group === "A" ? "🟡A" : "🟢B"}
                      </span>
                      <p className="text-[7px] text-muted-foreground">C{info.cycleNumber}·D{info.cycleDay}</p>
                    </>
                  )}
                </div>
              );
            })}

            {/* Time slots */}
            {timeSlots.map((slot, si) => (
              <div key={slot} className="contents">
                <div className="text-[9px] text-muted-foreground py-2 px-1 border-t border-white/5">
                  {slot === "Manhã 1" ? "08:00 — Manhã 1" : slot === "Manhã 2" ? "09:00 — Manhã 2" : slot === "Tarde 1" ? "14:00 — Tarde 1" : "15:00 — Tarde 2"}
                </div>
                {weekData.map((info) => {
                  const activity = info.activities.find(a => a.periodo === slot);
                  const show = activity && (filter === "Todas" || filter === "Aline" ||
                    (filter === "Grupo A" && activity.grupo === "A") ||
                    (filter === "Grupo B" && activity.grupo === "B"));

                  return (
                    <div key={`${slot}-${info.date}`} className="border-t border-white/5 py-1 px-0.5 min-h-[40px]"
                      onClick={() => setSelectedDay(info.date)}>
                      {show && activity && (
                        <div className="text-[8px] px-1 py-1 rounded cursor-pointer"
                          style={{
                            background: activity.grupo === "A" ? "rgba(245,158,11,0.1)" : "rgba(0,200,150,0.1)",
                            borderLeft: `2px solid ${activity.grupo === "A" ? AMBER : GREEN}`,
                          }}>
                          <span>{activity.emoji} {activity.tipo}</span>
                          <span className="block text-muted-foreground">Grupo {activity.grupo}</span>
                        </div>
                      )}
                      {filter === "Milena" && si === 0 && info.isWorkingDay && (
                        <div className="text-[8px] px-1 py-1 rounded" style={{ background: "rgba(0,200,150,0.1)", borderLeft: `2px solid ${GREEN}` }}>
                          <span>🎯 Geração Leads</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* DAY VIEW */}
      {viewMode === "day" && (() => {
        const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
        const info = getCycleDayInfo(dayStr);

        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Day header */}
            <div className="flex items-center gap-3">
              <button onClick={() => setCurrentDate(new Date(currentDate.getTime() - 86400000))}
                className="p-1 rounded hover:bg-white/[0.05] text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentDate(new Date(currentDate.getTime() + 86400000))}
                className="p-1 rounded hover:bg-white/[0.05] text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
              {info?.isWorkingDay && (
                <>
                  <span className={`text-xs px-2 py-0.5 rounded ${info.group === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                    Grupo {info.group}
                  </span>
                  <span className="text-xs text-muted-foreground">Ciclo {info.cycleNumber} — Dia {info.cycleDay}</span>
                </>
              )}
            </div>

            {/* Aline's Tasks */}
            {(filter === "Todas" || filter === "Aline" || filter === "Grupo A" || filter === "Grupo B") && info?.isWorkingDay && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">AL</div>
                  Aline — SDR
                </h3>
                {(() => {
                  const acts = filterActivities(info);
                  const manha = acts.filter(a => a.periodoLabel === "Manhã");
                  const tarde = acts.filter(a => a.periodoLabel === "Tarde");

                  return (
                    <>
                      {manha.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Sun className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-semibold text-amber-400">MANHÃ</span>
                          </div>
                          <div className="space-y-1.5">
                            {manha.map((a, i) => {
                              const lc = a.grupo === "A" ? leadCounts.groupA : leadCounts.groupB;
                              return (
                                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
                                  <span>{a.emoji}</span>
                                  <span className="text-xs text-foreground flex-1">{a.descricao} <span className="text-muted-foreground text-[10px]">({lc > 0 ? `${lc} leads` : "—"})</span></span>
                                  <span className="text-[8px] text-muted-foreground">{a.periodo}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {tarde.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Sunset className="w-3.5 h-3.5 text-orange-400" />
                            <span className="text-xs font-semibold text-orange-400">TARDE</span>
                          </div>
                          <div className="space-y-1.5">
                            {tarde.map((a, i) => {
                              const lc = a.grupo === "A" ? leadCounts.groupA : leadCounts.groupB;
                              return (
                                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
                                  <span>{a.emoji}</span>
                                  <span className="text-xs text-foreground flex-1">{a.descricao} <span className="text-muted-foreground text-[10px]">({lc > 0 ? `${lc} leads` : "—"})</span></span>
                                  <span className="text-[8px] text-muted-foreground">{a.periodo}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {manha.length === 0 && tarde.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tarefa para Aline hoje</p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Milena's Tasks */}
            {(filter === "Todas" || filter === "Milena") && info?.isWorkingDay && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "hsl(45,80%,45%)" }}>MI</div>
                  Milena — LDR
                </h3>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
                  <span>🎯</span>
                  <span className="text-xs text-foreground flex-1">Geração de Leads</span>
                </div>
              </div>
            )}

            {/* Custom Activities */}
            {(() => {
              const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
              const customs = getCustomActivitiesForDate(dayStr);
              if (customs.length === 0) return null;
              return (
                <div className="glass-card p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-white/70" /> Atividades Personalizadas
                  </h3>
                  <div className="space-y-1.5">
                    {customs.map(ca => (
                      <div key={ca.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <span>⭐</span>
                        <span className="text-xs text-foreground flex-1">{ca.titulo}</span>
                        <span className="text-[10px] text-muted-foreground">{ca.responsavel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {!info?.isWorkingDay && (
              <div className="glass-card p-8 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Fim de semana — sem atividades.</p>
              </div>
            )}
          </motion.div>
        );
      })()}

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="bg-background border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              📅 {selectedDay ? formatDateBR(selectedDay) : ""}
              {selectedDayInfo?.isWorkingDay && (
                <>
                  <span className={`text-xs px-2 py-0.5 rounded ${selectedDayInfo.group === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                    Grupo {selectedDayInfo.group}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Ciclo {selectedDayInfo.cycleNumber} · Dia {selectedDayInfo.cycleDay}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedDayInfo?.isWorkingDay ? (
            <div className="space-y-4">
              {/* Aline */}
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">AL</div>
                  Aline — SDR
                </h4>
                <div className="space-y-1">
                  {selectedDayInfo.activities.map((a, i) => {
                    const lc = a.grupo === "A" ? leadCounts.groupA : leadCounts.groupB;
                    return (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
                        <span>{a.emoji}</span>
                        <div className="flex-1">
                          <p className="text-xs text-foreground">{a.descricao} <span className="text-muted-foreground text-[10px]">({lc > 0 ? `${lc} leads` : "—"})</span></p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{a.periodo}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Milena */}
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "hsl(45,80%,45%)" }}>MI</div>
                  Milena — LDR
                </h4>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
                  <span>🎯</span>
                  <p className="text-xs text-foreground">Geração de Leads</p>
                </div>
              </div>

              {/* Custom Activities */}
              {selectedDay && getCustomActivitiesForDate(selectedDay).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-white/70" /> Personalizadas
                  </h4>
                  <div className="space-y-1">
                    {getCustomActivitiesForDate(selectedDay).map(ca => (
                      <div key={ca.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <span>⭐</span>
                        <p className="text-xs text-foreground flex-1">{ca.titulo}</p>
                        <span className="text-[10px] text-muted-foreground">{ca.responsavel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">Fim de semana — sem atividades.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
