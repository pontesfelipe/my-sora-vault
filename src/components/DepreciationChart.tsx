import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

interface Watch {
  brand: string;
  model: string;
  cost: number;
  msrp?: number;
  average_resale_price?: number;
}

interface DepreciationChartProps {
  watches: Watch[];
}

export const DepreciationChart = ({ watches }: DepreciationChartProps) => {
  const { t } = useTranslation();
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedWatch, setSelectedWatch] = useState<string>("");
  const [comparisonMode, setComparisonMode] = useState<"price_paid" | "msrp">("price_paid");

  const watchesWithResale = watches.filter(
    (w) => w.average_resale_price != null && w.average_resale_price > 0
  );

  const brands = useMemo(() => {
    const uniqueBrands = Array.from(new Set(watchesWithResale.map(w => w.brand)));
    return uniqueBrands.sort();
  }, [watchesWithResale]);

  const individualWatches = useMemo(() => {
    return watchesWithResale.map(w => ({
      id: `${w.brand}-${w.model}`,
      label: `${w.brand} ${w.model}`,
      brand: w.brand,
      model: w.model
    }));
  }, [watchesWithResale]);

  const chartData = useMemo(() => {
    const getInvestedValue = (watch: Watch) => {
      if (comparisonMode === "msrp") {
        return watch.msrp && watch.msrp > 0 ? watch.msrp : watch.cost;
      }
      return watch.cost;
    };

    if (filterType === "brand") {
      const brandGroups = watchesWithResale.reduce((acc, watch) => {
        if (!acc[watch.brand]) {
          acc[watch.brand] = { invested: 0, current: 0, count: 0 };
        }
        acc[watch.brand].invested += getInvestedValue(watch);
        acc[watch.brand].current += watch.average_resale_price || 0;
        acc[watch.brand].count += 1;
        return acc;
      }, {} as Record<string, { invested: number; current: number; count: number }>);

      return Object.entries(brandGroups)
        .map(([brand, data]) => ({
          name: brand,
          brand,
          model: `${data.count} ${t("collectionConfig.pluralLabel").toLowerCase()}`,
          invested: data.invested,
          current: data.current,
          change: data.current - data.invested,
        }))
        .sort((a, b) => b.change - a.change);
    } else if (filterType === "watch" && selectedWatch) {
      const watch = watchesWithResale.find(w => `${w.brand}-${w.model}` === selectedWatch);
      if (!watch) return [];
      
      const invested = getInvestedValue(watch);
      return [{
        name: `${watch.brand}\n${watch.model}`,
        brand: watch.brand,
        model: watch.model,
        invested,
        current: watch.average_resale_price || 0,
        change: (watch.average_resale_price || 0) - invested,
      }];
    } else {
      return watchesWithResale
        .map((watch) => {
          const abbrevBrand = watch.brand.substring(0, 3).toUpperCase();
          const abbrevModel = watch.model.split(' ')[0].substring(0, 4);
          const invested = getInvestedValue(watch);
          return {
            name: `${abbrevBrand}-${abbrevModel}`,
            brand: watch.brand,
            model: watch.model,
            invested,
            current: watch.average_resale_price || 0,
            change: (watch.average_resale_price || 0) - invested,
          };
        })
        .sort((a, b) => b.change - a.change);
    }
  }, [watchesWithResale, filterType, selectedWatch, comparisonMode, t]);

  if (chartData.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">{t("depreciationChart.valueComparison")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {t("depreciationChart.noResaleData")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl">{t("depreciationChart.investmentVsMarket")}</CardTitle>
        <div className="flex gap-2 mt-4 flex-wrap">
          <Select value={comparisonMode} onValueChange={(v) => setComparisonMode(v as "price_paid" | "msrp")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price_paid">{t("depreciationCard.pricePaid")}</SelectItem>
              <SelectItem value="msrp">{t("depreciationCard.msrp")}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterType} onValueChange={(value) => {
            setFilterType(value);
            setSelectedWatch("");
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("depreciationChart.filterBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("depreciationChart.allCollection")}</SelectItem>
              <SelectItem value="brand">{t("depreciationChart.byBrand")}</SelectItem>
              <SelectItem value="watch">{t("depreciationChart.byWatch")}</SelectItem>
            </SelectContent>
          </Select>
          
          {filterType === "watch" && (
            <Select value={selectedWatch} onValueChange={setSelectedWatch}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder={t("depreciationChart.selectWatch")} />
              </SelectTrigger>
              <SelectContent>
                {individualWatches.map(watch => (
                  <SelectItem key={watch.id} value={watch.id}>{watch.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={120}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return `${data.brand} ${data.model}`;
                }
                return label;
              }}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                color: "hsl(var(--foreground))",
              }}
            />
            <Legend 
              content={({ payload }) => (
                <div className="flex justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary"></div>
                    <span className="text-sm text-muted-foreground">
                      {comparisonMode === "msrp" ? t("depreciationCard.msrp") : t("depreciationCard.pricePaid")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#ef4444]"></div>
                    <span className="text-sm text-muted-foreground">{t("depreciationChart.currentValueLoss")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#22c55e]"></div>
                    <span className="text-sm text-muted-foreground">{t("depreciationChart.currentValueGain")}</span>
                  </div>
                </div>
              )}
            />
            <Bar dataKey="invested" fill="hsl(var(--primary))" name={t("depreciationChart.invested")} radius={[8, 8, 0, 0]} />
            <Bar dataKey="current" name={t("depreciationChart.currentValue")} radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.change >= 0 ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
