import { Watch, Calendar, TrendingUp, Target, Palette, Flame, TrendingDown, DollarSign, Shirt, Plus, Tag } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { UsageChart } from "@/components/UsageChart";
import { DepreciationCard } from "@/components/DepreciationCard";
import { DepreciationChart } from "@/components/DepreciationChart";
import { CollectionSwitcher } from "@/components/CollectionSwitcher";
import { CanvasWidgetManager, useCanvasWidgets } from "@/components/CanvasWidgetManager";

import { useWatchData } from "@/hooks/useWatchData";
import { useTripData } from "@/hooks/useTripData";
import { useWaterUsageData } from "@/hooks/useWaterUsageData";
import { useStatsCalculations } from "@/hooks/useStatsCalculations";
import { useCollection } from "@/contexts/CollectionContext";
import { getCollectionConfig } from "@/types/collection";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid } from "lucide-react";
import { useWristCheck } from "@/contexts/WristCheckContext";
import { useUserTags } from "@/hooks/useUserTags";
import { useMemo } from "react";

const Dashboard = () => {
  const { selectedCollectionId, currentCollection, currentCollectionConfig } = useCollection();
  const { watches, wearEntries, loading: watchLoading, refetch } = useWatchData(selectedCollectionId);
  const { trips, loading: tripLoading } = useTripData();
  const { waterUsages, loading: waterLoading } = useWaterUsageData();
  const { t } = useTranslation();
  const [widgets, setWidgets, widgetsLoading] = useCanvasWidgets();
  const { openWristCheck } = useWristCheck();
  const { tags, watchTags, getWatchesForTag } = useUserTags();
  const stats = useStatsCalculations(watches, wearEntries, trips, waterUsages);

  // Compute tag-based stats with #1 most-worn watch per tag
  const tagStats = useMemo(() => {
    const collectionWatchIds = new Set(watches.map(w => w.id));
    return tags.map(tag => {
      const tagWatchIds = getWatchesForTag(tag.id).filter(id => collectionWatchIds.has(id));
      const watchCount = tagWatchIds.length;
      const wearCount = wearEntries.filter(we => tagWatchIds.includes(we.watch_id)).reduce((sum, we) => sum + (we.days || 1), 0);
      
      // Find #1 most-worn watch for this tag
      const wearCountsPerWatch: Record<string, number> = {};
      wearEntries
        .filter(we => tagWatchIds.includes(we.watch_id))
        .forEach(we => {
          wearCountsPerWatch[we.watch_id] = (wearCountsPerWatch[we.watch_id] || 0) + (we.days || 1);
        });
      const topWatchId = Object.entries(wearCountsPerWatch).sort(([, a], [, b]) => b - a)[0]?.[0];
      const topWatch = topWatchId ? watches.find(w => w.id === topWatchId) : undefined;
      const topWatchWears = topWatchId ? wearCountsPerWatch[topWatchId] : 0;
      
      return { tag, watchCount, wearCount, topWatch, topWatchWears };
    });
  }, [tags, watchTags, watches, wearEntries, getWatchesForTag]);

  const activeTagStats = tagStats.filter(ts => widgets[`tag_${ts.tag.id}`]);
  const config = currentCollectionConfig;

  // Translated collection config labels
  const tPluralLabel = t("collectionConfig.pluralLabel");
  const tSingularLabel = t("collectionConfig.singularLabel");
  const tUsageVerbPast = t("collectionConfig.usageVerbPast");
  const tPrimaryColorLabel = t("collectionConfig.primaryColorLabel");
  const tTypeLabel = t("collectionConfig.typeLabel");

  if (watchLoading || tripLoading || waterLoading || widgetsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-textMuted">{t("dashboard.loadingCollection")}</p>
        </div>
      </div>
    );
  }

  const subtitle = currentCollection
    ? t("dashboard.overview", { name: currentCollection.name })
    : t("dashboard.overviewGeneric", { type: tPluralLabel.toLowerCase() });

  const noWidgetsEnabled = !widgets.collection_stats && !widgets.usage_trends && !widgets.usage_chart && !widgets.depreciation && activeTagStats.length === 0;

  return (
    <div className="space-y-6">
      {/* Mobile layout */}
      <div className="flex flex-col md:hidden">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-semibold text-textMain">{t("dashboard.title")}</h1>
            <p className="mt-1 text-sm text-textMuted">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <CanvasWidgetManager widgets={widgets} onWidgetsChange={setWidgets} />
            <CollectionSwitcher />
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <Button onClick={openWristCheck} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t("home.wristCheck")}
          </Button>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold text-textMain">{t("dashboard.title")}</h1>
          <p className="mt-1 text-sm text-textMuted">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <CanvasWidgetManager widgets={widgets} onWidgetsChange={setWidgets} />
          <CollectionSwitcher />
          <Button onClick={openWristCheck} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t("home.wristCheck")}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {noWidgetsEnabled && (
        <Card className="p-8 text-center border-dashed border-borderSubtle">
          <LayoutGrid className="h-10 w-10 text-textMuted mx-auto mb-3" />
          <h3 className="text-base font-medium text-textMain mb-1">{t("dashboard.noWidgetsTitle")}</h3>
          <p className="text-sm text-textMuted">
            {t("dashboard.noWidgetsDesc")}
          </p>
        </Card>
      )}

      {/* Collection Stats Widget */}
      {widgets.collection_stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatsCard
              title={t("dashboard.totalItems", { type: tPluralLabel })}
              value={stats.totalWatches}
              icon={Watch}
              variant="compact"
            />
            <StatsCard
              title={t("dashboard.totalDays", { verb: tUsageVerbPast.charAt(0).toUpperCase() + tUsageVerbPast.slice(1) })}
              value={stats.totalDaysWorn}
              icon={Calendar}
              variant="compact"
            />
            <StatsCard
              title={t("dashboard.mostUsedItem", { verb: tUsageVerbPast.charAt(0).toUpperCase() + tUsageVerbPast.slice(1), type: tSingularLabel })}
              value={stats.mostWornWatch ? `${stats.mostWornWatch.brand} ${stats.mostWornWatch.model}` : t("dashboard.na")}
              icon={TrendingUp}
              variant="compact"
              itemId={stats.mostWornWatch?.id}
            />
            <StatsCard
              title={t("dashboard.avgDaysPerItem", { type: tSingularLabel })}
              value={stats.avgDaysPerWatch}
              icon={Target}
              variant="compact"
            />
            <StatsCard
              title={t("dashboard.mostUsedColor", { verb: tUsageVerbPast.charAt(0).toUpperCase() + tUsageVerbPast.slice(1), color: tPrimaryColorLabel })}
              value={stats.mostWornDialColor || t("dashboard.na")}
              icon={Palette}
              variant="compact"
            />
          </div>
        </div>
      )}

      {/* Usage Trends Widget */}
      {widgets.usage_trends && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatsCard
              title={t("dashboard.mostUsedType", { verb: tUsageVerbPast.charAt(0).toUpperCase() + tUsageVerbPast.slice(1), type: tTypeLabel })}
              value={stats.mostWornStyle || t("dashboard.na")}
              icon={Shirt}
              variant="compact"
            />
            <StatsCard
              title={t("dashboard.trending30Days")}
              value={stats.trendingWatch ? `${stats.trendingWatch.brand} ${stats.trendingWatch.model}` : t("dashboard.na")}
              icon={Flame}
              variant="compact"
              itemId={stats.trendingWatch?.id}
            />
            <StatsCard
              title={t("dashboard.trendingDown90d")}
              value={stats.trendingDownWatch ? `${stats.trendingDownWatch.brand} ${stats.trendingDownWatch.model}` : t("dashboard.na")}
              subtitle={stats.trendingDownCount ? `${stats.trendingDownCount} ${tPluralLabel.toLowerCase()} ↓` : undefined}
              icon={TrendingDown}
              variant="compact"
              itemId={stats.trendingDownWatch?.id}
            />
          </div>
        </div>
      )}

      {/* Usage Chart Widget */}
      {widgets.usage_chart && (
        <UsageChart watches={watches} wearEntries={wearEntries} />
      )}

      {/* Depreciation Widget */}
      {widgets.depreciation && stats.watchesWithResaleDataCount > 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-textMain">{t("dashboard.collectionValue")}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <DepreciationCard
                totalMSRP={stats.totalMSRP}
                pricePaid={stats.totalCollectionValue}
                marketValue={stats.currentMarketValue}
                depreciation={stats.totalDepreciation}
                depreciationPercent={stats.depreciationPercentage}
              />
              <StatsCard
                title={t("dashboard.mostDepreciated")}
                value={
                  stats.mostDepreciatedWatch
                    ? `${stats.mostDepreciatedWatch.watch.brand} ${stats.mostDepreciatedWatch.watch.model}`
                    : t("dashboard.na")
                }
                subtitle={
                  stats.mostDepreciatedWatch
                    ? `-$${Math.abs(stats.mostDepreciatedWatch.depreciation).toFixed(0)} (${Math.abs(stats.mostDepreciatedWatch.depreciationPercent).toFixed(1)}%)`
                    : undefined
                }
                icon={TrendingDown}
                variant="default"
                itemId={stats.mostDepreciatedWatch?.watch.id}
              />
              <StatsCard
                title={t("dashboard.bestValueRetention")}
                value={
                  stats.bestValueRetention
                    ? `${stats.bestValueRetention.watch.brand} ${stats.bestValueRetention.watch.model}`
                    : t("dashboard.na")
                }
                subtitle={
                  stats.bestValueRetention
                    ? stats.bestValueRetention.depreciation < 0
                      ? `+$${Math.abs(stats.bestValueRetention.depreciation).toFixed(0)} (${Math.abs(stats.bestValueRetention.depreciationPercent).toFixed(1)}%)`
                      : `-$${Math.abs(stats.bestValueRetention.depreciation).toFixed(0)} (${Math.abs(stats.bestValueRetention.depreciationPercent).toFixed(1)}%)`
                    : undefined
                }
                icon={stats.bestValueRetention?.depreciation < 0 ? TrendingUp : DollarSign}
                variant="default"
                itemId={stats.bestValueRetention?.watch.id}
              />
            </div>
            {stats.appreciatingWatchesCount > 0 && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.appreciatingItems", {
                    count: stats.appreciatingWatchesCount,
                    type: stats.appreciatingWatchesCount > 1 ? tPluralLabel.toLowerCase() : tSingularLabel.toLowerCase(),
                  })}
                </p>
              </div>
            )}
          </div>
          <DepreciationChart watches={watches} />
        </div>
      )}

      {/* Tag-based Widgets - inline with collection stats */}
      {activeTagStats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {activeTagStats.map(ts => (
            <StatsCard
              key={ts.tag.id}
              title={`#1 ${ts.tag.name}`}
              value={ts.topWatch ? `${ts.topWatch.brand} ${ts.topWatch.model}` : t("dashboard.na")}
              subtitle={ts.topWatch 
                ? `${ts.topWatchWears} day${ts.topWatchWears !== 1 ? 's' : ''} · ${ts.watchCount} item${ts.watchCount !== 1 ? 's' : ''} tagged`
                : `${ts.watchCount} item${ts.watchCount !== 1 ? 's' : ''} tagged`
              }
              icon={Tag}
              variant="compact"
              itemId={ts.topWatch?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
