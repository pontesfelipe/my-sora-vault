import { useNavigate } from "react-router-dom";
import {
  Shield, ShieldCheck, ShieldAlert, Award, ArrowLeft, Ban,
  Eye, UserCheck, BadgeCheck, Crown, AlertTriangle, MessageSquareOff, Link2Off, Repeat
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TRUST_LEVEL_CONFIG } from "@/hooks/useTrustLevel";

const TRUST_ICONS = [
  { key: "observer" as const, Icon: Shield },
  { key: "collector" as const, Icon: ShieldCheck },
  { key: "verified_collector" as const, Icon: ShieldAlert },
  { key: "trusted_trader" as const, Icon: Award },
];

const CORE_RULES = [
  {
    title: "Trades are private",
    items: ["No public listings", "No price posts", "No auctions"],
  },
  {
    title: "No flipping behavior",
    items: ["Repeated short-term trades for profit may result in restriction"],
  },
  {
    title: "Authenticity is mandatory",
    items: ["Counterfeits result in permanent removal"],
  },
  {
    title: "Respectful conduct",
    items: ["No pressure tactics", "No spam inquiries"],
  },
  {
    title: "Platform is not a broker",
    items: ["Users trade at their own risk", "Platform does not handle payments"],
  },
];

const PROHIBITED = [
  { text: "Public price discussions", Icon: Ban },
  { text: "External marketplace links (Chrono24, eBay, etc.)", Icon: Link2Off },
  { text: "Mass trade requests", Icon: Repeat },
  { text: "Anonymous trading", Icon: Eye },
  { text: '"DM me if interested" feed posts', Icon: MessageSquareOff },
];

export default function TradeRules() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-textMain">Trade Rules & Guidelines</h1>
          <p className="text-sm text-textMuted">Community standards for collector exchanges</p>
        </div>
      </div>

      {/* Privilege notice */}
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Crown className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-textMain">Trading Is a Privilege</p>
            <p className="text-xs text-textMuted mt-1">
              Access to trading is earned, not automatic. It requires Pro membership and adherence to community standards.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Core Rules */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-textMuted mb-3">Core Rules</h2>
        <div className="space-y-3">
          {CORE_RULES.map((rule, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-textMain mb-1.5">
                  {i + 1}. {rule.title}
                </p>
                <ul className="space-y-1">
                  {rule.items.map((item, j) => (
                    <li key={j} className="text-xs text-textMuted flex items-start gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-[11px] text-textMuted mt-3 italic">
          Note: AI models may be used to match users and their trade interests.
        </p>
      </section>

      <Separator />

      {/* Prohibited */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-textMuted mb-3">Explicitly Prohibited</h2>
        <Card>
          <CardContent className="p-4 space-y-2.5">
            {PROHIBITED.map((p, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <p.Icon className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm text-textMain">{p.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-3 border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-textMain">Violations trigger escalating action</p>
              <p className="text-xs text-textMuted mt-1">
                Warnings → Trade suspension → Account suspension
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Trust & Verification */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-textMuted mb-3">
          Trust & Verification Framework
        </h2>
        <div className="space-y-3">
          {TRUST_ICONS.map(({ key, Icon }) => {
            const config = TRUST_LEVEL_CONFIG[key];
            return (
              <Card key={key}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <span className="text-sm font-bold text-textMain">
                      Level {config.level} — {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-textMuted">{config.description}</p>
                  {key === "collector" && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[11px] text-textMuted font-medium">Unlocked after:</p>
                      <ul className="text-[11px] text-textMuted space-y-0.5 ml-3">
                        <li>• Profile completion</li>
                        <li>• Minimum logging activity</li>
                        <li>• Email + phone verification</li>
                      </ul>
                    </div>
                  )}
                  {key === "verified_collector" && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[11px] text-textMuted font-medium">Unlocked via:</p>
                      <ul className="text-[11px] text-textMuted space-y-0.5 ml-3">
                        <li>• Manual verification</li>
                        <li>• Proof of ownership uploads</li>
                        <li>• Trusted referrals</li>
                      </ul>
                    </div>
                  )}
                  {key === "trusted_trader" && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[11px] text-textMuted font-medium">Unlocked via:</p>
                      <ul className="text-[11px] text-textMuted space-y-0.5 ml-3">
                        <li>• Completed trades</li>
                        <li>• Positive post-trade confirmations</li>
                        <li>• No disputes</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* Trust Signals */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-textMuted mb-3">
          Trust Signals Displayed
        </h2>
        <Card>
          <CardContent className="p-4 space-y-2">
            {["Years active", "Number of completed trades", "Mutual connections", "Verification badge"].map(
              (signal) => (
                <div key={signal} className="flex items-center gap-2.5">
                  <BadgeCheck className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-sm text-textMain">{signal}</span>
                </div>
              )
            )}
            <p className="text-[11px] text-textMuted mt-2 italic">
              No ratings. No stars. No reviews.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
