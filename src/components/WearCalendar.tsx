import { useMemo, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Watch, ChevronRight, CalendarIcon } from "lucide-react";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  addDays,
  addWeeks,
  subWeeks,
  isSameWeek,
} from "date-fns";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useWristCheck } from "@/contexts/WristCheckContext";


interface WearCalendarProps {
  watches: any[];
  wearEntries: any[];
  onWatchTap?: (watch: any) => void;
}

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const WearCalendar = ({ watches, wearEntries, onWatchTap }: WearCalendarProps) => {
  const [selectedWeekDate, setSelectedWeekDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(0);
  const { t } = useTranslation();
  const { openWristCheck } = useWristCheck();

  const isCurrentWeek = isSameWeek(selectedWeekDate, new Date(), { weekStartsOn: 1 });

  const weekData = useMemo(() => {
    const weekStart = startOfWeek(selectedWeekDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedWeekDate, { weekStartsOn: 1 });

    const weekEntries = wearEntries.filter((entry: any) => {
      try {
        const entryDate = parseISO(entry.wear_date);
        return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    });

    const watchCounts: Record<string, number> = {};
    weekEntries.forEach((entry: any) => {
      watchCounts[entry.watch_id] = (watchCounts[entry.watch_id] || 0) + entry.days;
    });

    const sorted = Object.entries(watchCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([watchId, count]) => {
        const watch = watches.find((w: any) => w.id === watchId);
        return { watch, count };
      })
      .filter((item) => item.watch);

    const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateKey = format(date, "yyyy-MM-dd");
      const dayEntries = weekEntries.filter((e: any) => e.wear_date === dateKey);
      const dayWatchIds = [...new Set(dayEntries.map((e: any) => e.watch_id))];
      // Get first watch image for thumbnail
      const firstWatch = dayWatchIds.length > 0
        ? watches.find((w: any) => w.id === dayWatchIds[0])
        : null;
      return {
        dayKey: DAY_KEYS[i],
        date: format(date, "d"),
        dateKey,
        hasEntry: dayEntries.length > 0,
        isToday: dateKey === format(new Date(), "yyyy-MM-dd"),
        watchIds: dayWatchIds,
        firstWatchImage: firstWatch?.ai_image_url || null,
      };
    });

    const daysLogged = daysOfWeek.filter((d) => d.hasEntry).length;

    return {
      totalDays: weekEntries.reduce((s: number, e: any) => s + e.days, 0),
      watches: sorted,
      daysOfWeek,
      weekStart,
      weekEnd,
      daysLogged,
    };
  }, [watches, wearEntries, selectedWeekDate]);

  const selectedDayWatches = useMemo(() => {
    if (!selectedDay) return [];
    const day = weekData.daysOfWeek.find((d) => d.dateKey === selectedDay);
    if (!day) return [];
    return day.watchIds
      .map((id: string) => watches.find((w: any) => w.id === id))
      .filter(Boolean);
  }, [selectedDay, weekData, watches]);

  const datesWithEntries = useMemo(() => {
    const set = new Set<string>();
    wearEntries.forEach((e: any) => set.add(e.wear_date));
    return set;
  }, [wearEntries]);

  const handleDatePick = (date: Date | undefined) => {
    if (date) {
      setSelectedWeekDate(date);
      setSelectedDay(format(date, "yyyy-MM-dd"));
    }
    setCalendarOpen(false);
  };

  const handleDayTap = (dateKey: string, hasEntry: boolean) => {
    if (!hasEntry) {
      openWristCheck();
      return;
    }
    setSelectedDay((prev) => (prev === dateKey ? null : dateKey));
  };

  const handleSwipeEnd = (_: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      setSelectedWeekDate((d) => addWeeks(d, 1));
      setSelectedDay(null);
      setSwipeDirection(1);
    } else if (info.offset.x > threshold) {
      setSelectedWeekDate((d) => subWeeks(d, 1));
      setSelectedDay(null);
      setSwipeDirection(-1);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-textMuted">
            {isCurrentWeek ? t("calendar.yourWeek") : format(weekData.weekStart, "MMM d") + " – " + format(weekData.weekEnd, "MMM d")}
          </h2>
          {!isCurrentWeek && (
            <button
              onClick={() => {
                setSelectedWeekDate(new Date());
                setSelectedDay(null);
              }}
              className="text-[10px] text-accent font-medium px-1.5 py-0.5 rounded bg-accent/10 hover:bg-accent/20 transition-colors"
            >
              {t("calendar.today")}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-textMuted">
            {t("calendar.daysLogged", { count: weekData.daysLogged, total: 7 })}
          </span>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-textMuted hover:text-textMain"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedWeekDate}
                onSelect={handleDatePick}
                className="p-3 pointer-events-auto"
                components={{
                  DayContent: ({ date }: { date: Date }) => {
                    const dateKey = format(date, "yyyy-MM-dd");
                    const hasEntry = datesWithEntries.has(dateKey);
                    return (
                      <div className="relative flex items-center justify-center w-full h-full">
                        <span>{date.getDate()}</span>
                        {hasEntry && (
                          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-accent" />
                        )}
                      </div>
                    );
                  },
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Swipeable Week strip */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleSwipeEnd}
        className="touch-pan-y"
      >
        <AnimatePresence mode="wait" custom={swipeDirection}>
          <motion.div
            key={selectedWeekDate.toISOString()}
            initial={{ opacity: 0, x: swipeDirection * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -swipeDirection * 100 }}
            transition={{ duration: 0.2 }}
            className="flex justify-between"
          >
            {weekData.daysOfWeek.map((day, i) => (
              <button
                key={i}
                onClick={() => handleDayTap(day.dateKey, day.hasEntry)}
                className="flex flex-col items-center gap-1 group"
              >
                <span className="text-[10px] text-textMuted font-medium">{t(`calendar.${day.dayKey}`)}</span>
                <div
                  className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center text-xs font-medium transition-all overflow-hidden",
                    day.isToday && "ring-2 ring-accent ring-offset-2 ring-offset-background",
                    selectedDay === day.dateKey && "ring-2 ring-primary ring-offset-1 ring-offset-background scale-110"
                  )}
                >
                  {day.hasEntry && day.firstWatchImage ? (
                    <img
                      src={day.firstWatchImage}
                      alt=""
                      className="h-full w-full object-cover rounded-full"
                    />
                  ) : (
                    <div className={cn(
                      "h-full w-full flex items-center justify-center rounded-full",
                      day.hasEntry
                        ? "bg-accent text-accent-foreground"
                        : "bg-surfaceMuted text-textMuted"
                    )}>
                      {day.date}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Selected day detail */}
      <AnimatePresence mode="wait">
        {selectedDay && (
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-textMuted">
                  {format(parseISO(selectedDay), "EEEE, MMM d")}
                </p>
                <span className="text-[10px] text-textMuted">
                  {t("calendar.worn", { count: selectedDayWatches.length })}
                </span>
              </div>
              {selectedDayWatches.length > 0 ? (
                selectedDayWatches.map((watch: any) => (
                  <Card
                    key={watch.id}
                    className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-surfaceMuted active:scale-[0.98] transition-all border-borderSubtle"
                    onClick={() => onWatchTap?.(watch)}
                  >
                    <div className="h-9 w-9 rounded-lg bg-surfaceMuted overflow-hidden shrink-0">
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
                    <p className="text-sm font-medium text-textMain truncate flex-1">
                      {watch.brand} {watch.model}
                    </p>
                    <ChevronRight className="h-3.5 w-3.5 text-textMuted shrink-0" />
                  </Card>
                ))
              ) : (
                <p className="text-xs text-textMuted text-center py-2">{t("calendar.noWristCheckThisDay")}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Week summary watches */}
      {!selectedDay && weekData.watches.length > 0 && (
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
                onClick={() => onWatchTap?.(watch)}
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
                    {t("calendar.daysThisWeek", { count })}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-textMuted shrink-0" />
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!selectedDay && weekData.watches.length === 0 && (
        <Card className="p-6 text-center border-dashed border-borderSubtle">
          <Watch className="h-8 w-8 text-textMuted mx-auto mb-2" />
          <p className="text-sm text-textMuted">{t("calendar.noEntriesThisWeek")}</p>
        </Card>
      )}
    </div>
  );
};
