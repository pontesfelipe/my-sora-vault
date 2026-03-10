import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, TrendingUp, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { formatPurchaseDateForDisplay, parsePurchaseDate } from "@/lib/date";
import { useCollection } from "@/contexts/CollectionContext";

interface Item {
  id: string;
  brand: string;
  model: string;
  cost: number;
  when_bought?: string;
  created_at: string;
}

interface SpendingAnalyticsTabProps {
  watches: Item[];
}

export function SpendingAnalyticsTab({ watches }: SpendingAnalyticsTabProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const { currentCollectionConfig } = useCollection();
  const { t } = useTranslation();
  const itemLabel = t("collectionConfig.singularLabel").toLowerCase();
  const itemsLabel = t("collectionConfig.pluralLabel").toLowerCase();

  // Calculate total spending
  const totalSpent = watches.reduce((sum, item) => sum + item.cost, 0);
  
  // Calculate average price
  const averagePrice = watches.length > 0 ? totalSpent / watches.length : 0;
  
  // Group items by year
  const itemsByYear = watches.reduce((acc, item) => {
    const parsed = parsePurchaseDate(item.when_bought, item.created_at);
    const year = parsed.date.getFullYear();

    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(item);
    return acc;
  }, {} as Record<number, Item[]>);
  
  // Calculate spending by year
  const yearlyData = Object.entries(itemsByYear)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, yearItems]) => ({
      year: Number(year),
      count: yearItems.length,
      total: yearItems.reduce((sum, w) => sum + w.cost, 0),
      items: yearItems,
    }));

  // Calculate monthly breakdown for selected year
  const getMonthlyBreakdown = (year: number) => {
    const yearItems = itemsByYear[year] || [];
    const monthlyData = yearItems.reduce((acc, item) => {
      const parsed = parsePurchaseDate(item.when_bought, item.created_at);
      const month = parsed.date.getMonth(); // 0-11
      
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(item);
      return acc;
    }, {} as Record<number, Item[]>);
    
    return Object.entries(monthlyData)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([month, monthItems]) => ({
        month: Number(month),
        monthName: format(new Date(year, Number(month), 1), "MMMM"),
        items: monthItems,
        total: monthItems.reduce((sum, w) => sum + w.cost, 0),
      }));
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across {watches.length} {itemsLabel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averagePrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">
              Per {itemLabel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Size</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{watches.length}</div>
            <p className="text-xs text-muted-foreground">
              Total {itemsLabel}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Yearly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Yearly Breakdown</CardTitle>
          <CardDescription>Spending and acquisitions by year - Click to see monthly details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {yearlyData.map(({ year, count, total }) => (
              <div 
                key={year} 
                className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedYear(year)}
              >
                <div className="flex-1">
                  <p className="font-semibold text-lg">{year}</p>
                  <p className="text-sm text-muted-foreground">
                    {count} {count === 1 ? itemLabel : itemsLabel} acquired
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-xl">${total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Avg: ${(total / count).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown Dialog */}
      {selectedYear && (
        <Dialog open={!!selectedYear} onOpenChange={() => setSelectedYear(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedYear} - Monthly Breakdown</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {getMonthlyBreakdown(selectedYear).map(({ month, monthName, items, total }) => (
                <Card key={month}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{monthName}</CardTitle>
                      <div className="text-right">
                        <p className="font-bold text-lg">${total.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {items.length} {items.length === 1 ? itemLabel : itemsLabel}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-semibold">{item.brand} {item.model}</p>
                            <p className="text-xs text-muted-foreground">
                              {(() => {
                                const parsed = parsePurchaseDate(item.when_bought, item.created_at);
                                return item.when_bought ? formatPurchaseDateForDisplay(parsed.date, parsed.precision) : "Date unknown";
                              })()}
                            </p>
                          </div>
                          <p className="font-bold">${item.cost.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
