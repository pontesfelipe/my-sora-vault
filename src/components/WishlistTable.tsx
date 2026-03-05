import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WishlistItem {
  id: string;
  brand: string;
  model: string;
  dial_colors: string;
  rank: number;
  notes?: string;
  is_ai_suggested: boolean;
}

interface WishlistTableProps {
  items: WishlistItem[];
  onDelete: () => void;
  showAISuggested?: boolean;
  showDeleteButton?: boolean;
}

export const WishlistTable = ({ items, onDelete, showAISuggested = false, showDeleteButton = true }: WishlistTableProps) => {
  const { t } = useTranslation();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deleteId) return;

    console.log("Attempting to delete wishlist item:", deleteId);

    try {
      const { error, data } = await (supabase.from('wishlist' as any) as any)
        .delete()
        .eq("id", deleteId)
        .select();

      console.log("Delete result:", { error, data });

      if (error) throw error;

      toast({
        title: t("wishlistTable.deleted"),
        description: t("wishlistTable.removedFromWishlist"),
      });

      setDeleteId(null);
      onDelete();
    } catch (error) {
      console.error("Error deleting wishlist item:", error);
      toast({
        title: t("wishlistTable.error"),
        description: t("wishlistTable.failedDelete"),
        variant: "destructive",
      });
    }
  };

  // Since items are already pre-filtered by parent, just use all items passed in
  const filteredItems = items;

  const sortedItems = [...filteredItems].sort((a, b) => a.rank - b.rank);

  if (sortedItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {showAISuggested 
          ? t("wishlistTable.noAiSuggestions")
          : t("wishlistTable.emptyWishlist")}
      </div>
    );
  }

  return (
    <>
      <div className="table-mobile-wrapper">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] sm:w-[80px]">{t("wishlistTable.rank")}</TableHead>
              <TableHead>{t("wishlistTable.brand")}</TableHead>
              <TableHead>{t("wishlistTable.model")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("wishlistTable.dialColors")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("wishlistTable.notes")}</TableHead>
              {showDeleteButton && <TableHead className="w-[60px] sm:w-[100px]">{t("wishlistTable.actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {item.rank > 0 && item.rank <= 5 && (
                      <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-500 text-yellow-500" />
                    )}
                    <span className="font-medium text-sm">{item.rank || "-"}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-sm">{item.brand}</TableCell>
                <TableCell className="text-sm">{item.model}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm">{item.dial_colors}</TableCell>
                <TableCell className="hidden md:table-cell max-w-xs truncate text-sm">
                  {item.notes || "-"}
                </TableCell>
                {showDeleteButton && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("wishlistTable.removeFromWishlist")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("wishlistTable.removeDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("wishlistTable.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("wishlistTable.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
