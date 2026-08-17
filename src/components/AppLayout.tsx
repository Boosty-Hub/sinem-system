import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import BoostySupport from "./BoostySupport";
import NotificationCenter from "./NotificationCenter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const AppLayout = () => {
  const location = useLocation();
  const isConfig = location.pathname.startsWith("/configuracion");

  if (isConfig) {
    return <Outlet />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-screen overflow-auto">
          <header className="h-14 flex items-center justify-between border-b border-border/60 px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="flex items-center gap-2">
              <BoostySupport />
              <NotificationCenter />
            </div>
          </header>
          <div className="flex-1 p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
