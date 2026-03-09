import { useState, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

export interface WidgetConfig {
  collection_stats: boolean;
  usage_trends: boolean;
  usage_chart: boolean;
  depreciation: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig = {
  collection_stats: true,
  usage_trends: true,
  usage_chart: true,
  depreciation: true,
};

const WIDGET_KEYS: Array<keyof WidgetConfig> = [
  "collection_stats",
  "usage_trends",
  "usage_chart",
  "depreciation",
];

const WIDGET_I18N: Record<keyof WidgetConfig, { label: string; desc: string }> = {
  collection_stats: { label: "dashboard.widgetCollectionStats", desc: "dashboard.widgetCollectionStatsDesc" },
  usage_trends: { label: "dashboard.widgetUsageTrends", desc: "dashboard.widgetUsageTrendsDesc" },
  usage_chart: { label: "dashboard.widgetUsageChart", desc: "dashboard.widgetUsageChartDesc" },
  depreciation: { label: "dashboard.widgetDepreciation", desc: "dashboard.widgetDepreciationDesc" },
};

interface CanvasWidgetManagerProps {
  widgets: WidgetConfig;
  onWidgetsChange: (widgets: WidgetConfig) => void;
}

export function CanvasWidgetManager({ widgets, onWidgetsChange }: CanvasWidgetManagerProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleToggle = async (key: keyof WidgetConfig, checked: boolean) => {
    const updated = { ...widgets, [key]: checked };
    onWidgetsChange(updated);

    if (user) {
      await supabase
        .from("user_preferences")
        .upsert(
          { user_id: user.id, canvas_widgets: updated as any, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
    }
  };

  const activeCount = Object.values(widgets).filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">{t("dashboard.customize")}</span>
          <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
            {activeCount}/{WIDGET_KEYS.length}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>{t("dashboard.customizeCanvas")}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("dashboard.customizeDesc")}
          </p>
          {WIDGET_KEYS.map((key) => (
            <div
              key={key}
              className="flex items-start justify-between gap-3 p-3 rounded-lg border border-borderSubtle bg-surface"
            >
              <div className="space-y-0.5 flex-1">
                <Label htmlFor={`widget-${key}`} className="font-medium text-sm">
                  {t(WIDGET_I18N[key].label)}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t(WIDGET_I18N[key].desc)}
                </p>
              </div>
              <Switch
                id={`widget-${key}`}
                checked={widgets[key]}
                onCheckedChange={(checked) => handleToggle(key, checked)}
              />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function useCanvasWidgets(): [WidgetConfig, (w: WidgetConfig) => void, boolean] {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<WidgetConfig>(DEFAULT_WIDGETS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("canvas_widgets")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.canvas_widgets) {
        setWidgets({ ...DEFAULT_WIDGETS, ...(data.canvas_widgets as any) });
      }
      setLoading(false);
    };

    load();
  }, [user]);

  return [widgets, setWidgets, loading];
}
