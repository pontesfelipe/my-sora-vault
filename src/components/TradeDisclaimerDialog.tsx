import { useState, useEffect } from "react";
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

const TRADE_DISCLAIMER_KEY = "trade_disclaimer_acknowledged";

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

  const checkAndShow = () => {
    const acknowledged = localStorage.getItem(TRADE_DISCLAIMER_KEY);
    if (!acknowledged) {
      setNeedsAcknowledgment(true);
      return true;
    }
    return false;
  };

  const acknowledge = () => {
    localStorage.setItem(TRADE_DISCLAIMER_KEY, new Date().toISOString());
    setNeedsAcknowledgment(false);
  };

  return { needsAcknowledgment, checkAndShow, acknowledge };
}
