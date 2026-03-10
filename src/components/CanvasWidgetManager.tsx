import { useState, useEffect } from "react";
import { Settings2, Tag, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useUserTags } from "@/hooks/useUserTags";

export interface WidgetConfig {
  collection_stats: boolean;
  usage_trends: boolean;
  usage_chart: boolean;
  depreciation: boolean;
  // Dynamic tag widget IDs: "tag_<tagId>"
  [key: string]: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig = {
  collection_stats: true,
  usage_trends: true,
  usage_chart: true,
  depreciation: true,
};

const BUILT_IN_KEYS: Array<keyof WidgetConfig> = [
  "collection_stats",
  "usage_trends",
  "usage_chart",
  "depreciation",
];

const WIDGET_I18N: Record<string, { label: string; desc: string }> = {
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
  const { tags, canCreateMore, createTag, updateTag, deleteTag } = useUserTags();
  const [newTagName, setNewTagName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleToggle = async (key: string, checked: boolean) => {
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

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const result = await createTag(newTagName);
    if (result) {
      setNewTagName("");
      // Auto-enable the new tag widget
      handleToggle(`tag_${result.id}`, true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    await updateTag(editingId, editingName);
    setEditingId(null);
    setEditingName("");
  };

  const handleDeleteTag = async (tagId: string) => {
    await deleteTag(tagId);
    // Remove from widgets
    const updated = { ...widgets };
    delete updated[`tag_${tagId}`];
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

  const builtInCount = BUILT_IN_KEYS.filter(k => widgets[k]).length;
  const tagCount = tags.filter(tag => widgets[`tag_${tag.id}`]).length;
  const totalActive = builtInCount + tagCount;
  const totalWidgets = BUILT_IN_KEYS.length + tags.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">{t("dashboard.customize")}</span>
          <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
            {totalActive}/{totalWidgets}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("dashboard.customizeCanvas")}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("dashboard.customizeDesc")}
          </p>

          {/* Built-in widgets */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Built-in Widgets</h3>
            {BUILT_IN_KEYS.map((key) => (
              <div
                key={key}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor={`widget-${key}`} className="font-medium text-sm">
                    {t(WIDGET_I18N[key as string].label)}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t(WIDGET_I18N[key as string].desc)}
                  </p>
                </div>
                <Switch
                  id={`widget-${key}`}
                  checked={widgets[key] ?? false}
                  onCheckedChange={(checked) => handleToggle(key, checked)}
                />
              </div>
            ))}
          </div>

          {/* Tag-based widgets */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Tag Widgets
            </h3>
            <p className="text-xs text-muted-foreground">
              Enable tags as Canvas widgets to see watch count and wear frequency per tag.
            </p>

            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-card"
              >
                {editingId === tag.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                      className="h-7 text-sm flex-1"
                      maxLength={30}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveEdit}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge variant="secondary" className="text-xs shrink-0">{tag.name}</Badge>
                      <Button
                        size="icon" variant="ghost" className="h-6 w-6 shrink-0"
                        onClick={() => { setEditingId(tag.id); setEditingName(tag.name); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTag(tag.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Switch
                      checked={widgets[`tag_${tag.id}`] ?? false}
                      onCheckedChange={(checked) => handleToggle(`tag_${tag.id}`, checked)}
                    />
                  </>
                )}
              </div>
            ))}

            {/* Create new tag inline */}
            {canCreateMore && (
              <div className="flex gap-2">
                <Input
                  placeholder="New tag..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                  className="text-sm h-8"
                  maxLength={30}
                />
                <Button size="sm" variant="outline" className="h-8" onClick={handleCreateTag} disabled={!newTagName.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-right">{tags.length}/15 tags</p>
          </div>
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
