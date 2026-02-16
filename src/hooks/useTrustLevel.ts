import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TrustLevel = "observer" | "collector" | "verified_collector" | "trusted_trader";

export interface TrustLevelData {
  trust_level: TrustLevel;
  completed_trades: number;
  verified_at: string | null;
}

export const TRUST_LEVEL_CONFIG: Record<TrustLevel, {
  label: string;
  shortLabel: string;
  level: number;
  color: string;
  description: string;
}> = {
  observer: {
    label: "Observer",
    shortLabel: "L0",
    level: 0,
    color: "text-textMuted",
    description: "Can view trade indicators but cannot initiate trades.",
  },
  collector: {
    label: "Collector",
    shortLabel: "L1",
    level: 1,
    color: "text-accent",
    description: "Can initiate and receive trade requests.",
  },
  verified_collector: {
    label: "Verified Collector",
    shortLabel: "L2",
    level: 2,
    color: "text-emerald-500",
    description: "Priority matching, higher trust visibility.",
  },
  trusted_trader: {
    label: "Trusted Trader",
    shortLabel: "L3",
    level: 3,
    color: "text-amber-500",
    description: "Trade boost, early access to advanced tools.",
  },
};

export function useTrustLevel(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;
  const [data, setData] = useState<TrustLevelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return;
    }

    (supabase as any)
      .from("user_trust_levels")
      .select("trust_level, completed_trades, verified_at")
      .eq("user_id", targetId)
      .maybeSingle()
      .then(({ data: row }: any) => {
        setData(row || { trust_level: "observer", completed_trades: 0, verified_at: null });
        setLoading(false);
      });
  }, [targetId]);

  const config = data ? TRUST_LEVEL_CONFIG[data.trust_level] : TRUST_LEVEL_CONFIG.observer;

  return { data, config, loading };
}
