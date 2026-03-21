import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { TickerBar } from "@/components/TickerBar";

export function AppLayout() {
  return (
    <div className="flex w-full min-h-screen">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TickerBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
