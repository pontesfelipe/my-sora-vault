import { Home, Users, User, Watch, BookHeart, Shield, Settings, HelpCircle, Info, Lightbulb, Bot, ClipboardList, BarChart3 } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SubmitFeedbackDialog } from "@/components/SubmitFeedbackDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialNotifications } from "@/hooks/useSocialNotifications";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AppNavigation() {
  const { open } = useSidebar();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, isAdmin, signOut } = useAuth();
  const { totalCount } = useSocialNotifications();

  const mainNavItems = [
    { title: t("nav.home"), url: "/", icon: Home },
    { title: t("nav.canvas"), url: "/canvas", icon: BarChart3 },
    { title: t("nav.feed"), url: "/feed", icon: Users },
    { title: t("nav.profile"), url: "/profile", icon: User },
  ];

  const utilityNavItems = [
    { title: t("nav.vaultAssistant"), url: "/vault-pal", icon: Bot },
    { title: t("nav.settings"), url: "/settings", icon: Settings },
    { title: t("nav.faq"), url: "/faq", icon: HelpCircle },
    { title: t("nav.about"), url: "/about", icon: Info },
    ...(isAdmin ? [{ title: t("nav.admin"), url: "/admin", icon: Shield }] : []),
  ];

  return (
    <Sidebar className="border-sidebar-border bg-sidebar" variant="sidebar" collapsible="icon">
      <SidebarContent className="flex flex-col h-full">
        <SidebarGroup className="flex-1">
          <div className={`mb-6 ${open ? "px-4" : "px-2"} pt-6 transition-all duration-200 flex items-center gap-2`}>
            <img src={logoImg} alt="Luxury Vault" className="h-8 w-8 rounded-xl object-contain" />
            {open && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-textSoft">Luxury Vault</div>
                <div className="text-xs text-textMuted">{t("nav.watchCollectionStudio")}</div>
              </div>
            )}
          </div>
          <SidebarMenu className="space-y-1 px-2">
            {mainNavItems.map((item) => {
              const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
              const showBadge = item.url === "/feed" && totalCount > 0;
              
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <NavLink
                      to={item.url}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors relative ${
                        isActive ? "bg-accentSubtle text-textMain" : "text-textMuted hover:bg-surfaceMuted hover:text-textMain"
                      }`}
                      activeClassName="bg-accentSubtle text-textMain"
                    >
                      <div className="relative">
                        <item.icon className="h-5 w-5" />
                        {showBadge && !open && (
                          <Badge className="absolute -top-2 -right-2 h-4 min-w-4 flex items-center justify-center text-[10px] p-0 bg-accent text-accent-foreground">
                            {totalCount > 9 ? "9+" : totalCount}
                          </Badge>
                        )}
                      </div>
                      {open && (
                        <span className="flex items-center gap-2">
                          {item.title}
                          {showBadge && (
                            <Badge className="h-5 min-w-5 flex items-center justify-center text-xs p-0 bg-accent text-accent-foreground">
                              {totalCount > 99 ? "99+" : totalCount}
                            </Badge>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="bg-accentSubtle/30 border-t border-accent/20 px-2 py-3">
        <SidebarMenu className="space-y-1">
          {user && (
            <SidebarMenuItem>
              <SubmitFeedbackDialog>
                <SidebarMenuButton
                  className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors text-textMuted hover:bg-surfaceMuted hover:text-textMain ${!open ? "justify-center" : ""}`}
                >
                  <Lightbulb className="h-5 w-5" />
                  {open && <span>{t("nav.sendFeedback")}</span>}
                </SidebarMenuButton>
              </SubmitFeedbackDialog>
            </SidebarMenuItem>
          )}
          {utilityNavItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <NavLink
                    to={item.url}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                      isActive ? "bg-accentSubtle text-textMain" : "text-textMuted hover:bg-surfaceMuted hover:text-textMain"
                    }`}
                    activeClassName="bg-accentSubtle text-textMain"
                  >
                    <item.icon className="h-5 w-5" />
                    {open && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
        
        {user && open && (
          <div className="mt-2 px-3">
            <p className="text-xs text-sidebar-foreground truncate mb-2">{user.email}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground px-0"
            >
              {t("nav.signOut")}
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
