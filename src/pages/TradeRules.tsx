import { useNavigate } from "react-router-dom";
import {
  Shield, ShieldCheck, ShieldAlert, Award, ArrowLeft, Ban,
  Eye, BadgeCheck, Crown, AlertTriangle, MessageSquareOff, Link2Off, Repeat,
  ShieldOff, Database, MessageCircle, CheckCircle2, XCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TRUST_LEVEL_CONFIG } from "@/hooks/useTrustLevel";

// --- Data ---

const TRUST_ICONS = [
  { key: "observer" as const, Icon: Shield },
  { key: "collector" as const, Icon: ShieldCheck },
  { key: "verified_collector" as const, Icon: ShieldAlert },
  { key: "trusted_trader" as const, Icon: Award },
];

const CORE_RULES = [
  { title: "Trades are private", items: ["No public listings", "No price posts", "No auctions"] },
  { title: "No flipping behavior", items: ["Repeated short-term trades for profit may result in restriction"] },
  { title: "Authenticity is mandatory", items: ["Counterfeits result in permanent removal"] },
  { title: "Respectful conduct", items: ["No pressure tactics", "No spam inquiries"] },
  { title: "Platform is not a broker", items: ["Users trade at their own risk", "Platform does not handle payments"] },
];

const PROHIBITED = [
  { text: "Public price discussions", Icon: Ban },
  { text: "External marketplace links (Chrono24, eBay, etc.)", Icon: Link2Off },
  { text: "Mass trade requests", Icon: Repeat },
  { text: "Anonymous trading", Icon: Eye },
  { text: '"DM me if interested" feed posts', Icon: MessageSquareOff },
];

const PLATFORM_IS_NOT = [
  "A broker or intermediary",
  "An escrow service",
  "An authenticator or insurer",
  "A payment processor",
];

const PLATFORM_IS = [
  "A social discovery and signaling tool",
  "A private collector exchange community",
];

const BANNED_TERMS = ["Buy", "Sell", "Marketplace", "Listing", "Auction"];
const APPROVED_TERMS = ["Trade", "Exchange", "Open to Trade", "Collector Exchange", "Private Trade"];

const NOT_STORED = [
  "Prices or valuations",
  "Transaction records",
  "Payment information",
  "Shipping labels or tracking",
  "Automated deal terms",
];

// --- Sub-components ---

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold uppercase tracking-wider text-textMuted mb-3">{children}</h2>;
}

function PlatformRoleSection() {
  return (
    <section>
      <SectionHeader>Platform Role</SectionHeader>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-2">This platform is NOT</p>
            <div className="space-y-1.5">
              {PLATFORM_IS_NOT.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-sm text-textMain">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-2">This platform IS</p>
            <div className="space-y-1.5">
              {PLATFORM_IS.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-sm text-textMain">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function LanguageStandardsSection() {
  return (
    <section>
      <SectionHeader>Language Standards</SectionHeader>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2">Banned Terms</p>
            <div className="flex flex-wrap gap-1.5">
              {BANNED_TERMS.map((term) => (
                <Badge key={term} variant="destructive" className="text-xs">{term}</Badge>
              ))}
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Approved Alternatives</p>
            <div className="flex flex-wrap gap-1.5">
              {APPROVED_TERMS.map((term) => (
                <Badge key={term} variant="secondary" className="text-xs">{term}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function WhatWeDontStoreSection() {
  return (
    <section>
      <SectionHeader>What We Don't Store</SectionHeader>
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <Database className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-textMuted">
              To protect all parties, this platform intentionally does not collect or retain the following data:
            </p>
          </div>
          <div className="space-y-1.5">
            {NOT_STORED.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <ShieldOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-textMain">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function CoreRulesSection() {
  return (
    <section>
      <SectionHeader>Core Rules</SectionHeader>
      <div className="space-y-3">
        {CORE_RULES.map((rule, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-textMain mb-1.5">{i + 1}. {rule.title}</p>
              <ul className="space-y-1">
                {rule.items.map((item, j) => (
                  <li key={j} className="text-xs text-textMuted flex items-start gap-2">
                    <span className="text-accent mt-0.5">•</span>{item}
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
  );
}

function ProhibitedSection() {
  return (
    <section>
      <SectionHeader>Explicitly Prohibited</SectionHeader>
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
            <p className="text-xs text-textMuted mt-1">Warnings → Trade suspension → Account suspension</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function TrustFrameworkSection() {
  return (
    <section>
      <SectionHeader>Trust & Verification Framework</SectionHeader>
      <div className="space-y-3">
        {TRUST_ICONS.map(({ key, Icon }) => {
          const config = TRUST_LEVEL_CONFIG[key];
          return (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <span className="text-sm font-bold text-textMain">Level {config.level} — {config.label}</span>
                </div>
                <p className="text-xs text-textMuted">{config.description}</p>
                {key === "collector" && (
                  <TrustDetail items={["Profile completion", "Minimum logging activity", "Email + phone verification"]} />
                )}
                {key === "verified_collector" && (
                  <TrustDetail items={["Manual verification", "Proof of ownership uploads", "Trusted referrals"]} />
                )}
                {key === "trusted_trader" && (
                  <TrustDetail items={["Completed trades", "Positive post-trade confirmations", "No disputes"]} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function TrustDetail({ items }: { items: string[] }) {
  return (
    <div className="mt-2 space-y-1">
      <p className="text-[11px] text-textMuted font-medium">Unlocked after:</p>
      <ul className="text-[11px] text-textMuted space-y-0.5 ml-3">
        {items.map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </div>
  );
}

function TrustSignalsSection() {
  return (
    <section>
      <SectionHeader>Trust Signals Displayed</SectionHeader>
      <Card>
        <CardContent className="p-4 space-y-2">
          {["Years active", "Number of completed trades", "Mutual connections", "Verification badge"].map((signal) => (
            <div key={signal} className="flex items-center gap-2.5">
              <BadgeCheck className="h-4 w-4 text-accent shrink-0" />
              <span className="text-sm text-textMain">{signal}</span>
            </div>
          ))}
          <p className="text-[11px] text-textMuted mt-2 italic">No ratings. No stars. No reviews.</p>
        </CardContent>
      </Card>
    </section>
  );
}

// --- Main page ---

export default function TradeRules() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-8 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-textMain">Trade Rules & Guidelines</h1>
          <p className="text-sm text-textMuted">Community standards for collector exchanges</p>
        </div>
      </div>

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

      <PlatformRoleSection />
      <Separator />
      <CoreRulesSection />
      <Separator />
      <ProhibitedSection />
      <Separator />
      <LanguageStandardsSection />
      <Separator />
      <WhatWeDontStoreSection />
      <Separator />
      <TrustFrameworkSection />
      <Separator />
      <TrustSignalsSection />
    </div>
  );
}
