import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";

interface AddWishlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddWishlistDialog = ({ open, onOpenChange, onSuccess }: AddWishlistDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [formValues, setFormValues] = useState({
    brand: "",
    model: "",
    dial_colors: "",
    rank: 0,
    notes: "",
  });
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!formValues.brand || !formValues.model || !formValues.dial_colors) {
      toast({
        title: "Missing required fields",
        description: "Please fill in brand, model, and dial colors",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("wishlist").insert([
        {
          brand: formValues.brand,
          model: formValues.model,
          dial_colors: formValues.dial_colors,
          rank: formValues.rank || 0,
          notes: formValues.notes,
          is_ai_suggested: false,
          user_id: user?.id,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Watch added to wishlist",
      });

      setFormValues({ brand: "", model: "", dial_colors: "", rank: 0, notes: "" });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast({
        title: "Error",
        description: "Failed to add watch to wishlist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Add Watch to Wishlist">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Brand *</Label>
            <Input
              id="brand"
              value={formValues.brand}
              onChange={(e) => setFormValues({ ...formValues, brand: e.target.value })}
              placeholder="e.g., Rolex"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              value={formValues.model}
              onChange={(e) => setFormValues({ ...formValues, model: e.target.value })}
              placeholder="e.g., Submariner Date"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dial_colors">Dial Colors *</Label>
            <Input
              id="dial_colors"
              value={formValues.dial_colors}
              onChange={(e) => setFormValues({ ...formValues, dial_colors: e.target.value })}
              placeholder="e.g., Blue or black"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rank">Priority Rank</Label>
            <Input
              id="rank"
              type="number"
              min="0"
              value={formValues.rank}
              onChange={(e) => setFormValues({ ...formValues, rank: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formValues.notes}
            onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
            placeholder="Any additional notes about this watch..."
            rows={3}
          />
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : "Add to Wishlist"}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
