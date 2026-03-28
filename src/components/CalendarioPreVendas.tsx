import { useState, useMemo } from "react";
import { usePlanejamentoMensal } from "@/hooks/usePlanejamento";
import { useChecklistChecks } from "@/hooks/useMetasMensais";
import { useLeads } from "@/hooks/useLeads";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, Mail, Phone, Globe, MessageSquare, HeartCrack, Target, CheckCircle2, X, Sun, Sunset } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AMBER = "hsl(45, 100%, 55%)";
const GREEN = "hsl(160, 100%, 39%)";
const RED = "hsl(0, 72%, 51%)";

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

function formatMesAno(year: number, month: number) {
  return `${String(month + 1).padStart(2, "0")}/${year}`;
}

export function CalendarioPreVendas() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [filter, setFilter] = useState<FilterMode>("Todas");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const mesAno = formatMesAno(year, month);
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: planejamento = [], isLoading } = usePlanejamentoMensal(mesAno);
  const { data: checksAline = [] } = useChecklistChecks("Aline");
  const { data: checksMilena = [] } = useChecklistChecks("Milena");
  const { data: allLeads = [] } = useLeads();

  const allChecks = [...checksAline, ...checksMilena];

  // Milena leads this month
  const milenaLeadsMonth = useMemo(() => {
    return allLeads.filter(l => {
      const name = (l.responsavel_nome || "").toLowerCase();
      if (!name.includes("milena")) return false;
      const d = new Date(l.data_criacao);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
  }, [allLeads, month, year]);

  // Plan indexed by date
  const planByDate = useMemo(() => {
    const map: Record<string, typeof planejamento> = {};
    planejamento.forEach(p => {
      const key = p.data;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [planejamento]);

  // Summary stats
  const summary = useMemo(() => {
    let plannedEmails = 0, plannedCalls = 0, plannedLeads = 0, totalTasks = 0, completedTasks = 0;
    planejamento.forEach(p => {
      const tarefas = p.tarefas_json || {};
      (tarefas.aline_tarefas || []).forEach((t: any) => {
        totalTasks++;
        if (t.tipo === "Email") plannedEmails += t.quantidade || 1;
        if (t.tipo === "Ligação") plannedCalls += t.quantidade || 1;
      });
      (tarefas.milena_tarefas || []).forEach((t: any) => {
        totalTasks++;
        plannedLeads += t.quantidade || 0;
      });
    });
    completedTasks = allChecks.filter(c => c.concluido).length;
    return { plannedEmails, plannedCalls, plannedLeads, milenaLeadsMonth, totalTasks, completedTasks };
  }, [planejamento, allChecks, milenaLeadsMonth]);

  // Nav
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Calendar grid
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

  // Week view data
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const days: string[] = [];
    for (let i = 0; i < 5; i++) {
      const wd = new Date(monday);
      wd.setDate(monday.getDate() + i);
      days.push(wd.toISOString().split("T")[0]);
    }
    return days;
  }, [currentDate]);

  const prevWeek = () => setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000));
  const nextWeek = () => setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000));

  // Filter tasks
  const filterTasks = (alineTasks: any[], milenaTasks: any[], grupo: string | null) => {
    let at = alineTasks || [];
    let mt = milenaTasks || [];
    if (filter === "Aline") mt = [];
    if (filter === "Milena") at = [];
    if (filter === "Grupo A") {
      at = at.filter((t: any) => (t.grupo || grupo) === "A");
      mt = [];
    }
    if (filter === "Grupo B") {
      at = at.filter((t: any) => (t.grupo || grupo) === "B");
      mt = [];
    }
    return { at, mt };
  };

  // Day detail data
  const selectedDayData = useMemo(() => {
    if (!selectedDay) return null;
    const entries = planByDate[selectedDay] || [];
    return entries;
  }, [selectedDay, planByDate]);

  const timeSlots = [
    { label: "08:00 — Manhã 1", period: "Manhã" },
    { label: "09:00 — Manhã 2", period: "Manhã" },
    { label: "14:00 — Tarde 1", period: "Tarde" },
    { label: "15:00 — Tarde 2", period: "Tarde" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted/30 rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-muted/30 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: "📧", label: "Emails este mês", value: summary.plannedEmails, sub: "planejados" },
          { icon: "📞", label: "Ligações este mês", value: summary.plannedCalls, sub: "planejadas" },
          { icon: "🎯", label: "Leads gerados", value: summary.milenaLeadsMonth, sub: `/ ${summary.plannedLeads} meta` },
          { icon: "✅", label: "Tarefas concluídas", value: summary.totalTasks > 0 ? Math.round((summary.completedTasks / summary.totalTasks) * 100) : 0, sub: "%" },
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
             viewMode === "week" ? `${weekDays[0]?.split("-").reverse().join("/")} — ${weekDays[4]?.split("-").reverse().join("/")}` :
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
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: RED }} /> Urgente</span>
        <span>📧 Email</span><span>📱 WhatsApp</span><span>💼 LinkedIn</span><span>📞 Ligação</span><span>💔 Break-up</span><span>🎯 Leads</span>
      </div>

      {/* MONTH VIEW */}
      {viewMode === "month" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
          <div className="grid grid-cols-7 gap-1">
            {dayHeaders.map(d => (
              <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1.5">{d}</div>
            ))}
            {calendarGrid.map((cell, i) => {
              const dayEntries = cell.dateStr ? (planByDate[cell.dateStr] || []) : [];
              const isToday = cell.dateStr === todayStr;
              const allDayTasks: any[] = [];
              let grupo: string | null = null;
              dayEntries.forEach(e => {
                grupo = e.grupo || grupo;
                const { at, mt } = filterTasks(e.tarefas_json?.aline_tarefas, e.tarefas_json?.milena_tarefas, e.grupo);
                at.forEach((t: any) => allDayTasks.push(t));
                mt.forEach((t: any) => allDayTasks.push({ ...t, isMilena: true }));
              });

              return (
                <div key={i}
                  className={`min-h-[80px] rounded-lg p-1.5 transition-all ${
                    cell.date === null ? "" :
                    cell.isWeekend ? "opacity-40" :
                    dayEntries.length > 0 ? "cursor-pointer hover:bg-white/[0.05]" : ""
                  }`}
                  style={{
                    background: cell.isWeekend ? "rgba(255,255,255,0.01)" :
                      grupo === "A" ? "rgba(245,158,11,0.05)" :
                      grupo === "B" ? "rgba(0,200,150,0.05)" : "rgba(255,255,255,0.02)",
                    border: isToday ? `2px solid ${GREEN}` :
                      grupo === "A" ? "1px solid rgba(245,158,11,0.15)" :
                      grupo === "B" ? "1px solid rgba(0,200,150,0.15)" : "1px solid transparent",
                  }}
                  onClick={() => cell.dateStr && !cell.isWeekend && setSelectedDay(cell.dateStr)}
                >
                  {cell.date !== null && (
                    <>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-foreground"}`}>{cell.date}</span>
                        {grupo && !cell.isWeekend && (
                          <span className={`text-[8px] px-1 rounded ${grupo === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                            {grupo === "A" ? "🟡A" : "🟢B"}
                          </span>
                        )}
                      </div>
                      {cell.isWeekend ? (
                        <p className="text-[8px] text-muted-foreground mt-1">Fim de semana</p>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-0.5">
                            {allDayTasks.slice(0, 4).map((t: any, ti: number) => (
                              <span key={ti} className={`text-[7px] px-1 py-0.5 rounded ${typePillColors[t.tipo] || "bg-muted/30 text-muted-foreground"}`}>
                                {typeEmoji[t.tipo] || "📋"}
                              </span>
                            ))}
                            {allDayTasks.length > 4 && (
                              <span className="text-[7px] px-1 py-0.5 rounded bg-muted/30 text-muted-foreground">+{allDayTasks.length - 4}</span>
                            )}
                          </div>
                          {dayEntries.length > 0 && (
                            <div className="mt-1 h-1 rounded-full bg-muted/20 overflow-hidden">
                              <div className="h-full rounded-full" style={{
                                width: "0%", // Would need per-day check data
                                background: GREEN,
                              }} />
                            </div>
                          )}
                        </>
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
            {weekDays.map((wd, wi) => {
              const entries = planByDate[wd] || [];
              const grupo = entries[0]?.grupo;
              const isToday = wd === todayStr;
              const dayNum = wd.split("-")[2];
              const dayName = ["Seg", "Ter", "Qua", "Qui", "Sex"][wi];
              return (
                <div key={wd} className={`text-center py-2 rounded-lg ${isToday ? "bg-primary/10" : ""}`}
                  style={{ borderBottom: isToday ? `2px solid ${GREEN}` : "none" }}>
                  <p className="text-[10px] text-muted-foreground">{dayName}</p>
                  <p className={`text-xs font-medium ${isToday ? "text-primary" : "text-foreground"}`}>{dayNum}</p>
                  {grupo && (
                    <span className={`text-[8px] px-1 rounded ${grupo === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                      {grupo}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Time slots */}
            {timeSlots.map((slot, si) => (
              <>
                <div key={`label-${si}`} className="text-[9px] text-muted-foreground py-2 px-1 border-t border-white/5">
                  {slot.label}
                </div>
                {weekDays.map((wd, wi) => {
                  const entries = planByDate[wd] || [];
                  const grupo = entries[0]?.grupo;
                  const allTasks: any[] = [];
                  entries.forEach(e => {
                    const { at, mt } = filterTasks(e.tarefas_json?.aline_tarefas, e.tarefas_json?.milena_tarefas, e.grupo);
                    at.filter((t: any) => {
                      const p = (t.periodo || "").toLowerCase();
                      return slot.period === "Manhã" ? p.includes("manhã") || p === "manhã" : p.includes("tarde") || p === "tarde";
                    }).forEach((t: any) => allTasks.push(t));
                    if (slot.period === "Manhã" && si === 0) {
                      mt.forEach((t: any) => allTasks.push({ ...t, isMilena: true }));
                    }
                  });

                  return (
                    <div key={`${si}-${wi}`} className="border-t border-white/5 py-1 px-0.5 min-h-[40px]"
                      onClick={() => setSelectedDay(wd)}>
                      {allTasks.map((t: any, ti: number) => (
                        <div key={ti} className="text-[8px] px-1 py-0.5 rounded mb-0.5 cursor-pointer"
                          style={{
                            background: t.isMilena ? "rgba(0,200,150,0.1)" :
                              (t.grupo || grupo) === "A" ? "rgba(245,158,11,0.1)" : "rgba(0,200,150,0.1)",
                            borderLeft: `2px solid ${t.isMilena ? GREEN : (t.grupo || grupo) === "A" ? AMBER : GREEN}`,
                          }}>
                          <span>{typeEmoji[t.tipo] || "📋"} {t.tipo}</span>
                          {t.quantidade > 0 && <span className="text-muted-foreground ml-1">×{t.quantidade}</span>}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </motion.div>
      )}

      {/* DAY VIEW */}
      {viewMode === "day" && (() => {
        const dayStr = currentDate.toISOString().split("T")[0];
        const entries = planByDate[dayStr] || [];
        const grupo = entries[0]?.grupo;
        const allAline: any[] = [];
        const allMilena: any[] = [];
        entries.forEach(e => {
          const { at, mt } = filterTasks(e.tarefas_json?.aline_tarefas, e.tarefas_json?.milena_tarefas, e.grupo);
          at.forEach((t: any) => allAline.push(t));
          mt.forEach((t: any) => allMilena.push(t));
        });
        const manhaTasks = allAline.filter((t: any) => (t.periodo || "").toLowerCase().includes("manhã"));
        const tardeTasks = allAline.filter((t: any) => (t.periodo || "").toLowerCase().includes("tarde"));

        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Day header */}
            <div className="flex items-center gap-3">
              <button onClick={() => setCurrentDate(new Date(currentDate.getTime() - 86400000))}
                className="p-1 rounded hover:bg-white/[0.05] text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentDate(new Date(currentDate.getTime() + 86400000))}
                className="p-1 rounded hover:bg-white/[0.05] text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
              {grupo && (
                <span className={`text-xs px-2 py-0.5 rounded ${grupo === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                  Grupo {grupo}
                </span>
              )}
            </div>

            {/* Aline's Tasks */}
            {(filter === "Todas" || filter === "Aline" || filter === "Grupo A" || filter === "Grupo B") && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">AL</div>
                  Aline — SDR
                </h3>
                {manhaTasks.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-400">MANHÃ</span>
                    </div>
                    <div className="space-y-1.5">
                      {manhaTasks.map((t: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
                          <span>{typeEmoji[t.tipo] || "📋"}</span>
                          <span className="text-xs text-foreground flex-1">{t.tipo} — Grupo {t.grupo || grupo}</span>
                          {t.quantidade > 0 && <span className="text-xs text-amber-400">×{t.quantidade}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {tardeTasks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sunset className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-xs font-semibold text-orange-400">TARDE</span>
                    </div>
                    <div className="space-y-1.5">
                      {tardeTasks.map((t: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
                          <span>{typeEmoji[t.tipo] || "📋"}</span>
                          <span className="text-xs text-foreground flex-1">{t.tipo} — Grupo {t.grupo || grupo}</span>
                          {t.quantidade > 0 && <span className="text-xs text-amber-400">×{t.quantidade}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {manhaTasks.length === 0 && tardeTasks.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tarefa para Aline hoje</p>
                )}
              </div>
            )}

            {/* Milena's Tasks */}
            {(filter === "Todas" || filter === "Milena") && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "hsl(45,80%,45%)" }}>MI</div>
                  Milena — LDR
                </h3>
                {allMilena.length > 0 ? (
                  <div className="space-y-1.5">
                    {allMilena.map((t: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
                        <span>🎯</span>
                        <span className="text-xs text-foreground flex-1">{t.tipo || "Geração de Leads"}</span>
                        {t.quantidade > 0 && <span className="text-xs text-green-400">×{t.quantidade}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tarefa para Milena hoje</p>
                )}
              </div>
            )}

            {entries.length === 0 && (
              <div className="glass-card p-8 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhum planejamento para este dia.</p>
              </div>
            )}
          </motion.div>
        );
      })()}

      {/* Day Detail Dialog (month/week click) */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="bg-background border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              📅 {selectedDay?.split("-").reverse().join("/")}
              {selectedDayData?.[0]?.grupo && (
                <span className={`text-xs px-2 py-0.5 rounded ${selectedDayData[0].grupo === "A" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>
                  Grupo {selectedDayData[0].grupo}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedDayData && selectedDayData.length > 0 ? (
            <div className="space-y-4">
              {/* Aline */}
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">AL</div>
                  Aline — SDR
                </h4>
                <div className="space-y-1">
                  {selectedDayData.flatMap(e => (e.tarefas_json?.aline_tarefas || []).map((t: any, i: number) => (
                    <div key={`a-${i}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
                      <span>{typeEmoji[t.tipo] || "📋"}</span>
                      <div className="flex-1">
                        <p className="text-xs text-foreground">{t.tipo}</p>
                        {t.descricao && <p className="text-[10px] text-muted-foreground">{t.descricao}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{t.periodo}</span>
                      {t.quantidade > 0 && <span className="text-xs text-amber-400">×{t.quantidade}</span>}
                    </div>
                  )))}
                </div>
              </div>

              {/* Milena */}
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "hsl(45,80%,45%)" }}>MI</div>
                  Milena — LDR
                </h4>
                <div className="space-y-1">
                  {selectedDayData.flatMap(e => (e.tarefas_json?.milena_tarefas || []).map((t: any, i: number) => (
                    <div key={`m-${i}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
                      <span>🎯</span>
                      <div className="flex-1">
                        <p className="text-xs text-foreground">{t.tipo || "Geração de Leads"}</p>
                        {t.descricao && <p className="text-[10px] text-muted-foreground">{t.descricao}</p>}
                      </div>
                      {t.quantidade > 0 && <span className="text-xs text-green-400">×{t.quantidade}</span>}
                    </div>
                  )))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhuma tarefa planejada para este dia.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
