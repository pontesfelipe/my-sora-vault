import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TRADE_DISCLAIMER_KEY = "trade_disclaimer_acknowledged";
const CURRENT_VERSION = "1.0";

interface TradeDisclaimerDialogProps {
  open: boolean;
  onAcknowledge: () => void;
}

export function TradeDisclaimerDialog({ open, onAcknowledge }: TradeDisclaimerDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Before You Continue
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed space-y-3">
            <p>
              This platform facilitates introductions only. All trades are private
              agreements between users.
            </p>
            <p>
              The platform does not verify, authenticate, or insure any items
              exchanged. Proceed at your own discretion.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onAcknowledge}>
            I Understand
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useTradeDisclaimer() {
  const [needsAcknowledgment, setNeedsAcknowledgment] = useState(false);

  const checkAndShow = async () => {
    // Fast path: check localStorage first
    const localAck = localStorage.getItem(TRADE_DISCLAIMER_KEY);
    if (localAck) return false;

    // Slow path: check database
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setNeedsAcknowledgment(true);
      return true;
    }

    const { data } = await supabase
      .from("trade_guidelines_acknowledgments")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      // Sync to localStorage for future fast checks
      localStorage.setItem(TRADE_DISCLAIMER_KEY, new Date().toISOString());
      return false;
    }

    setNeedsAcknowledgment(true);
    return true;
  };

  const acknowledge = async () => {
    const now = new Date().toISOString();
    localStorage.setItem(TRADE_DISCLAIMER_KEY, now);
    setNeedsAcknowledgment(false);

    // Persist to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("trade_guidelines_acknowledgments").upsert(
        { user_id: user.id, acknowledged_at: now, version: CURRENT_VERSION },
        { onConflict: "user_id" }
      );
    }
  };

  return { needsAcknowledgment, checkAndShow, acknowledge };
}
