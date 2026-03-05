import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Watch, Heart, Shield, Sparkles, Users, Globe, BarChart3 } from "lucide-react";
import watchHero from "@/assets/watch-hero.jpg";
import { useTranslation } from "react-i18next";

export default function About() {
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/10 via-background to-accent/5 p-8 md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-2xl font-bold text-accent shadow-lg shadow-accent/20">LV</div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">Luxury Vault</h1>
                <p className="text-muted-foreground text-lg">{t("about.subtitle")}</p>
              </div>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">{t("about.heroDescription")}</p>
          </div>
        </div>

        <Card className="group overflow-hidden border-0 shadow-card hover:shadow-xl transition-all duration-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10"><Watch className="h-5 w-5 text-accent" /></div>
              <h3 className="font-semibold text-lg">{t("about.builtForCollectors")}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{t("about.watchSpecsDescription")}</p>
          </CardContent>
        </Card>

        <Card className="group overflow-hidden border-0 shadow-luxury hover:shadow-xl transition-all duration-500">
          <div className="relative h-64 overflow-hidden">
            <img src={watchHero} alt="Luxury collection showcase" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-xl font-bold">{t("about.showcaseTitle")}</h3>
              <p className="text-sm text-muted-foreground mt-2">{t("about.showcaseDescription")}</p>
            </div>
          </div>
        </Card>

        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl">{t("about.platformFeatures")}</CardTitle>
            <CardDescription>{t("about.platformFeaturesDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: BarChart3, title: t("about.analyticsDashboard"), desc: t("about.analyticsDashboardDesc") },
                { icon: Heart, title: t("about.wearTracking"), desc: t("about.wearTrackingDesc") },
                { icon: Sparkles, title: t("about.aiInsights"), desc: t("about.aiInsightsDesc") },
                { icon: Users, title: t("about.communityTrading"), desc: t("about.communityTradingDesc") },
                { icon: Globe, title: t("about.tripsEvents"), desc: t("about.tripsEventsDesc") },
                { icon: Shield, title: t("about.securePrivate"), desc: t("about.securePrivateDesc") },
              ].map((f, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10"><f.icon className="h-6 w-6 text-accent" /></div>
                  <div><h3 className="font-semibold mb-1">{f.title}</h3><p className="text-sm text-muted-foreground">{f.desc}</p></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5">
            <div className="text-4xl font-bold text-accent mb-2">⌚</div>
            <div className="text-sm text-muted-foreground">{t("about.watchFocused")}</div>
          </div>
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5">
            <div className="text-4xl font-bold text-accent mb-2">AI</div>
            <div className="text-sm text-muted-foreground">{t("about.poweredInsights")}</div>
          </div>
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5">
            <div className="text-4xl font-bold text-accent mb-2">∞</div>
            <div className="text-sm text-muted-foreground">{t("about.itemsPerCollection")}</div>
          </div>
        </div>

        <Card className="border-0 shadow-card">
          <CardHeader><CardTitle>{t("about.contactSupport")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground">{t("about.contactDescription")}</p>
            <p className="text-sm text-muted-foreground">{t("about.copyright")}</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}