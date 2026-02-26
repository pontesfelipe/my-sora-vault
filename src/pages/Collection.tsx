import { useState, useEffect } from "react";
import { Search, RefreshCw, History, ChevronDown, ChevronUp, Plus, Heart, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SortableWatchCard } from "@/components/SortableWatchCard";
import { WatchCaseGrid } from "@/components/WatchCaseGrid";
import { PastWatchCard } from "@/components/PastWatchCard";
import { PastWatchesStats } from "@/components/PastWatchesStats";
import { AddWatchDialog } from "@/components/AddWatchDialog";
import { AddItemDialog } from "@/components/AddItemDialog";
import { QuickAddWearDialog } from "@/components/QuickAddWearDialog";
import { EditCollectionDialog } from "@/components/EditCollectionDialog";
import { CreateFirstCollectionDialog } from "@/components/CreateFirstCollectionDialog";
import { CollectionSwitcher } from "@/components/CollectionSwitcher";
import { AnalyzeWatchMetadataDialog } from "@/components/AnalyzeWatchMetadataDialog";
import { ImportSpreadsheetDialog } from "@/components/ImportSpreadsheetDialog";

import { WishlistTable } from "@/components/WishlistTable";
import { TastePreferences } from "@/components/TastePreferences";
import { AddWishlistDialog } from "@/components/AddWishlistDialog";
import { useWatchData } from "@/hooks/useWatchData";
import { usePastWatchData } from "@/hooks/usePastWatchData";
import { useStatsCalculations } from "@/hooks/useStatsCalculations";
import { useTripData } from "@/hooks/useTripData";
import { useWaterUsageData } from "@/hooks/useWaterUsageData";
import { useWishlistData } from "@/hooks/useWishlistData";
import { useAllowedUserCheck } from "@/hooks/useAllowedUserCheck";
import { useCollection } from "@/contexts/CollectionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

