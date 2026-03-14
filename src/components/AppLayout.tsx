import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppNavigation } from "./AppNavigation";
import { BottomNavigation } from "./BottomNavigation";
import { GlobalSearch } from "./GlobalSearch";
import { WristCheckProvider } from "@/contexts/WristCheckContext";
import { WristCheckDialog } from "./WristCheckDialog";
import { logAccess } from "@/utils/accessLogging";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();

  useEffect(() => {
    logAccess('page_view', location.pathname);
  }, [location.pathname]);

  return (
    <WristCheckProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          {/* Desktop sidebar - hidden on mobile */}
          <div className="hidden md:block">
            <AppNavigation />
          </div>
          
          <main className="flex-1 overflow-auto w-full pb-20 md:pb-0">
            {/* Desktop header */}
            <div className="sticky top-0 z-10 hidden md:flex items-center justify-between h-14 border-b border-borderSubtle bg-background/95 backdrop-blur-lg px-4">
              <GlobalSearch />
            </div>
            
            {/* Mobile header with search */}
            <div className="sticky top-0 z-10 flex md:hidden items-center gap-3 min-h-14 border-b border-borderSubtle bg-background/95 backdrop-blur-lg px-4 pt-[env(safe-area-inset-top)]">
              <GlobalSearch />
            </div>
            
            <div className="p-4 md:p-6 max-w-[1200px] mx-auto w-full">
              {children}
            </div>
          </main>
          
          {/* Mobile bottom navigation */}
          <BottomNavigation />
        </div>
      </SidebarProvider>
      
      {/* Global Wrist Check Dialog */}
      <WristCheckDialog />
    </WristCheckProvider>
  );
}
