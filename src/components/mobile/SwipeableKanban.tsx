import { ReactNode, useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  stages: { id: string; nome: string; cor?: string | null }[];
  renderColumn: (stageId: string) => ReactNode;
}

/**
 * Mobile one-column-per-screen kanban with horizontal scroll-snap.
 * Each column is 100% viewport wide; user swipes to navigate stages.
 */
export function SwipeableKanban({ stages, renderColumn }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setIndex(i);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const go = (delta: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(stages.length - 1, index + delta));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  const current = stages[index];

  return (
    <div className="flex flex-col gap-2">
      {/* Pager indicator */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center gap-1 min-w-0 px-2">
          <div className="flex items-center gap-2 min-w-0">
            {current?.cor && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: current.cor, boxShadow: `0 0 8px ${current.cor}80` }} />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground truncate">{current?.nome}</span>
          </div>
          <div className="flex gap-1">
            {stages.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${i === index ? "w-4 bg-primary" : "w-1 bg-white/20"}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">{index + 1} de {stages.length}</span>
        </div>
        <button
          onClick={() => go(1)}
          disabled={index === stages.length - 1}
          className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Snap scroller */}
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto snap-x snap-mandatory -mx-3 px-3 gap-3 pb-4 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory" }}
      >
        {stages.map((s) => (
          <div
            key={s.id}
            className="snap-center flex-shrink-0"
            style={{ width: "calc(100vw - 2rem)" }}
          >
            {renderColumn(s.id)}
          </div>
        ))}
      </div>
    </div>
  );
}
