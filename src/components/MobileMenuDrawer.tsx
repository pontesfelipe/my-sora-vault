import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, HelpCircle, Info, Shield, Lightbulb, LogOut, Bot } from "lucide-react";
import { motion } from "framer-motion";
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
import { useWatchData } from "@/hooks/useWatchData";
import { useCollection } from "@/contexts/CollectionContext";
import watchHero from "@/assets/watch-hero.jpg";

interface MobileMenuDrawerProps {
  children: React.ReactNode;
}

export function MobileMenuDrawer({ children }: MobileMenuDrawerProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { selectedCollectionId } = useCollection();
  const { watches } = useWatchData(selectedCollectionId);

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
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="text-lg font-semibold text-textMain">More</DrawerTitle>
        </DrawerHeader>

        {/* Mini watch showcase */}
        {watches.length > 0 && (
          <div className="px-4 pb-4">
            <div className="relative rounded-2xl p-3 bg-gradient-to-b from-[hsl(var(--watch-case-frame-start))] to-[hsl(var(--watch-case-frame-end))] shadow-[0_4px_20px_-4px_hsl(var(--watch-case-shadow))]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-2xl" />
              <div className="rounded-xl bg-gradient-to-br from-[hsl(var(--watch-velvet-start))] to-[hsl(var(--watch-velvet-end))] p-3">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {watches.slice(0, 6).map((watch, index) => (
                    <motion.button
                      key={watch.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      onClick={() => { navigate(`/watch/${watch.id}`); setOpen(false); }}
                      className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-[hsl(var(--watch-cushion-glow))] p-1 hover:ring-2 hover:ring-primary/50 transition-all"
                    >
                      <img
                        src={watch.ai_image_url || watchHero}
                        alt={`${watch.brand} ${watch.model}`}
                        className="w-full h-full object-cover rounded-md"
                      />
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
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
