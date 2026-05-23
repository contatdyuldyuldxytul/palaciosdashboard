import { Outlet } from "react-router-dom";
import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { TickerBar } from "@/components/TickerBar";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { MobileDrawer } from "@/components/mobile/MobileDrawer";
import { MobileCrmSubnav } from "@/components/mobile/MobileCrmSubnav";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout() {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex w-full min-h-screen relative">
      <AuroraBackground
        showRadialGradient
        className={`!fixed inset-0 !h-screen w-screen z-0 !bg-transparent ${isMobile ? "opacity-50" : ""}`}
      >
        <></>
      </AuroraBackground>

      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile header */}
        <MobileHeader onOpenDrawer={() => setDrawerOpen(true)} />

        {/* Ticker — hide on mobile to save vertical space */}
        <div className="hidden md:block">
          <TickerBar />
        </div>

        {/* Mobile CRM subnav (only on /crm/*) */}
        <MobileCrmSubnav />

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav onOpenMore={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
