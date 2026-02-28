import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  progress: number;
}

export function PullToRefreshIndicator({ pullDistance, refreshing, progress }: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !refreshing) return null;

  return (
    <motion.div
      className="flex items-center justify-center py-2"
      style={{ height: refreshing ? 40 : pullDistance }}
      animate={{ opacity: refreshing ? 1 : progress }}
    >
      <Loader2
        className={`h-5 w-5 text-accent ${refreshing ? "animate-spin" : ""}`}
        style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)` }}
      />
    </motion.div>
  );
}
