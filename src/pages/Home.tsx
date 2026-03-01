import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Watch, ChevronRight, Clock, Camera, AlertCircle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useWatchData } from "@/hooks/useWatchData";
import { useCollection } from "@/contexts/CollectionContext";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { QuickLogSheet } from "@/components/QuickLogSheet";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCollectionId } = useCollection();
  const { watches, wearEntries, loading, refetch } = useWatchData(selectedCollectionId);
  const [quickLogWatch, setQuickLogWatch] = useState<any>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // Calculate "Your Week" data
  const weekData = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const thisWeekEntries = wearEntries.filter((entry) => {
      try {
        const entryDate = parseISO(entry.wear_date);
        return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    });

    const watchCounts: Record<string, number> = {};
    thisWeekEntries.forEach((entry) => {
      watchCounts[entry.watch_id] = (watchCounts[entry.watch_id] || 0) + entry.days;
    });

    const sorted = Object.entries(watchCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([watchId, count]) => {
        const watch = watches.find((w) => w.id === watchId);
        return { watch, count };
      })
      .filter((item) => item.watch);

    return {
      totalDays: thisWeekEntries.reduce((s, e) => s + e.days, 0),
      watches: sorted,
      daysOfWeek: Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dayEntries = thisWeekEntries.filter(
          (e) => e.wear_date === format(date, "yyyy-MM-dd")
        );
        return {
          label: format(date, "EEE"),
          date: format(date, "d"),
          hasEntry: dayEntries.length > 0,
          isToday: format(date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd"),
        };
      }),
    };
  }, [watches, wearEntries]);

  // Calculate neglected watches (not worn in 30+ days)
  const neglectedWatches = useMemo(() => {
    const now = new Date();
    return watches
      .map((watch) => {
        const entries = wearEntries.filter((e) => e.watch_id === watch.id);
        if (entries.length === 0) {
          return { watch, daysSince: Infinity };
        }
        const lastDate = entries
          .map((e) => parseISO(e.wear_date))
          .sort((a, b) => b.getTime() - a.getTime())[0];
        return { watch, daysSince: differenceInDays(now, lastDate) };
      })
      .filter((item) => item.daysSince >= 30)
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 3);
  }, [watches, wearEntries]);

  // Weekly rotation goal: unique watches worn this week
  const weeklyRotation = useMemo(() => {
    const uniqueWatchIds = new Set<string>();
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    wearEntries.forEach((entry) => {
      try {
        const entryDate = parseISO(entry.wear_date);
        if (isWithinInterval(entryDate, { start: weekStart, end: weekEnd })) {
          uniqueWatchIds.add(entry.watch_id);
        }
      } catch { /* skip */ }
    });
    const goal = Math.min(watches.length, 5);
    return { current: uniqueWatchIds.size, goal };
  }, [watches, wearEntries]);

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

        {/* Your Week */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-textMuted">
              Your Week
            </h2>
            <span className="text-xs text-textMuted">
              {weekData.totalDays} day{weekData.totalDays !== 1 ? "s" : ""} logged
            </span>
          </div>

          {/* Week dots */}
          <div className="flex justify-between mb-4">
            {weekData.daysOfWeek.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-textMuted font-medium">{day.label}</span>
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    day.isToday
                      ? "ring-2 ring-accent ring-offset-2 ring-offset-background"
                      : ""
                  } ${
                    day.hasEntry
                      ? "bg-accent text-accent-foreground"
                      : "bg-surfaceMuted text-textMuted"
                  }`}
                >
                  {day.date}
                </div>
              </div>
            ))}
          </div>

          {/* Watches worn this week — tap opens Quick Log sheet */}
          {weekData.watches.length > 0 ? (
            <div className="space-y-2">
              {weekData.watches.slice(0, 3).map(({ watch, count }, i) => (
                <motion.div
                  key={watch!.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surfaceMuted active:scale-[0.98] transition-all border-borderSubtle"
                    onClick={() => handleWatchCardTap(watch)}
                  >
                    <div className="h-12 w-12 rounded-xl bg-surfaceMuted overflow-hidden shrink-0">
                      {watch!.ai_image_url ? (
                        <img
                          src={watch!.ai_image_url}
                          alt={`${watch!.brand} ${watch!.model}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Watch className="h-5 w-5 text-textMuted" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-textMain truncate">
                        {watch!.brand} {watch!.model}
                      </p>
                      <p className="text-xs text-textMuted">
                        {count} day{count !== 1 ? "s" : ""} this week
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-textMuted shrink-0" />
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center border-dashed border-borderSubtle">
              <Watch className="h-8 w-8 text-textMuted mx-auto mb-2" />
              <p className="text-sm text-textMuted">No entries this week</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/log")}
                className="mt-2 text-accent"
              >
                Log your first wrist check
              </Button>
            </Card>
          )}
        </section>

        {/* Weekly Rotation Goal */}
        {watches.length >= 2 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-textMuted">
                Rotation Goal
              </h2>
              <span className="text-xs text-textMuted">
                {weeklyRotation.current}/{weeklyRotation.goal} unique this week
              </span>
            </div>
            <Card className="p-4 border-borderSubtle">
              <div className="flex items-center gap-4">
                <div className="relative h-12 w-12 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                    <circle
                      cx="18" cy="18" r="15.5"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18" cy="18" r="15.5"
                      fill="none"
                      stroke="hsl(var(--accent))"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${(Math.min(weeklyRotation.current / weeklyRotation.goal, 1) * 97.4).toFixed(1)} 97.4`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <Target className="absolute inset-0 m-auto h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-textMain">
                    {weeklyRotation.current >= weeklyRotation.goal
                      ? "Goal reached! Great rotation."
                      : `Wear ${weeklyRotation.goal - weeklyRotation.current} more unique ${weeklyRotation.goal - weeklyRotation.current === 1 ? "piece" : "pieces"} this week`}
                  </p>
                  <p className="text-xs text-textMuted">
                    Keep your collection in rotation
                  </p>
                </div>
              </div>
            </Card>
          </section>
        )}

        {/* Neglected Watches */}
        {neglectedWatches.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-textMuted">
                Needs Wrist Time
              </h2>
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="space-y-2">
              {neglectedWatches.map(({ watch, daysSince }, i) => (
                <motion.div
                  key={watch.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surfaceMuted active:scale-[0.98] transition-all border-borderSubtle"
                    onClick={() => handleWatchCardTap(watch)}
                  >
                    <div className="h-10 w-10 rounded-xl bg-surfaceMuted overflow-hidden shrink-0">
                      {watch.ai_image_url ? (
                        <img
                          src={watch.ai_image_url}
                          alt={`${watch.brand} ${watch.model}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Watch className="h-4 w-4 text-textMuted" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-textMain truncate">
                        {watch.brand} {watch.model}
                      </p>
                      <p className="text-xs text-amber-500 font-medium">
                        {daysSince === Infinity ? "Never worn" : `${daysSince} days ago`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-textMuted shrink-0" />
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        )}

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

      {/* Floating Action Button */}
      <motion.div
        className="fixed bottom-20 right-4 z-40"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          onClick={() => setFabOpen(true)}
          size="icon"
          className="h-14 w-14 rounded-full shadow-luxury"
          aria-label="Quick actions"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Quick Actions Bottom Sheet */}
      <Drawer open={fabOpen} onOpenChange={setFabOpen}>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="text-center pb-2">
            <DrawerTitle>Quick Actions</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-sm font-medium"
              onClick={() => { setFabOpen(false); navigate("/log"); }}
            >
              <Clock className="h-4 w-4" />
              Log a Wear
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-sm font-medium"
              onClick={() => { setFabOpen(false); navigate("/profile"); }}
            >
              <Plus className="h-4 w-4" />
              Add a Watch
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-sm font-medium"
              onClick={() => { setFabOpen(false); navigate("/log"); }}
            >
              <Camera className="h-4 w-4" />
              Quick Photo ID
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
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
