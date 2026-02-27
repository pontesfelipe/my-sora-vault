import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Watch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface QuickLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watch: { id: string; brand: string; model: string; ai_image_url?: string } | null;
  onSuccess: () => void;
}

export function QuickLogSheet({ open, onOpenChange, watch, onSuccess }: QuickLogSheetProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleLogToday = async () => {
    if (!watch || !user) return;
    setLoading(true);

    const today = format(new Date(), "yyyy-MM-dd");

    try {
      // Check if already logged today
      const { data: existing } = await supabase
        .from("wear_entries")
        .select("id")
        .eq("watch_id", watch.id)
        .eq("wear_date", today)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast({ title: "Already logged", description: `${watch.brand} ${watch.model} is already logged for today.` });
        onOpenChange(false);
        return;
      }

      const { error } = await supabase.from("wear_entries").insert({
        watch_id: watch.id,
        wear_date: today,
        days: 1,
        user_id: user.id,
      });

      if (error) throw error;

      toast({ title: "Wrist check logged!", description: `${watch.brand} ${watch.model} — ${format(new Date(), "EEEE, MMM d")}` });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Failed to log wear entry", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!watch) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-8">
        <DrawerHeader className="text-center pb-2">
          <DrawerTitle className="text-lg">Quick Log</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col items-center gap-4">
          {/* Watch preview */}
          <div className="h-20 w-20 rounded-2xl bg-surfaceMuted overflow-hidden">
            {watch.ai_image_url ? (
              <img src={watch.ai_image_url} alt={`${watch.brand} ${watch.model}`} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Watch className="h-8 w-8 text-textMuted" />
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="font-semibold text-textMain">{watch.brand}</p>
            <p className="text-sm text-textMuted">{watch.model}</p>
          </div>

          <p className="text-sm text-textMuted">
            {format(new Date(), "EEEE, MMMM d")}
          </p>

          <Button
            onClick={handleLogToday}
            disabled={loading}
            className="w-full h-14 rounded-2xl text-base font-semibold gap-2"
            size="lg"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            Log Today
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