const Collection = () => {
  const { selectedCollectionId, currentCollection, currentCollectionType, currentCollectionConfig, collections, collectionsLoading, refetchCollections } = useCollection();
  const { watches, wearEntries, loading, refetch } = useWatchData(selectedCollectionId);
  const { pastWatches, wearEntries: pastWearEntries, loading: pastLoading, refetch: refetchPast } = usePastWatchData();
  const { trips } = useTripData();
  const { waterUsages } = useWaterUsageData();
  const { wishlist, loading: wishlistLoading, refetch: refetchWishlist } = useWishlistData();
  const { isAllowed } = useAllowedUserCheck();
  const { isAdmin, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [localWatches, setLocalWatches] = useState(watches);
  const [showPastWatches, setShowPastWatches] = useState(false);
  const [activeTab, setActiveTab] = useState("collection");
  const [wishlistDialogOpen, setWishlistDialogOpen] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [remainingWishlistUsage, setRemainingWishlistUsage] = useState<number | null>(null);
  const { toast } = useToast();

  const handleRefetchAll = () => {
    refetch();
    refetchPast();
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update local watches when watches prop changes
  useEffect(() => {
    setLocalWatches(watches);
  }, [watches]);

  // Check wishlist usage limits
  useEffect(() => {
    if (isAllowed && user) {
      checkWishlistUsageLimit();
    }
  }, [isAllowed, user]);

  const checkWishlistUsageLimit = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_ai_feature_usage', {
        _user_id: user.id,
        _feature_name: 'wishlist'
      });
      if (error) throw error;
      if (data && data.length > 0) {
        setRemainingWishlistUsage(Number(data[0].remaining_count));
      }
    } catch (error) {
      console.error("Error checking wishlist usage limit:", error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localWatches.findIndex((w) => w.id === active.id);
    const newIndex = localWatches.findIndex((w) => w.id === over.id);

    const newOrder = arrayMove(localWatches, oldIndex, newIndex);
    setLocalWatches(newOrder);

    // Update sort_order in database
    try {
      const updates = newOrder.map((watch, index) => ({
        id: watch.id,
        sort_order: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from("watches")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }

      toast({
        title: "Order Updated",
        description: "Watch order has been saved",
      });
    } catch (error) {
      console.error("Error updating watch order:", error);
      toast({
        title: "Error",
        description: "Failed to update watch order",
        variant: "destructive",
      });
      // Revert on error
      setLocalWatches(watches);
    }
  };

  const stats = useStatsCalculations(watches, wearEntries, trips, waterUsages);

  const handleBulkUpdatePrices = async () => {
    setIsBulkUpdating(true);
    let successCount = 0;
    let errorCount = 0;

    toast({
      title: "Updating Prices",
      description: `Fetching market prices for ${watches.length} watches...`,
    });

    for (const watch of watches) {
      try {
        // Extract year from when_bought
        let year: number | undefined;
        if (watch.when_bought) {
          const yearMatch = watch.when_bought.match(/\d{4}/);
          if (yearMatch) {
            year = parseInt(yearMatch[0]);
          }
        }

        const { data, error } = await supabase.functions.invoke('fetch-watch-price', {
          body: { 
            brand: watch.brand, 
            model: watch.model,
            watchId: watch.id,
            dialColor: watch.dial_color,
            year,
            caseSize: watch.case_size,
            movement: watch.movement,
            hasSapphire: watch.has_sapphire
          }
        });

        if (error || data.error) {
          errorCount++;
        } else {
          successCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        errorCount++;
      }
    }

    setIsBulkUpdating(false);
    refetch();

    toast({
      title: "Bulk Update Complete",
      description: `Updated ${successCount} watches. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
    });
  };

  const handleGenerateSuggestions = async (tasteDescription: string) => {
    if (!user) return;
    
    setIsGeneratingSuggestions(true);
    try {
      const { data: canUse, error: canUseError } = await supabase.rpc('can_use_ai_feature', {
        _user_id: user.id,
        _feature_name: 'wishlist'
      });

      if (canUseError) throw canUseError;
      if (!canUse) {
        toast({
          title: "Monthly Limit Reached",
          description: "You've used all AI wishlist suggestions this month. Resets next month.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("suggest-watches", {
        body: { tasteDescription },
      });

      if (error) throw error;

      // Clear existing AI suggestions first
      await (supabase.from('wishlist' as any) as any)
        .delete()
        .eq('user_id', user.id)
        .eq('is_ai_suggested', true);

      // Add new suggestions
      if (data?.suggestions?.length > 0) {
        const suggestionsToInsert = data.suggestions.map((s: any, index: number) => ({
          brand: s.brand,
          model: s.model,
          dial_colors: s.dial_colors || 'Various',
          rank: index + 1,
          notes: s.notes || s.reason,
          is_ai_suggested: true,
          user_id: user.id,
        }));

        await (supabase.from('wishlist' as any) as any).insert(suggestionsToInsert);
      }

      // Record usage
      await supabase.from("ai_feature_usage").insert([{
        user_id: user.id,
        feature_name: 'wishlist'
      }]);

      await checkWishlistUsageLimit();
      refetchWishlist();

      toast({
        title: "Suggestions Generated",
        description: `Added ${data?.suggestions?.length || 0} AI-powered watch suggestions`,
      });
    } catch (error: any) {
      console.error("Error generating suggestions:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate suggestions",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleClearAISuggestions = async () => {
    if (!user) return;
    try {
      await (supabase.from('wishlist' as any) as any)
        .delete()
        .eq('user_id', user.id)
        .eq('is_ai_suggested', true);
      
      refetchWishlist();
      toast({
        title: "Cleared",
        description: "AI suggestions have been removed",
      });
    } catch (error) {
      console.error("Error clearing AI suggestions:", error);
    }
  };

  // Show onboarding dialog if user has no collections
  if (!collectionsLoading && collections.length === 0) {
    return <CreateFirstCollectionDialog onSuccess={refetchCollections} />;
  }

  if (loading || collectionsLoading || !selectedCollectionId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-textMuted">Loading collection...</p>
        </div>
      </div>
    );
  }

  const filteredWatches = localWatches.filter((watch) => {
    const matchesSearch =
      watch.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      watch.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand =
      selectedBrand === "all" || watch.brand === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  const uniqueBrands = Array.from(new Set(watches.map((w) => w.brand))).sort();

  const userWishlistItems = wishlist.filter(item => !item.is_ai_suggested);
  const aiSuggestedItems = wishlist.filter(item => item.is_ai_suggested);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <CollectionSwitcher />
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl md:text-4xl font-semibold text-textMain">
                    {currentCollection?.name || "My Collection"}
                  </h1>
                  {currentCollection && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      currentCollection.role === 'owner' 
                        ? 'bg-primary/10 text-primary' 
                        : currentCollection.role === 'editor'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {currentCollection.role === 'owner' ? 'Owner' : currentCollection.role === 'editor' ? 'Editor' : 'Viewer'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-textMuted mt-1">
                  {watches.length} {watches.length === 1 ? currentCollectionConfig.singularLabel.toLowerCase() : currentCollectionConfig.pluralLabel.toLowerCase()} in {currentCollection?.role === 'owner' ? 'your' : 'this'} collection
                </p>
              </div>
              {currentCollection && currentCollection.role === 'owner' && (
                <EditCollectionDialog 
                  collectionId={currentCollection.id}
                  currentName={currentCollection.name}
                  onSuccess={refetchCollections}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="collection" className="gap-2">
            <Search className="w-4 h-4 hidden sm:inline" />
            Collection
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="gap-2">
            <Heart className="w-4 h-4 hidden sm:inline" />
            Wishlist
          </TabsTrigger>
        </TabsList>

        {/* Collection Tab */}
        <TabsContent value="collection" className="space-y-6">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="flex gap-2">
              {currentCollectionType === 'watches' && <QuickAddWearDialog watches={watches} onSuccess={refetch} />}
              {currentCollectionType === 'watches' ? (
                <AddWatchDialog onSuccess={refetch} />
              ) : (
                <AddItemDialog onSuccess={refetch} />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {isAdmin && <ImportSpreadsheetDialog />}
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkUpdatePrices}
                disabled={isBulkUpdating || watches.length === 0}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isBulkUpdating ? 'animate-spin' : ''}`} />
                {isBulkUpdating ? 'Updating...' : 'Update All Prices'}
              </Button>
              <AnalyzeWatchMetadataDialog watches={watches} onSuccess={refetch} />
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={`Search ${currentCollectionConfig.pluralLabel.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {uniqueBrands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Watch Case Showcase */}
          {filteredWatches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery || selectedBrand !== "all"
                  ? `No ${currentCollectionConfig.pluralLabel.toLowerCase()} match your filters`
                  : `No ${currentCollectionConfig.pluralLabel.toLowerCase()} yet. Add your first ${currentCollectionConfig.singularLabel.toLowerCase()}!`}
              </p>
            </div>
          ) : (
            <WatchCaseGrid watches={filteredWatches} wearEntries={wearEntries} onDelete={refetch} />
          )}

          {/* Past Items Section */}
          {pastWatches.length > 0 && (
            <div className="mt-12 pt-8 border-t border-borderSubtle">
              <button
                onClick={() => setShowPastWatches(!showPastWatches)}
                className="flex items-center gap-3 w-full text-left mb-4 group"
              >
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-textMuted" />
                  <h2 className="text-xl font-semibold text-textMain">Past {currentCollectionConfig.pluralLabel}</h2>
                  <span className="text-sm text-textMuted">({pastWatches.length})</span>
                </div>
                {showPastWatches ? (
                  <ChevronUp className="w-5 h-5 text-textMuted group-hover:text-textMain transition-colors" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-textMuted group-hover:text-textMain transition-colors" />
                )}
              </button>
              
              {showPastWatches && (
                <>
                  <p className="text-sm text-textMuted mb-4">
                    {currentCollectionConfig.pluralLabel} you've sold or traded. Historical {currentCollectionConfig.usageNoun} data is preserved.
                  </p>
                  <PastWatchesStats pastWatches={pastWatches} wearEntries={pastWearEntries} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {pastWatches.map((watch) => (
                      <PastWatchCard
                        key={watch.id}
                        watch={watch}
                        totalDays={pastWearEntries.filter((w) => w.watch_id === watch.id).length}
                        onUpdate={handleRefetchAll}
                        collectionId={selectedCollectionId || ''}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </TabsContent>

        {/* Wishlist Tab */}
        <TabsContent value="wishlist" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-textMain">My Wishlist</h2>
              <p className="text-sm text-textMuted">Track {currentCollectionConfig.pluralLabel.toLowerCase()} you'd love to add to your collection</p>
            </div>
            <Button onClick={() => setWishlistDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add to Wishlist
            </Button>
          </div>

          {/* User Wishlist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                My Wishlist Items
              </CardTitle>
              <CardDescription>
                {userWishlistItems.length} {userWishlistItems.length === 1 ? 'item' : 'items'} on your wishlist
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WishlistTable 
                items={userWishlistItems} 
                onDelete={refetchWishlist} 
                showAISuggested={false}
              />
            </CardContent>
          </Card>

          {/* AI Suggestions - Only show if user is allowed */}
          {isAllowed && (
            <div className="space-y-4">
              <TastePreferences 
                onSuggest={handleGenerateSuggestions}
                isGenerating={isGeneratingSuggestions}
                remainingUsage={remainingWishlistUsage}
              />

              {aiSuggestedItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-accent" />
                          AI Suggestions
                        </CardTitle>
                        <CardDescription>
                          Personalized recommendations based on your taste
                        </CardDescription>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleClearAISuggestions}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <WishlistTable 
                      items={aiSuggestedItems} 
                      onDelete={refetchWishlist}
                      showAISuggested={true}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <AddWishlistDialog 
            open={wishlistDialogOpen}
            onOpenChange={setWishlistDialogOpen}
            onSuccess={refetchWishlist}
          />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default Collection;
