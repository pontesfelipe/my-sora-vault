import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Watch } from "lucide-react";

interface CreateCollectionTypeDialogProps {
  onSuccess: () => void;
}

export const CreateCollectionTypeDialog = ({ onSuccess }: CreateCollectionTypeDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !user) {
      toast.error(t("createCollectionDialog.nameRequired"));
      return;
    }

    setLoading(true);

    try {
      const { data: collectionData, error: collectionError } = await supabase
        .from("collections" as any)
        .insert({
          name: name.trim(),
          created_by: user.id,
          collection_type: "watches",
        } as any)
        .select()
        .single();

      if (collectionError) throw collectionError;

      const { error: linkError } = await supabase
        .from("user_collections" as any)
        .insert({
          user_id: user.id,
          collection_id: (collectionData as any).id,
          role: "owner",
        } as any);

      if (linkError) throw linkError;

      toast.success(t("createCollectionDialog.createdSuccess"));
      setOpen(false);
      setName("");
      onSuccess();
    } catch (error: any) {
      console.error("Error creating collection:", error);
      toast.error(t("createCollectionDialog.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          {t("createCollectionDialog.newCollection")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("createCollectionDialog.title")}</DialogTitle>
            <DialogDescription>{t("createCollectionDialog.description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("createCollectionDialog.collectionName")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("createCollectionDialog.namePlaceholder")}
                required
              />
            </div>

            <div className="flex items-center gap-3 rounded-lg border-2 border-primary bg-popover p-4">
              <Watch className="w-6 h-6 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium leading-none">{t("createCollectionDialog.watchType")}</p>
                <p className="text-sm text-muted-foreground">{t("createCollectionDialog.watchTypeDescription")}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("createCollectionDialog.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("createCollectionDialog.creating") : t("createCollectionDialog.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
