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
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import watchHero from "@/assets/watch-hero.jpg";
import { WatchContextMenu, useLongPress } from "./WatchContextMenu";
import { QuickLogSheet } from "./QuickLogSheet";

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
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const imageUrl = watch.ai_image_url || watch.image_url || watchHero;

  const { handlers: longPressHandlers, isLongPress } = useLongPress(() => {
    setShowContextMenu(true);
  });

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
        whileTap={{ scale: 0.98 }}
        className="group cursor-pointer perspective-[1200px]"
        {...longPressHandlers}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          if (isLongPress.current) return;
          navigate(`/watch/${watch.id}`);
        }}
      >
        {/* Watch case compartment */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[hsl(var(--watch-case-top))] to-[hsl(var(--watch-case-bottom))] p-[2px] shadow-[0_8px_32px_-8px_hsl(var(--watch-case-shadow))] group-hover:shadow-[0_16px_48px_-8px_hsl(var(--watch-case-shadow))] transition-all duration-500 group-active:scale-[0.97]">
          
          {/* Inner velvet cushion */}
          <div className="relative rounded-[13px] overflow-hidden bg-gradient-to-br from-[hsl(var(--watch-velvet-start))] to-[hsl(var(--watch-velvet-end))]">
            
            {/* Glass reflection overlay */}
            <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-br from-white/[0.12] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-transparent via-transparent to-white/[0.06]" />
            
            {/* Watch image area */}
            <div className="relative aspect-square flex items-center justify-center p-4 overflow-hidden">
              {/* Subtle radial cushion glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--watch-cushion-glow))_0%,transparent_70%)]" />
              
              <motion.img
                src={imageUrl}
                className="relative z-10 w-full h-full object-cover rounded-lg drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)] group-hover:scale-105 transition-transform duration-500"
                alt={`${watch.brand} ${watch.model}`}
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
                    aria-label={`Delete ${watch.brand} ${watch.model}`}
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
            
            {/* Info strip at bottom - frosted glass nameplate */}
            <div className="relative z-10 px-3 pb-3 pt-1">
              <div className="bg-background/70 dark:bg-background/60 backdrop-blur-xl rounded-xl px-3 py-2.5 border border-border/20 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-foreground truncate tracking-tight">{watch.brand}</h3>
                    <p className="text-[10px] text-muted-foreground truncate">{watch.model}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {totalDays > 0 && (
                      <div className="flex items-center gap-0.5 text-primary">
                        <Calendar className="w-2.5 h-2.5" />
                        <span className="text-[10px] font-semibold">{totalDays}d</span>
                      </div>
                    )}
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Eye className="w-3 h-3 text-primary" />
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
            <AlertDialogTitle>{t("common.deleteConfirmTitle", { item: `${watch.brand} ${watch.model}` })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.deleteConfirmDescription", { item: watch.model })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WatchContextMenu
        open={showContextMenu}
        onOpenChange={setShowContextMenu}
        watch={watch}
        onLogWear={() => setShowQuickLog(true)}
        onDelete={() => setShowDeleteDialog(true)}
      />

      <QuickLogSheet
        open={showQuickLog}
        onOpenChange={setShowQuickLog}
        watch={watch}
        onSuccess={() => onDelete?.()}
      />
    </>
  );
};
