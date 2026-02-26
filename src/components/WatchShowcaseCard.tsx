import { motion } from "framer-motion";
import { Eye, Calendar, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import watchHero from "@/assets/watch-hero.jpg";

interface WatchShowcaseCardProps {
  watch: {
    id: string;
    brand: string;
    model: string;
    dial_color: string;
    type: string;
    cost: number;
    image_url?: string;
    ai_image_url?: string;
    rarity?: string;
    available_for_trade?: boolean;
  };
  totalDays: number;
  index: number;
  onDelete?: () => void;
}

export const WatchShowcaseCard = ({ watch, totalDays, index, onDelete }: WatchShowcaseCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const imageUrl = watch.ai_image_url || watch.image_url || watchHero;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete related data first
      await supabase.from("wear_entries").delete().eq("watch_id", watch.id);
      await supabase.from("water_usage").delete().eq("watch_id", watch.id);
      await supabase.from("watch_specs").delete().eq("watch_id", watch.id);
      await (supabase.from("sneaker_specs" as any) as any).delete().eq("item_id", watch.id);
      await (supabase.from("purse_specs" as any) as any).delete().eq("item_id", watch.id);

      const { error } = await supabase.from("watches").delete().eq("id", watch.id);
      if (error) throw error;

      toast({
        title: "Deleted",
        description: `${watch.brand} ${watch.model} has been removed from your collection`,
      });
      onDelete?.();
    } catch (error) {
      console.error("Error deleting watch:", error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20, rotateX: -8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ delay: index * 0.06, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="group cursor-pointer perspective-[1200px]"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          navigate(`/watch/${watch.id}`);
        }}
      >
        {/* Watch case compartment */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[hsl(var(--watch-case-top))] to-[hsl(var(--watch-case-bottom))] p-[3px] shadow-[0_8px_32px_-8px_hsl(var(--watch-case-shadow))] group-hover:shadow-[0_16px_48px_-8px_hsl(var(--watch-case-shadow))] transition-shadow duration-500">
          
          {/* Inner velvet cushion */}
          <div className="relative rounded-[13px] overflow-hidden bg-gradient-to-br from-[hsl(var(--watch-velvet-start))] to-[hsl(var(--watch-velvet-end))]">
            
            {/* Glass reflection overlay */}
            <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-br from-white/[0.12] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-transparent via-transparent to-white/[0.06]" />
            
            {/* Watch image area */}
            <div className="relative aspect-square flex items-center justify-center p-6 overflow-hidden">
              {/* Subtle radial cushion glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--watch-cushion-glow))_0%,transparent_70%)]" />
              
              <motion.img
                src={imageUrl}
                alt={`${watch.brand} ${watch.model}`}
                className="relative z-10 w-full h-full object-cover rounded-lg drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)] group-hover:scale-105 transition-transform duration-500"
                whileHover={{ rotateY: 5, rotateX: -3 }}
                style={{ transformStyle: "preserve-3d" }}
              />
              
              {/* Delete button - appears on hover */}
              {onDelete && (
                <div className="absolute bottom-3 right-3 z-30">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7 rounded-full shadow-lg opacity-80 hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              
              {/* Trade badge */}
              {watch.available_for_trade && (
                <div className="absolute top-3 left-3 z-30">
                  <Badge className="text-[10px] bg-accent/90 text-accent-foreground backdrop-blur-sm shadow-md">
                    Trade
                  </Badge>
                </div>
              )}
              
              {/* Rarity badge */}
              {watch.rarity && watch.rarity !== 'common' && (
                <div className="absolute top-3 right-3 z-30">
                  <Badge variant="secondary" className="text-[10px] backdrop-blur-sm shadow-md capitalize">
                    {watch.rarity.replace('_', ' ')}
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Info strip at bottom - like a nameplate */}
            <div className="relative z-10 px-4 pb-4 pt-1">
              <div className="bg-background/80 backdrop-blur-md rounded-xl px-4 py-3 border border-border/30 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground truncate">{watch.brand}</h3>
                    <p className="text-xs text-muted-foreground truncate">{watch.model}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {totalDays > 0 && (
                      <div className="flex items-center gap-1 text-primary">
                        <Calendar className="w-3 h-3" />
                        <span className="text-xs font-semibold">{totalDays}d</span>
                      </div>
                    )}
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {watch.brand} {watch.model}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this item and all its related data (wear logs, specs, etc.). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
