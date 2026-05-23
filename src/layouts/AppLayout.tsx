import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { TickerBar } from "@/components/TickerBar";
import { AuroraBackground } from "@/components/ui/aurora-background";

export function AppLayout() {
  return (
    <div className="flex w-full min-h-screen relative">
      {/* Aurora animated background */}
      <AuroraBackground
        showRadialGradient
        className="!fixed inset-0 !h-screen w-screen z-0 !bg-transparent"
      >
        <></>
      </AuroraBackground>


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
