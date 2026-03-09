import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppNavigation } from "./AppNavigation";
import { BottomNavigation } from "./BottomNavigation";

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
