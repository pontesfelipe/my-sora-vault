import { useState } from "react";
import { Watch } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { usePlatformMostWorn } from "@/hooks/usePlatformMostWorn";
import { Skeleton } from "@/components/ui/skeleton";

export function MostWornThisWeekSection() {
  const { t } = useTranslation();
  const { platformData, friendsData, loading } = usePlatformMostWorn();
  const [view, setView] = useState<"platform" | "friends">("platform");

  const data = view === "platform" ? platformData : friendsData;

  if (loading) {
    return (
      <section>
        <Skeleton className="h-5 w-48 mb-3" />
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-28 rounded-2xl shrink-0" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-textMuted">
          {t("home.mostWornThisWeek")}
        </h2>
      </div>

      {/* Toggle chips */}
      <div className="flex gap-2 mb-3">
        {(["platform", "friends"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              view === v
                ? "bg-accent text-white"
                : "bg-surfaceMuted text-textMuted hover:text-textMain"
            }`}
          >
            {t(v === "platform" ? "home.platform" : "home.friends")}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <p className="text-xs text-textMuted py-4">{t("home.noDataThisWeek")}</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {data.slice(0, 10).map((item, idx) => (
            <motion.div
              key={`${item.brand}-${item.model}-${idx}`}
              className="shrink-0 w-28"
              whileTap={{ scale: 0.96 }}
            >
              <div className="h-28 w-28 rounded-2xl bg-surfaceMuted overflow-hidden mb-2">
                {item.ai_image_url ? (
                  <img
                    src={item.ai_image_url}
                    alt={`${item.brand} ${item.model}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Watch className="h-8 w-8 text-textMuted" />
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-textMain truncate">{item.brand}</p>
              <p className="text-[11px] text-textMuted truncate">{item.model}</p>
              <p className="text-[10px] text-accent font-medium">
                {t("home.wornByCount", { count: Number(item.user_count) })}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
