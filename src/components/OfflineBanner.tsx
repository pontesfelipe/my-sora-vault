import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { AnimatePresence, motion } from "framer-motion";

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-destructive/90 text-destructive-foreground text-center text-xs font-medium py-1.5 flex items-center justify-center gap-1.5 backdrop-blur-sm"
        >
          <WifiOff className="h-3 w-3" />
          You're offline — changes will sync when reconnected
        </motion.div>
      )}
    </AnimatePresence>
  );
};
