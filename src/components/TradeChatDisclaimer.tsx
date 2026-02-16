import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

export function TradeChatDisclaimer() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border-t border-border text-[10px] text-muted-foreground leading-tight">
      <Shield className="h-3 w-3 shrink-0" />
      <span>
        Proceed at your own discretion. The platform does not verify, authenticate, or insure trades.{" "}
        <Link to="/trade-rules" className="underline hover:text-foreground">Rules</Link>
      </span>
    </div>
  );
}
