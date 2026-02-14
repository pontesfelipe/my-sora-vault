import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Watch as WatchIcon, Calendar, Eye, EyeOff, Trash2, RefreshCw, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { usePasscode } from "@/contexts/PasscodeContext";
import { useAuth } from "@/contexts/AuthContext";
import { EditWatchDialog } from "@/components/EditWatchDialog";
import { EditSneakerSpecsDialog } from "@/components/EditSneakerSpecsDialog";
import { EditPurseSpecsDialog } from "@/components/EditPurseSpecsDialog";
import { useCollection } from "@/contexts/CollectionContext";
import { ItemTypeIcon } from "@/components/ItemTypeIcon";
import { isSneakerCollection, isPurseCollection } from "@/types/collection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WatchCardProps {
  watch: {
    id: string;
    brand: string;
    model: string;
    dial_color: string;
    type: string;
    cost: number;
    msrp?: number;
    case_size?: string;
    lug_to_lug_size?: string;
    caseback_material?: string;
    movement?: string;
    has_sapphire?: boolean;
    average_resale_price?: number;
    warranty_date?: string;
    warranty_card_url?: string;
    when_bought?: string;
    rarity?: string;
    historical_significance?: string;
    available_for_trade?: boolean;
    metadata_analysis_reasoning?: string;
    ai_image_url?: string;
  };
  totalDays: number;
  onDelete: () => void;
}

