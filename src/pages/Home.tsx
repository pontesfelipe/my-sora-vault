import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Watch, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWatchData } from "@/hooks/useWatchData";
import { useCollection } from "@/contexts/CollectionContext";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { QuickLogSheet } from "@/components/QuickLogSheet";
import { WearCalendar } from "@/components/WearCalendar";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCollectionId } = useCollection();
  const { watches, wearEntries, loading, refetch } = useWatchData(selectedCollectionId);
  const [quickLogWatch, setQuickLogWatch] = useState<any>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  const handleWatchCardTap = (watch: any) => {
    setQuickLogWatch(watch);
    setQuickLogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 pb-4">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-textMain">
            {getGreeting()}
          </h1>
          <p className="text-sm text-textMuted mt-0.5">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>

        {/* Quick Log CTA */}
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => navigate("/log")}
            className="w-full h-14 rounded-2xl text-base font-semibold gap-3 shadow-luxury active:scale-[0.98] transition-transform"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Wrist Check
          </Button>
        </motion.div>

        {/* Wear Calendar */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-textMuted mb-3">
            Wear Calendar
          </h2>
          <WearCalendar
            watches={watches}
            wearEntries={wearEntries}
            onWatchTap={handleWatchCardTap}
          />
        </section>

        {/* Most Worn Overall */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-textMuted">
              Most Worn
            </h2>
            <button
              onClick={() => navigate("/profile")}
              className="text-xs text-accent font-medium"
            >
              View all
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {getMostWorn(watches, wearEntries)
              .slice(0, 6)
              .map(({ watch, count }) => (
                <motion.div
                  key={watch.id}
                  className="shrink-0 w-28 cursor-pointer"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate(`/watch/${watch.id}`)}
                >
                  <div className="h-28 w-28 rounded-2xl bg-surfaceMuted overflow-hidden mb-2">
                    {watch.ai_image_url ? (
                      <img
                        src={watch.ai_image_url}
                        alt={`${watch.brand} ${watch.model}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Watch className="h-8 w-8 text-textMuted" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-textMain truncate">{watch.brand}</p>
                  <p className="text-[11px] text-textMuted truncate">{watch.model}</p>
                  <p className="text-[10px] text-accent font-medium">{count} days</p>
                </motion.div>
              ))}
          </div>
        </section>

        {/* Reserved for future sponsored content */}
        <section className="opacity-0 pointer-events-none h-0">
          <div data-slot="sponsored-content" />
        </section>
      </div>

      <QuickLogSheet
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        watch={quickLogWatch}
        onSuccess={() => refetch?.()}
      />
    </PageTransition>
  );
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getMostWorn(
  watches: any[],
  wearEntries: any[]
): { watch: any; count: number }[] {
  const counts: Record<string, number> = {};
  wearEntries.forEach((e) => {
    counts[e.watch_id] = (counts[e.watch_id] || 0) + e.days;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({
      watch: watches.find((w) => w.id === id),
      count,
    }))
    .filter((item) => item.watch);
}

export default Home;
