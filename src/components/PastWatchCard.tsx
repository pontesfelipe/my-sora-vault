import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, RotateCcw, Trash2, Watch as WatchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCollection } from "@/contexts/CollectionContext";

interface PastWatchCardProps {
  watch: {
    id: string;
    brand: string;
    model: string;
    dial_color: string;
    type: string;
    cost: number;
    status: string;
    when_bought?: string;
  };
  totalDays: number;
  onUpdate: () => void;
  collectionId: string;
}

export const PastWatchCard = ({ watch, totalDays, onUpdate, collectionId }: PastWatchCardProps) => {
  const { toast } = useToast();
  const { currentCollectionConfig, currentCollectionType } = useCollection();
  const singularLabel = currentCollectionConfig.singularLabel;
  const usageVerbPast = currentCollectionConfig.usageVerbPast;
  const usageNoun = currentCollectionConfig.usageNoun;
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const { error } = await supabase
        .from("watches")
        .update({ status: 'active', collection_id: collectionId })
        .eq("id", watch.id);

      if (error) throw error;

      toast({
        title: `${singularLabel} Restored`,
        description: `${watch.brand} ${watch.model} is back in your collection`,
      });

      setShowRestoreDialog(false);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to restore ${singularLabel.toLowerCase()}`,
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePermanentDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete related data first
      await supabase.from("wear_entries").delete().eq("watch_id", watch.id);
      await supabase.from("water_usage").delete().eq("watch_id", watch.id);
      await supabase.from("watch_specs").delete().eq("watch_id", watch.id);
      
      // Delete the item
      const { error } = await supabase.from("watches").delete().eq("id", watch.id);

      if (error) throw error;

      toast({
        title: `${singularLabel} Deleted`,
        description: `${singularLabel} and all related data permanently removed`,
      });

      setShowRestoreDialog(false);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete ${singularLabel.toLowerCase()}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-borderSubtle bg-surfaceMuted/50 opacity-75 hover:opacity-100 transition-all duration-300">
      <div className="relative p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <WatchIcon className="w-4 h-4 text-textMuted" />
              <h3 className="font-semibold text-sm text-textMain">{watch.brand}</h3>
            </div>
            <p className="text-xs text-textSoft">{watch.model}</p>
          </div>
          <Badge 
            variant={watch.status === 'sold' ? 'secondary' : 'outline'} 
            className="text-xs capitalize"
          >
            {watch.status}
          </Badge>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-textMuted">{currentCollectionConfig.primaryColorLabel}</span>
            <span className="text-textSoft">{watch.dial_color}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-textMuted">{currentCollectionConfig.typeLabel}</span>
            <span className="text-textSoft">{watch.type}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-borderSubtle">
            <div className="flex items-center gap-1 text-textMuted">
              <Calendar className="w-3 h-3" />
              <span className="text-xs">Total Days {usageVerbPast.charAt(0).toUpperCase() + usageVerbPast.slice(1)}</span>
            </div>
            <span className="text-lg font-bold text-primary">{totalDays}</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => setShowRestoreDialog(true)}
        >
          <RotateCcw className="w-3 h-3" />
          Manage
        </Button>

        <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <DialogContent className="bg-surface border-borderSubtle sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-textMain">Manage Past {singularLabel}</DialogTitle>
              <DialogDescription className="text-textSoft">
                {watch.brand} {watch.model} was marked as {watch.status}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-4">
              <Button
                variant="outline"
                className="justify-start gap-3 h-auto py-3 border-borderSubtle"
                onClick={handleRestore}
                disabled={isRestoring || isDeleting}
              >
                <RotateCcw className="w-4 h-4" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">Restore to Collection</span>
                  <span className="text-xs text-textMuted">Bring back to active collection</span>
                </div>
              </Button>
              <Button
                variant="destructive"
                className="justify-start gap-3 h-auto py-3"
                onClick={handlePermanentDelete}
                disabled={isRestoring || isDeleting}
              >
                <Trash2 className="w-4 h-4" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">Delete Permanently</span>
                  <span className="text-xs opacity-80">Remove all data forever</span>
                </div>
              </Button>
              <Button
                variant="ghost"
                className="mt-2"
                onClick={() => setShowRestoreDialog(false)}
                disabled={isRestoring || isDeleting}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
};