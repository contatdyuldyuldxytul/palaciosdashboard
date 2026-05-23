import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { TickerBar } from "@/components/TickerBar";
import { AuroraBackground } from "@/components/ui/aurora-background";

export function AppLayout() {
  return (
    <div className="flex w-full min-h-screen relative">
      {/* Animated background */}
      <div className="glass-bg-scene" />
      <div className="glass-bg-scene">
        <div className="glass-blob-3" />
      </div>

      {/* Floating particles */}
      <div className="glass-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="glass-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${12 + Math.random() * 18}s`,
              animationDelay: `${Math.random() * 10}s`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
            }}
          />
        ))}
      </div>

      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <TickerBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
