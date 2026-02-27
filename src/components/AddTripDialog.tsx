import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";

interface AddTripDialogProps {
  watches: { id: string; brand: string; model: string }[];
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddTripDialog = ({ watches, onSuccess, open, onOpenChange }: AddTripDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    location: "",
    startDate: "",
    watchDays: {} as Record<string, number>,
    totalDays: "1",
    purpose: "Business",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalDays = parseFloat(formData.totalDays);
      const watchDaysSum = Object.values(formData.watchDays).reduce((sum, days) => sum + days, 0);
      
      if (watchDaysSum !== totalDays) {
        toast.error(`Watch days (${watchDaysSum}) must equal total trip days (${totalDays})`);
        return;
      }

      const { error } = await supabase.from("trips").insert({
        location: formData.location,
        start_date: formData.startDate,
        watch_model: formData.watchDays,
        days: totalDays,
        purpose: formData.purpose,
        notes: formData.notes || null,
        user_id: user?.id,
      });

      if (error) throw error;

      toast.success("Trip added successfully");
      onOpenChange(false);
      setFormData({ location: "", startDate: "", watchDays: {}, totalDays: "1", purpose: "Business", notes: "" });
      onSuccess();
    } catch (error) {
      console.error("Error adding trip:", error);
      toast.error("Failed to add trip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Add Trip">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Paris, France"
            required
          />
        </div>
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="totalDays">Total Trip Days</Label>
          <Input
            id="totalDays"
            type="number"
            step="0.5"
            min="0.5"
            value={formData.totalDays}
            onChange={(e) => setFormData({ ...formData, totalDays: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Watches & Days Worn</Label>
          <div className="border rounded-md p-3 space-y-3 max-h-64 overflow-y-auto">
            {watches.map((watch) => {
              const watchName = `${watch.brand} ${watch.model}`;
              const days = formData.watchDays[watchName] || 0;
              return (
                <div key={watch.id} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{watchName}</span>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={days}
                    onChange={(e) => {
                      const newDays = parseFloat(e.target.value) || 0;
                      const newWatchDays = { ...formData.watchDays };
                      if (newDays > 0) newWatchDays[watchName] = newDays;
                      else delete newWatchDays[watchName];
                      setFormData({ ...formData, watchDays: newWatchDays });
                    }}
                    className="w-20 h-8"
                    placeholder="0"
                  />
                </div>
              );
            })}
          </div>
          {Object.keys(formData.watchDays).length > 0 && (
            <div className="mt-2 p-2 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                Total allocated: {Object.values(formData.watchDays).reduce((sum, d) => sum + d, 0).toFixed(1)} / {formData.totalDays} days
              </p>
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="purpose">Purpose</Label>
          <Select value={formData.purpose} onValueChange={(value) => setFormData({ ...formData, purpose: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Business">Business</SelectItem>
              <SelectItem value="Vacation">Vacation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional trip details..."
            className="resize-none"
            rows={3}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Trip"}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
};
