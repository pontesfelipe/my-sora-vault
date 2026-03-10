import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DepreciationCardProps {
  totalMSRP: number;
  pricePaid: number;
  marketValue: number;
  depreciation: number;
  depreciationPercent: number;
}

export const DepreciationCard = ({
  totalMSRP,
  pricePaid,
  marketValue,
  depreciation,
  depreciationPercent,
}: DepreciationCardProps) => {
  const { t } = useTranslation();
  const isAppreciation = depreciation < 0;
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="border-border bg-card hover:shadow-[var(--shadow-glow)] transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          {t("depreciationCard.pricingComparison")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t("depreciationCard.msrp")}</p>
            <p className="text-xl font-bold text-foreground">
              {totalMSRP > 0 ? formatCurrency(totalMSRP) : t("dashboard.na")}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t("depreciationCard.pricePaid")}</p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(pricePaid)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t("depreciationCard.marketValue")}</p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(marketValue)}
            </p>
          </div>
        </div>
        
        <div className="pt-4 border-t border-border space-y-3">
          {totalMSRP > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {marketValue >= totalMSRP ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
                <span className="text-sm text-muted-foreground">
                  {t("depreciationCard.fromMSRP")}
                </span>
              </div>
              <div className="text-right">
                <p
                  className={`text-xl font-bold ${
                    marketValue >= totalMSRP ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {marketValue >= totalMSRP ? "+" : "-"}
                  {Math.abs(((marketValue - totalMSRP) / totalMSRP) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAppreciation ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm text-muted-foreground">
                {t("depreciationCard.fromPricePaid")}
              </span>
            </div>
            <div className="text-right">
              <p
                className={`text-xl font-bold ${
                  isAppreciation ? "text-green-500" : "text-red-500"
                }`}
              >
                {isAppreciation ? "+" : "-"}{Math.abs(depreciationPercent).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