export const WatchCard = ({ watch, totalDays, onDelete }: WatchCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { requestVerification, isVerified } = usePasscode();
  const { currentCollectionConfig, currentCollectionType } = useCollection();
  const singularLabel = currentCollectionConfig.singularLabel;
  const [showCost, setShowCost] = useState(isAdmin);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [showReasoningDialog, setShowReasoningDialog] = useState(false);
  
  const isSneaker = currentCollectionType ? isSneakerCollection(currentCollectionType) : false;
  const isPurse = currentCollectionType ? isPurseCollection(currentCollectionType) : false;

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

  const handleDeleteClick = () => {
    if (!isVerified) {
      requestVerification(() => {
        setShowDeleteDialog(true);
      });
    } else {
      setShowDeleteDialog(true);
    }
  };

  const handleFullDelete = async () => {
    try {
      // Delete related data first
      await supabase.from("wear_entries").delete().eq("watch_id", watch.id);
      await supabase.from("water_usage").delete().eq("watch_id", watch.id);
      await supabase.from("watch_specs").delete().eq("watch_id", watch.id);
      
      // Delete the watch
      const { error } = await supabase.from("watches").delete().eq("id", watch.id);

      if (error) throw error;

      toast({
        title: `${singularLabel} Deleted`,
        description: `${singularLabel} and all related data permanently removed`,
      });

      setShowDeleteDialog(false);
      onDelete();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete ${singularLabel.toLowerCase()}`,
        variant: "destructive",
      });
    }
  };

  const handleMarkAsSoldOrTraded = async (status: 'sold' | 'traded') => {
    try {
      const { error } = await supabase
        .from("watches")
        .update({ status, collection_id: null })
        .eq("id", watch.id);

      if (error) throw error;

      toast({
        title: status === 'sold' ? `${singularLabel} Marked as Sold` : `${singularLabel} Marked as Traded`,
        description: "Removed from collection. Historical data preserved.",
      });

      setShowDeleteDialog(false);
      onDelete();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update ${singularLabel.toLowerCase()} status`,
        variant: "destructive",
      });
    }
  };

  const handleFetchPrice = async () => {
    setIsFetchingPrice(true);
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

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Price Updated",
        description: `Market price: $${data.price.toLocaleString()} (${data.confidence} confidence)`,
      });

      // Refresh the page to show updated price
      onDelete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch market price",
        variant: "destructive",
      });
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const costPerUse = totalDays > 0 ? watch.cost / totalDays : watch.cost;

  return (
    <Card className="group relative overflow-hidden border-borderSubtle bg-surface hover:shadow-luxury transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-3 sm:p-4 md:p-5">
        
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <ItemTypeIcon type={currentCollectionType} className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <h3 className="font-semibold text-sm sm:text-[17px] text-textMain truncate">{watch.brand}</h3>
            </div>
            <p className="text-xs sm:text-sm text-textSoft truncate">{watch.model}</p>
          </div>
          <Badge variant="secondary" className="text-[10px] sm:text-xs font-medium flex-shrink-0">
            {watch.type}
          </Badge>
        </div>

        <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-textMuted">{currentCollectionConfig.primaryColorLabel}</span>
            <span className="font-medium text-textMain">{watch.dial_color}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-textMuted">Rarity</span>
            <div className="flex items-center gap-1">
              <Badge variant={
                watch.rarity === 'grail' ? 'default' :
                watch.rarity === 'very_rare' ? 'destructive' :
                watch.rarity === 'rare' ? 'secondary' : 'outline'
              } className="text-xs capitalize">
                {watch.rarity ? watch.rarity.replace('_', ' ') : 'common'}
              </Badge>
              {watch.metadata_analysis_reasoning && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => setShowReasoningDialog(true)}
                >
                  <Info className="w-3 h-3 text-textMuted" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-textMuted">Historical</span>
            <div className="flex items-center gap-1">
              <Badge variant={
                watch.historical_significance === 'historically_significant' ? 'default' :
                watch.historical_significance === 'notable' ? 'secondary' : 'outline'
              } className="text-xs capitalize">
                {watch.historical_significance ? watch.historical_significance.replace('_', ' ') : 'regular'}
              </Badge>
              {watch.metadata_analysis_reasoning && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => setShowReasoningDialog(true)}
                >
                  <Info className="w-3 h-3 text-textMuted" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-textMuted">Open to Trade</span>
            <Badge variant={watch.available_for_trade ? 'default' : 'outline'} className="text-xs">
              {watch.available_for_trade ? 'Available' : 'Not Available'}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-textMuted">Cost</span>
            <div className="flex items-center gap-2">
              {showCost ? (
                <span className="font-medium text-textMain">${watch.cost.toLocaleString()}</span>
              ) : (
                <span className="font-medium text-textMuted">••••••</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleToggleCost}
              >
                {showCost ? (
                  <EyeOff className="w-4 h-4 text-textMuted" />
                ) : (
                  <Eye className="w-4 h-4 text-textMuted" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-textMuted">Cost/Day</span>
            <div className="flex items-center gap-2">
              {showCost ? (
                <span className="font-medium text-primary">${costPerUse.toFixed(0)}</span>
              ) : (
                <span className="font-medium text-textMuted">••••</span>
              )}
            </div>
          </div>
          
          {watch.average_resale_price ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-textMuted">Resale Value</span>
              <div className="flex items-center gap-2">
                {showCost ? (
                  <span className="font-medium text-textMain">${watch.average_resale_price.toLocaleString()}</span>
                ) : (
                  <span className="font-medium text-textMuted">••••••</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleFetchPrice}
                  disabled={isFetchingPrice}
                  title="Update market price"
                >
                  <RefreshCw className={`w-3 h-3 text-textMuted ${isFetchingPrice ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span className="text-textMuted">Resale Value</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleFetchPrice}
                disabled={isFetchingPrice}
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingPrice ? 'animate-spin' : ''}`} />
                {isFetchingPrice ? 'Fetching...' : 'Get Price'}
              </Button>
            </div>
          )}
          
          {watch.warranty_date && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-textMuted">Warranty</span>
              <span className={`font-medium text-xs ${new Date(watch.warranty_date) < new Date() ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                {new Date(watch.warranty_date) < new Date() ? 'Expired' : 'Valid'}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-borderSubtle">
            <div className="flex items-center gap-1.5 sm:gap-2 text-textMuted">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Days Worn</span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-primary">{totalDays}</span>
          </div>
        </div>

        <div className="flex gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 sm:gap-2 border-borderSubtle hover:bg-surfaceMuted text-xs sm:text-sm h-9 sm:h-10"
            onClick={() => navigate(`/watch/${watch.id}`)}
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Details</span>
            <span className="xs:hidden">View</span>
          </Button>

          <EditWatchDialog watch={watch} onSuccess={onDelete} />

          {isSneaker && (
            <EditSneakerSpecsDialog 
              itemId={watch.id} 
              itemName={`${watch.brand} ${watch.model}`}
              onSuccess={onDelete} 
            />
          )}

          {isPurse && (
            <EditPurseSpecsDialog 
              itemId={watch.id} 
              itemName={`${watch.brand} ${watch.model}`}
              onSuccess={onDelete} 
            />
          )}

          <Button
            variant="outline" 
            size="sm" 
            className="gap-1.5 sm:gap-2 border-borderSubtle hover:bg-destructive hover:text-destructive-foreground hover:border-destructive h-9 sm:h-10 px-2 sm:px-3"
            onClick={handleDeleteClick}
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>

          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="bg-surface border-borderSubtle sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-textMain">Remove {singularLabel}</DialogTitle>
                <DialogDescription className="text-textSoft">
                  How would you like to remove <span className="font-semibold">{watch.brand} {watch.model}</span> from your collection?
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 pt-4">
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3 border-borderSubtle hover:bg-surfaceMuted"
                  onClick={() => handleMarkAsSoldOrTraded('sold')}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Mark as Sold</span>
                    <span className="text-xs text-textMuted">Remove from collection, keep historical wear data</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3 border-borderSubtle hover:bg-surfaceMuted"
                  onClick={() => handleMarkAsSoldOrTraded('traded')}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Mark as Traded</span>
                    <span className="text-xs text-textMuted">Remove from collection, keep historical wear data</span>
                  </div>
                </Button>
                <Button
                  variant="destructive"
                  className="justify-start gap-3 h-auto py-3"
                  onClick={handleFullDelete}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Delete Permanently</span>
                    <span className="text-xs opacity-80">Remove watch and all related data forever</span>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  className="mt-2"
                  onClick={() => setShowDeleteDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
};
