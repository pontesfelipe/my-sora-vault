import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppNavigation } from "./AppNavigation";
import { BottomNavigation } from "./BottomNavigation";
import { GlobalSearch } from "./GlobalSearch";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <AppNavigation />
        </div>
        
        <main className="flex-1 overflow-auto w-full pb-20 md:pb-0">
          {/* Desktop header */}
          <div className="sticky top-0 z-10 hidden md:flex items-center justify-between h-14 border-b border-borderSubtle bg-background px-4">
            <GlobalSearch />
          </div>
          
          {/* Mobile header with search */}
          <div className="sticky top-0 z-10 flex md:hidden items-center gap-3 h-14 border-b border-borderSubtle bg-background px-4">
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
  );
}
