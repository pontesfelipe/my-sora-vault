import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Plus, Trash2, Watch } from "lucide-react";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
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

interface ListDetailViewProps {
  list: { id: string; name: string; is_system?: boolean };
  watches: any[];
  onBack: () => void;
  onDelete?: () => void;
}

export const ListDetailView = ({ list, watches, onBack, onDelete }: ListDetailViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [listItems, setListItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteListConfirm, setDeleteListConfirm] = useState(false);

  useEffect(() => {
    if (list.id === "__trade__") {
      // Trade list is virtual — derive from watches marked available_for_trade
      const tradeItems = watches
        .filter((w) => w.available_for_trade)
        .map((w) => ({ id: w.id, watch_id: w.id, watches: w }));
      setListItems(tradeItems);
      setLoading(false);
      return;
    }
    fetchListItems();
  }, [list.id]);

  const fetchListItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("list_items")
        .select("*, watches(*)")
        .eq("list_id", list.id);

      if (error) throw error;
      setListItems(data || []);
    } catch (error) {
      console.error("Error fetching list items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWatch = async (watchId: string) => {
    try {
      if (list.id === "__trade__") {
        const { error } = await supabase
          .from("watches")
          .update({ available_for_trade: true })
          .eq("id", watchId);
        if (error) throw error;
        // Re-derive trade items
        const updated = watches.map((w) =>
          w.id === watchId ? { ...w, available_for_trade: true } : w
        );
        setListItems(
          updated
            .filter((w) => w.available_for_trade)
            .map((w) => ({ id: w.id, watch_id: w.id, watches: w }))
        );
        toast({ title: "Added", description: "Item marked as available for trade" });
        setAddDialogOpen(false);
        return;
      }

      // Check if already in list
      const existing = listItems.find((li) => li.watch_id === watchId);
      if (existing) {
        toast({ title: "Already in list", description: "This item is already in this list" });
        return;
      }

      const { error } = await supabase
        .from("list_items")
        .insert([{ list_id: list.id, watch_id: watchId }]);

      if (error) throw error;
      toast({ title: "Added", description: "Item added to list" });
      fetchListItems();
      setAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding to list:", error);
      toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      if (list.id === "__trade__") {
        const { error } = await supabase
          .from("watches")
          .update({ available_for_trade: false })
          .eq("id", itemId);
        if (error) throw error;
        setListItems((prev) => prev.filter((li) => li.id !== itemId));
        toast({ title: "Removed", description: "Item no longer available for trade" });
        return;
      }

      const { error } = await supabase.from("list_items").delete().eq("id", itemId);
      if (error) throw error;
      toast({ title: "Removed", description: "Item removed from list" });
      fetchListItems();
    } catch (error) {
      console.error("Error removing item:", error);
      toast({ title: "Error", description: "Failed to remove item", variant: "destructive" });
    }
  };

  const handleDeleteList = async () => {
    try {
      // Delete all items first
      await supabase.from("list_items").delete().eq("list_id", list.id);
      // Then delete the list
      const { error } = await supabase.from("user_lists").delete().eq("id", list.id);
      if (error) throw error;
      toast({ title: "Deleted", description: `"${list.name}" has been deleted` });
      onDelete?.();
      onBack();
    } catch (error) {
      console.error("Error deleting list:", error);
      toast({ title: "Error", description: "Failed to delete list", variant: "destructive" });
    }
  };

  const watchesInList = listItems.map((li) => li.watch_id);
  const availableWatches = watches.filter((w) => !watchesInList.includes(w.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold text-textMain">{list.name}</h3>
          <span className="text-xs text-muted-foreground">({listItems.length} items)</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
          {!list.is_system && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteListConfirm(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
        </div>
      ) : listItems.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-borderSubtle">
          <Watch className="h-8 w-8 text-textMuted mx-auto mb-2" />
          <p className="text-sm text-textMuted">No items in this list yet</p>
          <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add from collection
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {listItems.map((item) => {
            const watch = item.watches;
            if (!watch) return null;
            return (
              <Card
                key={item.id}
                className="flex items-center gap-3 p-3 border-borderSubtle"
              >
                <div
                  className="h-10 w-10 rounded-xl bg-surfaceMuted overflow-hidden shrink-0 cursor-pointer"
                  onClick={() => navigate(`/watch/${watch.id}`)}
                >
                  {watch.ai_image_url ? (
                    <img src={watch.ai_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Watch className="h-4 w-4 text-textMuted" />
                    </div>
                  )}
                </div>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/watch/${watch.id}`)}
                >
                  <p className="text-sm font-medium text-textMain truncate">{watch.brand}</p>
                  <p className="text-xs text-textMuted truncate">{watch.model}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Watch Dialog */}
      <ResponsiveDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} title="Add to List">
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {availableWatches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              All items in your collection are already in this list
            </p>
          ) : (
            availableWatches.map((watch) => (
              <Card
                key={watch.id}
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surfaceMuted transition-colors border-borderSubtle"
                onClick={() => handleAddWatch(watch.id)}
              >
                <div className="h-10 w-10 rounded-xl bg-surfaceMuted overflow-hidden shrink-0">
                  {watch.ai_image_url ? (
                    <img src={watch.ai_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Watch className="h-4 w-4 text-textMuted" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-textMain truncate">{watch.brand}</p>
                  <p className="text-xs text-textMuted truncate">{watch.model}</p>
                </div>
                <Plus className="h-4 w-4 text-accent shrink-0" />
              </Card>
            ))
          )}
        </div>
      </ResponsiveDialog>

      {/* Delete List Confirmation */}
      <AlertDialog open={deleteListConfirm} onOpenChange={setDeleteListConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{list.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this list and remove all items from it. Your collection items won't be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteList}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
