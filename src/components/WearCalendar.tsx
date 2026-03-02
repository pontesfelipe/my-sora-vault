import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Watch, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface WearCalendarProps {
  watches: any[];
  wearEntries: any[];
  onWatchTap?: (watch: any) => void;
  onNavigateToWatch?: (watchId: string) => void;
}

export const WearCalendar = ({ watches, wearEntries, onWatchTap, onNavigateToWatch }: WearCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Build a set of dates that have wear entries
  const wornDatesMap = useMemo(() => {
    const map: Record<string, string[]> = {}; // date string -> watch_ids
    wearEntries.forEach((entry: any) => {
      const dateKey = entry.wear_date;
      if (!map[dateKey]) map[dateKey] = [];
      if (!map[dateKey].includes(entry.watch_id)) {
        map[dateKey].push(entry.watch_id);
      }
    });
    return map;
  }, [wearEntries]);

  // Get watches worn on selected date
  const selectedDateWatches = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    const watchIds = wornDatesMap[dateKey] || [];
    return watchIds
      .map((id) => watches.find((w) => w.id === id))
      .filter(Boolean);
  }, [selectedDate, wornDatesMap, watches]);

  // Dates with entries for calendar highlighting
  const datesWithEntries = useMemo(() => {
    return new Set(Object.keys(wornDatesMap));
  }, [wornDatesMap]);

  // Stats for selected month
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    let totalDays = 0;
    const watchCounts: Record<string, number> = {};

    wearEntries.forEach((entry: any) => {
      try {
        const entryDate = parseISO(entry.wear_date);
        if (isWithinInterval(entryDate, { start: monthStart, end: monthEnd })) {
          totalDays += entry.days;
          watchCounts[entry.watch_id] = (watchCounts[entry.watch_id] || 0) + entry.days;
        }
      } catch {}
    });

    return { totalDays, uniqueWatches: Object.keys(watchCounts).length };
  }, [currentMonth, wearEntries]);

  return (
    <div className="space-y-3">
      {/* Calendar */}
      <Card className="border-borderSubtle bg-surface shadow-card overflow-hidden">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="p-3 pointer-events-auto"
          modifiers={{
            worn: (date) => datesWithEntries.has(format(date, "yyyy-MM-dd")),
          }}
          modifiersClassNames={{
            worn: "worn-day",
          }}
          classNames={{
            day: cn(
              "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full",
              "hover:bg-surfaceMuted transition-colors relative"
            ),
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "ring-2 ring-accent ring-offset-1 ring-offset-background",
          }}
          components={{
            DayContent: ({ date }) => {
              const dateKey = format(date, "yyyy-MM-dd");
              const hasEntry = datesWithEntries.has(dateKey);
              return (
                <div className="relative flex items-center justify-center w-full h-full">
                  <span>{date.getDate()}</span>
                  {hasEntry && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-accent" />
                  )}
                </div>
              );
            },
          }}
        />

        {/* Month stats bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-borderSubtle bg-surfaceMuted/50">
          <span className="text-xs text-textMuted">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <div className="flex gap-3">
            <span className="text-xs text-textMuted">
              <strong className="text-textMain">{monthStats.totalDays}</strong> day{monthStats.totalDays !== 1 ? "s" : ""} logged
            </span>
            <span className="text-xs text-textMuted">
              <strong className="text-textMain">{monthStats.uniqueWatches}</strong> watch{monthStats.uniqueWatches !== 1 ? "es" : ""}
            </span>
          </div>
        </div>
      </Card>

      {/* Selected day detail */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={format(selectedDate, "yyyy-MM-dd")}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-textMuted">
                {format(selectedDate, "EEEE, MMM d")}
              </h3>
              <span className="text-xs text-textMuted">
                {selectedDateWatches.length} worn
              </span>
            </div>

            {selectedDateWatches.length > 0 ? (
              <div className="space-y-2">
                {selectedDateWatches.map((watch: any, i: number) => (
                  <motion.div
                    key={watch.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surfaceMuted active:scale-[0.98] transition-all border-borderSubtle"
                      onClick={() => onWatchTap?.(watch)}
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
                      </div>
                      <ChevronRight className="h-4 w-4 text-textMuted shrink-0" />
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="p-4 text-center border-dashed border-borderSubtle">
                <p className="text-xs text-textMuted">No wrist check logged</p>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
