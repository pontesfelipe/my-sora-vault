import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, HelpCircle, Info, Shield, Lightbulb, LogOut, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { SubmitFeedbackDialog } from "@/components/SubmitFeedbackDialog";
import { useAuth } from "@/contexts/AuthContext";
import { triggerHaptic } from "@/utils/haptics";

interface MobileMenuDrawerProps {
  children: React.ReactNode;
}

export function MobileMenuDrawer({ children }: MobileMenuDrawerProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  const menuItems = [
    { title: "Vault Assistant", url: "/vault-pal", icon: Bot },
    { title: "Settings", url: "/settings", icon: Settings },
    { title: "FAQ", url: "/faq", icon: HelpCircle },
    { title: "About", url: "/about", icon: Info },
    ...(isAdmin ? [{ title: "Admin", url: "/admin", icon: Shield }] : []),
  ];

  const handleNavigation = (url: string) => {
    triggerHaptic('selection');
    navigate(url);
    setOpen(false);
  };

  const handleSignOut = async () => {
    triggerHaptic('medium');
    await signOut();
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="pb-safe">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg font-semibold text-textMain">More</DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-6 space-y-1">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.url;
            return (
              <motion.button
                key={item.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                onClick={() => handleNavigation(item.url)}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-base transition-colors touch-target ${
                  isActive
                    ? "bg-accentSubtle text-textMain font-medium"
                    : "text-textMuted hover:bg-surfaceMuted hover:text-textMain active:bg-surfaceMuted"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </motion.button>
            );
          })}

          {user && (
            <SubmitFeedbackDialog>
              <button
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-base transition-colors touch-target text-textMuted hover:bg-surfaceMuted hover:text-textMain active:bg-surfaceMuted"
              >
                <Lightbulb className="h-5 w-5" />
                <span>Send Feedback</span>
              </button>
            </SubmitFeedbackDialog>
          )}

          {user && (
            <div className="pt-4 mt-4 border-t border-borderSubtle">
              <p className="px-4 text-sm text-textMuted truncate mb-2">{user.email}</p>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-base transition-colors touch-target text-destructive hover:bg-destructive/10 active:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
