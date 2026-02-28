import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Plus } from "lucide-react";

interface CreateListDialogProps {
  onSuccess?: () => void;
}

export const CreateListDialog = ({ onSuccess }: CreateListDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("user_lists").insert([
        { name: name.trim(), user_id: user.id, is_system: false, list_type: "custom" },
      ]);

      if (error) throw error;

      toast({ title: "List created", description: `"${name}" has been created` });
      setName("");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating list:", error);
      toast({ title: "Error", description: "Failed to create list", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Plus className="w-4 h-4" />
        New List
      </Button>
      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Create New List">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="list-name">List Name</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Dive Watches", "My Top 10"'
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create List"}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
};
