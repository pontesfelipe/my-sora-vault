import { useMemo } from "react";
import { format, subDays, startOfWeek, parseISO } from "date-fns";

interface WearHeatmapProps {
  wearEntries: { wear_date: string; days: number }[];
}

export const WearHeatmap = ({ wearEntries }: WearHeatmapProps) => {
  const { grid, months, maxDays } = useMemo(() => {
    const today = new Date();
    const dayCount = 365;
    const startDate = subDays(today, dayCount - 1);
    // Align to start of week (Monday)
    const alignedStart = startOfWeek(startDate, { weekStartsOn: 1 });

    // Build date → days map
    const dateMap: Record<string, number> = {};
    wearEntries.forEach((e) => {
      const key = e.wear_date;
      dateMap[key] = (dateMap[key] || 0) + e.days;
    });

    let maxDays = 0;
    Object.values(dateMap).forEach((d) => {
      if (d > maxDays) maxDays = d;
    });

    // Build week columns
    const weeks: { date: Date; count: number }[][] = [];
    let currentWeek: { date: Date; count: number }[] = [];
    let d = new Date(alignedStart);

    while (d <= today) {
      const key = format(d, "yyyy-MM-dd");
      currentWeek.push({ date: new Date(d), count: dateMap[key] || 0 });
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      d = new Date(d.getTime() + 86400000);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    // Month labels
    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const firstDay = week[0];
      const m = firstDay.date.getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ label: format(firstDay.date, "MMM"), col: i });
        lastMonth = m;
      }
    });

    return { grid: weeks, months: monthLabels, maxDays: maxDays || 1 };
  }, [wearEntries]);

  const getColor = (count: number) => {
    if (count === 0) return "bg-muted/40";
    const ratio = count / maxDays;
    if (ratio <= 0.25) return "bg-primary/25";
    if (ratio <= 0.5) return "bg-primary/45";
    if (ratio <= 0.75) return "bg-primary/70";
    return "bg-primary";
  };

  return (
    <div className="space-y-2">
      {/* Month labels */}
      <div className="flex text-[9px] text-muted-foreground pl-6 gap-0">
        {months.map((m, i) => (
          <span
            key={i}
            className="absolute"
            style={{ left: `${m.col * 13 + 24}px` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="flex gap-0 overflow-x-auto pb-1">
        {/* Day labels */}
        <div className="flex flex-col gap-[2px] pr-1 shrink-0">
          {["", "Mon", "", "Wed", "", "Fri", ""].map((label, i) => (
            <div key={i} className="h-[11px] text-[9px] text-muted-foreground leading-[11px]">
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-[2px]">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`h-[11px] w-[11px] rounded-[2px] ${getColor(day.count)} transition-colors`}
                  title={`${format(day.date, "MMM d, yyyy")}: ${day.count} day${day.count !== 1 ? "s" : ""}`}
                />
              ))}
              {/* Pad incomplete last week */}
              {week.length < 7 &&
                Array.from({ length: 7 - week.length }).map((_, i) => (
                  <div key={`pad-${i}`} className="h-[11px] w-[11px]" />
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground">
        <span>Less</span>
        <div className="h-[11px] w-[11px] rounded-[2px] bg-muted/40" />
        <div className="h-[11px] w-[11px] rounded-[2px] bg-primary/25" />
        <div className="h-[11px] w-[11px] rounded-[2px] bg-primary/45" />
        <div className="h-[11px] w-[11px] rounded-[2px] bg-primary/70" />
        <div className="h-[11px] w-[11px] rounded-[2px] bg-primary" />
        <span>More</span>
      </div>
    </div>
  );
};
