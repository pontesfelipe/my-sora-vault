import { useEffect, useState, useRef, useCallback } from "react";

import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, DollarSign, Eye, EyeOff, Trash2, Info, Pencil } from "lucide-react";
import { PinchZoomImage } from "@/components/PinchZoomImage";
import watchHero from "@/assets/watch-hero.jpg";
import { AddWearDialog } from "@/components/AddWearDialog";
import { useWristCheck } from "@/contexts/WristCheckContext";
import { EditWatchDialog } from "@/components/EditWatchDialog";
import { EditWearEntryDialog } from "@/components/EditWearEntryDialog";
import { useToast } from "@/hooks/use-toast";
import { usePasscode } from "@/contexts/PasscodeContext";
import { useAuth } from "@/contexts/AuthContext";
import { parseLocalDate } from "@/lib/date";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Watch {
  id: string;
  brand: string;
  model: string;
  dial_color: string;
  type: string;
  cost: number;
  case_size?: string;
  lug_to_lug_size?: string;
  caseback_material?: string;
  movement?: string;
  has_sapphire?: boolean;
  average_resale_price?: number;
  warranty_date?: string;
  warranty_card_url?: string;
  rarity?: string;
  historical_significance?: string;
  metadata_analysis_reasoning?: string;
  available_for_trade?: boolean;
  ai_image_url?: string;
  complications?: string[];
  case_shape?: string;
}

interface WearEntry {
  id: string;
  watch_id: string;
  wear_date: string;
  days: number;
  notes: string | null;
}

interface WatchSpecs {
  id: string;
  price: number;
  movement: string | null;
  power_reserve: string | null;
  crystal: string | null;
  case_material: string | null;
  case_size: string | null;
  lug_to_lug: string | null;
  water_resistance: string | null;
  caseback: string | null;
  band: string | null;
}

const WatchDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { requestVerification, isVerified } = usePasscode();
  const [watch, setWatch] = useState<Watch | null>(null);
  const [watchSpecs, setWatchSpecs] = useState<WatchSpecs | null>(null);
  const [wearEntries, setWearEntries] = useState<WearEntry[]>([]);
  const [entryTags, setEntryTags] = useState<Record<string, { id: string; name: string; category: string | null }[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCost, setShowCost] = useState(isAdmin);
  const [editingEntry, setEditingEntry] = useState<WearEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeletingWatch, setIsDeletingWatch] = useState(false);

  // Swipe-right to go back (must be before early returns)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX < 40) {
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX.current;
    const dy = Math.abs(touch.clientY - touchStartY.current);
    touchStartX.current = null;
    touchStartY.current = null;
    if (dx > 80 && dy < 100) {
      navigate(-1);
    }
  }, [navigate]);

  const handleToggleCost = () => {
    if (!showCost) {
      if (isVerified) {
        setShowCost(true);
      } else {
        requestVerification(() => {
          setShowCost(true);
        });
      }
    } else {
      setShowCost(false);
    }
  };

  // Auto-show cost if already verified or if admin
  useEffect(() => {
    if (isVerified || isAdmin) {
      setShowCost(true);
    }
  }, [isVerified, isAdmin]);

  const fetchData = async () => {
    if (!id) return;

    const [watchResult, specsResult, wearResult] = await Promise.all([
      supabase.from("watches").select("*").eq("id", id).single(),
      supabase.from("watch_specs").select("*").eq("watch_id", id).maybeSingle(),
      supabase.from("wear_entries").select("*").eq("watch_id", id).order("wear_date", { ascending: false }),
    ]);

    if (watchResult.data) setWatch(watchResult.data);
    if (specsResult.data) setWatchSpecs(specsResult.data);
    if (wearResult.data) {
      setWearEntries(wearResult.data);
      // Fetch tags for all wear entries
      const entryIds = wearResult.data.map((e: WearEntry) => e.id);
      if (entryIds.length > 0) {
        const { data: tagLinks } = await supabase
          .from("wear_entry_tags")
          .select("wear_entry_id, tag_id, tags(id, name, category)")
          .in("wear_entry_id", entryIds);
        if (tagLinks) {
          const tagsMap: Record<string, { id: string; name: string; category: string | null }[]> = {};
          tagLinks.forEach((link: any) => {
            if (!tagsMap[link.wear_entry_id]) tagsMap[link.wear_entry_id] = [];
            if (link.tags) tagsMap[link.wear_entry_id].push(link.tags);
          });
          setEntryTags(tagsMap);
        }
      } else {
        setEntryTags({});
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleEditEntry = (entry: WearEntry) => {
    setEditingEntry(entry);
    setEditDialogOpen(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    requestVerification(async () => {
      const { error } = await supabase.from("wear_entries").delete().eq("id", entryId);

      if (error) {
        toast({
          title: t("watchDetail.error"),
          description: t("watchDetail.failedDeleteEntry"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("watchDetail.success"),
        description: t("watchDetail.wearEntryDeleted"),
      });

      fetchData();
    });
  };

  const handleDeleteWatch = () => {
    if (!watch) return;

    requestVerification(async () => {
      setIsDeletingWatch(true);
      try {
        await supabase.from("wear_entries").delete().eq("watch_id", watch.id);
        await supabase.from("water_usage").delete().eq("watch_id", watch.id);
        await supabase.from("watch_specs").delete().eq("watch_id", watch.id);
        await (supabase.from("sneaker_specs" as any) as any).delete().eq("item_id", watch.id);
        await (supabase.from("purse_specs" as any) as any).delete().eq("item_id", watch.id);

        const { error } = await supabase.from("watches").delete().eq("id", watch.id);
        if (error) throw error;

        toast({
          title: t("watchDetail.deleted"),
          description: t("watchDetail.watchRemoved", { brand: watch.brand, model: watch.model }),
        });

        navigate("/", { replace: true });
      } catch (error) {
        console.error("Error deleting watch:", error);
        toast({
          title: t("watchDetail.error"),
          description: t("watchDetail.failedDeleteWatch"),
          variant: "destructive",
        });
      } finally {
        setIsDeletingWatch(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!watch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t("watchDetail.watchNotFound")}</p>
          <Button onClick={() => navigate("/")}>{t("watchDetail.goBack")}</Button>
        </div>
      </div>
    );
  }

  const totalDays = wearEntries.reduce((sum, entry) => sum + parseFloat(entry.days.toString()), 0);
  const costPerUse = totalDays > 0 ? watch.cost / totalDays : watch.cost;

  // Group by month for monthly breakdown
  const monthlyData: Record<string, number> = {};
  wearEntries.forEach(entry => {
    const monthKey = new Date(entry.wear_date).toLocaleString('default', { month: 'short', year: 'numeric' });
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + parseFloat(entry.days.toString());
  });

  return (
    <div
      className="min-h-screen bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t("watchDetail.backToCollection")}
          </Button>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">{watch.brand}</h1>
              <p className="text-xl text-muted-foreground">{watch.model}</p>
            </div>
            <div className="flex gap-2 items-start">
              <EditWatchDialog watch={watch} onSuccess={fetchData} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" aria-label={t("watchDetail.deleteWatch")}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">{t("watchDetail.deleteTitle", { brand: watch.brand, model: watch.model })}</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      {t("watchDetail.deleteDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletingWatch}>{t("watchDetail.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteWatch}
                      disabled={isDeletingWatch}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeletingWatch ? t("watchDetail.deleting") : t("watchDetail.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Badge variant="secondary" className="text-sm">
                {watch.type}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Watch Hero Image */}
          {(watch.ai_image_url || watchHero) && (
            <div className="mb-6 rounded-2xl overflow-hidden bg-muted aspect-square max-w-sm mx-auto shadow-lg">
              <PinchZoomImage
                src={watch.ai_image_url || watchHero}
                alt={`${watch.brand} ${watch.model}`}
                className="w-full h-full"
              />
            </div>
          )}

          <Tabs defaultValue="specs" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="specs">{t("watchDetail.specifications")}</TabsTrigger>
            <TabsTrigger value="stats">{t("watchDetail.statistics")}</TabsTrigger>
            <TabsTrigger value="history">{t("watchDetail.wearHistory")}</TabsTrigger>
          </TabsList>

          {/* Specifications Tab */}
          <TabsContent value="specs">
            <Card className="border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">{t("watchDetail.watchSpecifications")}</h2>
              
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.brand")}</p>
                    <p className="text-lg font-medium text-foreground">{watch.brand}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.model")}</p>
                    <p className="text-lg font-medium text-foreground">{watch.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.dialColor")}</p>
                    <p className="text-lg font-medium text-foreground">{watch.dial_color}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.type")}</p>
                    <p className="text-lg font-medium text-foreground">{watch.type}</p>
                  </div>
                  {watch.complications && watch.complications.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.functionsComplications")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {watch.complications.map((c) => (
                          <Badge key={c} variant="secondary" className="text-sm">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {watch.case_shape && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.caseShape")}</p>
                      <p className="text-lg font-medium text-foreground">{watch.case_shape}</p>
                    </div>
                  )}
                  {watchSpecs && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.movement")}</p>
                        <p className="text-lg font-medium text-foreground">{watch.movement || watchSpecs?.movement || t("watchDetail.na")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.powerReserve")}</p>
                        <p className="text-lg font-medium text-foreground">{watchSpecs.power_reserve || t("watchDetail.na")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.crystal")}</p>
                        <p className="text-lg font-medium text-foreground">{watchSpecs.crystal || t("watchDetail.na")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.caseMaterial")}</p>
                        <p className="text-lg font-medium text-foreground">{watchSpecs.case_material || t("watchDetail.na")}</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-4">
                  {watchSpecs && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.caseSize")}</p>
                        <p className="text-lg font-medium text-foreground">{watch.case_size || watchSpecs?.case_size || t("watchDetail.na")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.lugToLug")}</p>
                        <p className="text-lg font-medium text-foreground">{watch.lug_to_lug_size || watchSpecs?.lug_to_lug || t("watchDetail.na")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.waterResistance")}</p>
                        <p className="text-lg font-medium text-foreground">{watchSpecs.water_resistance || t("watchDetail.na")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.caseback")}</p>
                        <p className="text-lg font-medium text-foreground">{watchSpecs.caseback || t("watchDetail.na")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.band")}</p>
                        <p className="text-lg font-medium text-foreground">{watchSpecs.band || t("watchDetail.na")}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.purchaseCost")}</p>
                    <div className="flex items-center gap-2">
                      {showCost ? (
                        <p className="text-lg font-medium text-foreground">${watch.cost.toLocaleString()}</p>
                      ) : (
                        <p className="text-lg font-medium text-muted-foreground">••••••</p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={handleToggleCost}
                      >
                        {showCost ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {watch.average_resale_price && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.avgResalePrice")}</p>
                      <div className="flex items-center gap-2">
                        {showCost ? (
                          <p className="text-lg font-medium text-foreground">${watch.average_resale_price.toLocaleString()}</p>
                        ) : (
                          <p className="text-lg font-medium text-muted-foreground">••••••</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{t("watchDetail.marketDataNote")}</p>
                    </div>
                  )}
                  {watch.warranty_date && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.warrantyStatus")}</p>
                      <div>
                        <p className="text-lg font-medium text-foreground">
                          {new Date(watch.warranty_date) < new Date() ? (
                            <span className="text-destructive">{t("watchDetail.expired")} ({new Date(watch.warranty_date).toLocaleDateString()})</span>
                          ) : (
                            <span className="text-green-500">{t("watchDetail.validUntil")} {new Date(watch.warranty_date).toLocaleDateString()}</span>
                          )}
                        </p>
                        {watch.warranty_card_url && (
                          <a 
                            href={watch.warranty_card_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline mt-1 inline-block"
                          >
                            {t("watchDetail.viewWarrantyCard")}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.totalWearEntries")}</p>
                    <p className="text-lg font-medium text-foreground">{wearEntries.length}</p>
                  </div>
                </div>
              </div>

              {/* Classification Information */}
              {(watch.rarity || watch.historical_significance || watch.available_for_trade !== undefined) && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">{t("watchDetail.classification")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {watch.rarity && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.rarity")}</p>
                        <Badge variant="secondary" className="text-base capitalize">
                          {watch.rarity}
                        </Badge>
                      </div>
                    )}
                    {watch.historical_significance && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.historical")}</p>
                        <Badge variant="secondary" className="text-base capitalize">
                          {watch.historical_significance}
                        </Badge>
                      </div>
                    )}
                    {watch.available_for_trade !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.openToTrade")}</p>
                        <Badge 
                          variant={watch.available_for_trade ? "default" : "secondary"} 
                          className="text-base"
                        >
                          {watch.available_for_trade ? t("watchDetail.available") : t("watchDetail.notAvailable")}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {watch.metadata_analysis_reasoning ? (
                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4 text-primary" />
                        <p className="text-sm font-medium text-foreground">{t("watchDetail.whyThisClassification")}</p>
                      </div>
                      <div className="bg-muted/30 border border-border rounded-lg p-4">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                          {watch.metadata_analysis_reasoning}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">{t("watchDetail.classificationReasoning")}</p>
                      </div>
                      <div className="bg-muted/20 border border-border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground italic">
                          {t("watchDetail.noClassificationAnalysis")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.totalDaysWorn")}</p>
                      <p className="text-3xl font-bold text-primary">{totalDays}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-primary" />
                  </div>
                </Card>

                <Card className="border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.purchaseCost")}</p>
                      <div className="flex items-center gap-2">
                        {showCost ? (
                          <p className="text-3xl font-bold text-foreground">${watch.cost.toLocaleString()}</p>
                        ) : (
                          <p className="text-3xl font-bold text-muted-foreground">••••••</p>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={handleToggleCost}
                        >
                          {showCost ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <DollarSign className="w-8 h-8 text-primary" />
                  </div>
                </Card>

                <Card className="border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.costPerDay")}</p>
                      {showCost ? (
                        <p className="text-3xl font-bold text-primary">${costPerUse.toFixed(0)}</p>
                      ) : (
                        <p className="text-3xl font-bold text-muted-foreground">••••</p>
                      )}
                    </div>
                    <DollarSign className="w-8 h-8 text-muted-foreground" />
                  </div>
                </Card>

                {watch.average_resale_price && (
                  <Card className="border-border bg-card p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">{t("watchDetail.avgResalePrice")}</p>
                        <div className="flex items-center gap-2">
                          {showCost ? (
                            <p className="text-3xl font-bold text-foreground">${watch.average_resale_price.toLocaleString()}</p>
                          ) : (
                            <p className="text-3xl font-bold text-muted-foreground">••••••</p>
                          )}
                        </div>
                      </div>
                      <DollarSign className="w-8 h-8 text-primary" />
                    </div>
                  </Card>
                )}
              </div>

              {/* Monthly Breakdown */}
              <Card className="border-border bg-card p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">{t("watchDetail.monthlyBreakdown")}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(monthlyData).map(([month, days]) => (
                    <div key={month} className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">{month}</p>
                      <p className="text-2xl font-bold text-primary">{days}</p>
                      <p className="text-xs text-muted-foreground">{t("common.days")}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Wear History Tab */}
          <TabsContent value="history">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">{t("watchDetail.totalDaysWornLabel")}</p>
              <p className="text-3xl font-bold text-primary">
                {wearEntries.reduce((sum, entry) => sum + Number(entry.days), 0)}
              </p>
            </div>
            <Card className="border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">{t("watchDetail.wearHistory")}</h2>
                <AddWearDialog watchId={watch.id} onSuccess={fetchData} />
              </div>

               {wearEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t("watchDetail.noWearEntriesYet")}</p>
              ) : (
                <div className="space-y-3">
                  {wearEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex-1 cursor-pointer" onClick={() => handleEditEntry(entry)}>
                        <p className="font-medium text-foreground">
                          {parseLocalDate(entry.wear_date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.days} {entry.days === 1 ? t("common.day") : t("common.days")}
                        </p>
                         {entry.notes && (
                           <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                         )}
                         {entryTags[entry.id] && entryTags[entry.id].length > 0 && (
                           <div className="flex flex-wrap gap-1 mt-1.5">
                             {entryTags[entry.id].map((tag) => (
                               <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                                 <Tag className="h-2.5 w-2.5" />
                                 {tag.name}
                               </Badge>
                             ))}
                           </div>
                         )}
                       </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditEntry(entry)}
                          className="hover:bg-primary hover:text-primary-foreground"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="hover:bg-destructive hover:text-destructive-foreground">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">{t("watchDetail.deleteEntry")}</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              {t("watchDetail.deleteEntryConfirm")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("watchDetail.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t("watchDetail.delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {editingEntry && (
        <EditWearEntryDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          entries={[editingEntry]}
          watchName={`${watch.brand} ${watch.model}`}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
};

export default WatchDetail;
