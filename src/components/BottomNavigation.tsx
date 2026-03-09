import { Home, Clock, Users, User, Menu, BarChart3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { triggerHaptic } from "@/utils/haptics";
import { useSocialNotifications } from "@/hooks/useSocialNotifications";
import { Badge } from "@/components/ui/badge";
import { MobileMenuDrawer } from "@/components/MobileMenuDrawer";

export function BottomNavigation() {
  const location = useLocation();
  const { t } = useTranslation();
  const { totalCount } = useSocialNotifications();

  const navItems = [
    { title: t("nav.home"), url: "/", icon: Home },
    { title: t("nav.canvas"), url: "/canvas", icon: BarChart3 },
    { title: t("nav.log"), url: "/log", icon: Clock },
    { title: t("nav.feed"), url: "/feed", icon: Users },
    { title: t("nav.profile"), url: "/profile", icon: User },
  ];

  const handleNavClick = () => {
    triggerHaptic('selection');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-borderSubtle md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = item.url === "/" 
            ? location.pathname === "/" 
            : location.pathname.startsWith(item.url);
          const showBadge = item.url === "/feed" && totalCount > 0;
          return (
            <NavLink
              key={item.url}
              to={item.url}
              onClick={handleNavClick}
              className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors touch-target ${
                isActive ? "text-accent" : "text-textMuted"
              }`}
              activeClassName="text-accent"
            >
              <div className="relative">
                <item.icon className={`h-6 w-6 mb-1 ${isActive ? "text-accent" : ""}`} />
                {showBadge && (
                  <Badge className="absolute -top-1 -right-2 h-4 min-w-4 flex items-center justify-center text-[10px] p-0 bg-accent text-accent-foreground">
                    {totalCount > 9 ? "9+" : totalCount}
                  </Badge>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "text-accent" : ""}`}>
                {item.title}
              </span>
            </NavLink>
          );
        })}
        
        <MobileMenuDrawer>
          <button
            onClick={() => triggerHaptic('selection')}
            className="flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors touch-target text-textMuted"
            aria-label="More options"
          >
            <Menu className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-medium">{t("nav.more")}</span>
          </button>
        </MobileMenuDrawer>
      </div>
    </nav>
  );
}
