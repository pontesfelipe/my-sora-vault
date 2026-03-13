import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DIAL_COLORS } from "@/constants/dialColors";
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
  const { t } = useTranslation();
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
        title: t("addWishlist.missingFields"),
        description: t("addWishlist.fillRequired"),
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
        title: t("addWishlist.success"),
        description: t("addWishlist.watchAdded"),
      });

      setFormValues({ brand: "", model: "", dial_colors: "", rank: 0, notes: "" });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast({
        title: t("addWishlist.error"),
        description: t("addWishlist.failedAdd"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={t("addWishlist.title")}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand">{t("addWishlist.brand")} *</Label>
            <Input
              id="brand"
              value={formValues.brand}
              onChange={(e) => setFormValues({ ...formValues, brand: e.target.value })}
              placeholder={t("addWishlist.brandPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">{t("addWishlist.model")} *</Label>
            <Input
              id="model"
              value={formValues.model}
              onChange={(e) => setFormValues({ ...formValues, model: e.target.value })}
              placeholder={t("addWishlist.modelPlaceholder")}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dial_colors">{t("addWishlist.dialColors")} *</Label>
            <Input
              id="dial_colors"
              value={formValues.dial_colors}
              onChange={(e) => setFormValues({ ...formValues, dial_colors: e.target.value })}
              placeholder={t("addWishlist.dialColorsPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rank">{t("addWishlist.priorityRank")}</Label>
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
          <Label htmlFor="notes">{t("addWishlist.notes")}</Label>
          <Textarea
            id="notes"
            value={formValues.notes}
            onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
            placeholder={t("addWishlist.notesPlaceholder")}
            rows={3}
          />
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("addWishlist.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("addWishlist.adding") : t("addWishlist.addToWishlist")}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};