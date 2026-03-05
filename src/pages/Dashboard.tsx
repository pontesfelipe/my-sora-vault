import { Watch, Calendar, TrendingUp, Target, Palette, Flame, Plane, Droplets, TrendingDown, DollarSign } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { UsageChart } from "@/components/UsageChart";
import { QuickAddWearDialog } from "@/components/QuickAddWearDialog";
import { DepreciationCard } from "@/components/DepreciationCard";
import { DepreciationChart } from "@/components/DepreciationChart";

import { MonthlyUsageTable } from "@/components/MonthlyUsageTable";
import { CollectionSwitcher } from "@/components/CollectionSwitcher";

import { useWatchData } from "@/hooks/useWatchData";
import { useTripData } from "@/hooks/useTripData";
import { useWaterUsageData } from "@/hooks/useWaterUsageData";
import { useStatsCalculations } from "@/hooks/useStatsCalculations";
import { useCollection } from "@/contexts/CollectionContext";
import { getCollectionConfig } from "@/types/collection";
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const { selectedCollectionId, currentCollection, currentCollectionConfig } = useCollection();
  const { watches, wearEntries, loading: watchLoading, refetch } = useWatchData(selectedCollectionId);
  const { trips, loading: tripLoading } = useTripData();
  const { waterUsages, loading: waterLoading } = useWaterUsageData();
  const { t } = useTranslation();

  const stats = useStatsCalculations(watches, wearEntries, trips, waterUsages);
  const config = currentCollectionConfig;

  if (watchLoading || tripLoading || waterLoading) {
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
    : t("dashboard.overviewGeneric", { type: config.pluralLabel.toLowerCase() });

  return (
    <div className="space-y-6">
      {/* Mobile layout */}
      <div className="flex flex-col md:hidden">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-semibold text-textMain">{t("dashboard.title")}</h1>
            <p className="mt-1 text-sm text-textMuted">{subtitle}</p>
          </div>
          <CollectionSwitcher />
        </div>
        <div className="mt-4 flex justify-center">
          <QuickAddWearDialog watches={watches} onSuccess={refetch} />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-semibold text-textMain">
              {t("dashboard.title")}
            </h1>
          </div>
          <p className="mt-1 text-sm text-textMuted">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <CollectionSwitcher />
          <QuickAddWearDialog watches={watches} onSuccess={refetch} />
        </div>
      </div>

      

      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatsCard
            title={t("dashboard.totalItems", { type: config.pluralLabel })}
            value={stats.totalWatches}
            icon={Watch}
            variant="compact"
          />
          <StatsCard
            title={t("dashboard.totalDays", { verb: config.usageVerbPast.charAt(0).toUpperCase() + config.usageVerbPast.slice(1) })}
            value={stats.totalDaysWorn}
            icon={Calendar}
            variant="compact"
          />
          <StatsCard
            title={t("dashboard.mostUsedItem", { verb: config.usageVerbPast.charAt(0).toUpperCase() + config.usageVerbPast.slice(1), type: config.singularLabel })}
            value={stats.mostWornWatch ? `${stats.mostWornWatch.brand} ${stats.mostWornWatch.model}` : t("dashboard.na")}
            icon={TrendingUp}
            variant="compact"
            itemId={stats.mostWornWatch?.id}
          />
          <StatsCard
            title={t("dashboard.avgDaysPerItem", { type: config.singularLabel })}
            value={stats.avgDaysPerWatch}
            icon={Target}
            variant="compact"
          />
          <StatsCard
            title={t("dashboard.mostUsedColor", { verb: config.usageVerbPast.charAt(0).toUpperCase() + config.usageVerbPast.slice(1), color: config.primaryColorLabel })}
            value={stats.mostWornDialColor || t("dashboard.na")}
            icon={Palette}
            variant="compact"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatsCard
            title={t("dashboard.mostUsedType", { verb: config.usageVerbPast.charAt(0).toUpperCase() + config.usageVerbPast.slice(1), type: config.typeLabel })}
            value={stats.mostWornStyle || t("dashboard.na")}
            icon={Target}
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
            subtitle={stats.trendingDownCount ? `${stats.trendingDownCount} ${config.pluralLabel.toLowerCase()} ↓` : undefined}
            icon={TrendingDown}
            variant="compact"
            itemId={stats.trendingDownWatch?.id}
          />
          <StatsCard
            title={t("dashboard.topTripItem", { type: config.singularLabel })}
            value={stats.topTripWatch ? `${stats.topTripWatch.brand} ${stats.topTripWatch.model}` : t("dashboard.na")}
            icon={Plane}
            variant="compact"
            itemId={stats.topTripWatch?.id}
          />
          {true && (
            <StatsCard
              title={t("dashboard.topWaterUsage")}
              value={stats.topWaterWatch ? `${stats.topWaterWatch.brand} ${stats.topWaterWatch.model}` : t("dashboard.na")}
              icon={Droplets}
              variant="compact"
              itemId={stats.topWaterWatch?.id}
            />
          )}
        </div>
      </div>


      <UsageChart watches={watches} wearEntries={wearEntries} />

      <MonthlyUsageTable watches={watches} wearEntries={wearEntries} />

      {stats.watchesWithResaleDataCount > 0 && (
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
                    type: stats.appreciatingWatchesCount > 1 ? config.pluralLabel.toLowerCase() : config.singularLabel.toLowerCase() 
                  })}
                </p>
              </div>
            )}
          </div>
          
          <DepreciationChart watches={watches} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;