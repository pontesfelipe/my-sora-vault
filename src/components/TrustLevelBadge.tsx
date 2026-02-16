import { Shield, ShieldCheck, ShieldAlert, Award } from "lucide-react";
import { TrustLevel, TRUST_LEVEL_CONFIG } from "@/hooks/useTrustLevel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ICONS: Record<TrustLevel, typeof Shield> = {
  observer: Shield,
  collector: ShieldCheck,
  verified_collector: ShieldAlert,
  trusted_trader: Award,
};

interface TrustLevelBadgeProps {
  level: TrustLevel;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function TrustLevelBadge({ level, size = "sm", showLabel = false, className }: TrustLevelBadgeProps) {
  const config = TRUST_LEVEL_CONFIG[level];
  const Icon = ICONS[level];
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center gap-1", config.color, className)}>
          <Icon className={iconSize} />
          {showLabel && <span className="text-xs font-medium">{config.label}</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-semibold text-xs">Level {config.level} — {config.label}</p>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
