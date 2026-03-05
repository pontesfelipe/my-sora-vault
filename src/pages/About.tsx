import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Watch, Heart, Shield, Sparkles, Users, Globe, TrendingUp, BarChart3 } from "lucide-react";
import watchHero from "@/assets/watch-hero.jpg";

export default function About() {
  return (
    <AppLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/10 via-background to-accent/5 p-8 md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent opacity-50" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-2xl font-bold text-accent shadow-lg shadow-accent/20">
                LV
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">Luxury Vault</h1>
                <p className="text-muted-foreground text-lg">
                  Your Personal Luxury Collection Studio
                </p>
              </div>
            </div>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
              The premier platform for watch enthusiasts who demand excellence in managing their collection. 
              Track, analyze, and curate your timepieces with unprecedented precision.
            </p>
          </div>
        </div>

        {/* Watch Focus */}
        <Card className="group overflow-hidden border-0 shadow-card hover:shadow-xl transition-all duration-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                <Watch className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold text-lg">Built for Watch Collectors</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Track movements, case materials, water resistance, market values, wear history, warranty details, complications, rarity, and historical significance for every timepiece in your collection.
            </p>
          </CardContent>
        </Card>

        {/* Watch Showcase */}
        <Card className="group overflow-hidden border-0 shadow-luxury hover:shadow-xl transition-all duration-500">
          <div className="relative h-64 overflow-hidden">
            <img 
              src={watchHero} 
              alt="Luxury collection showcase" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-xl font-bold">Built for Collectors</h3>
              <p className="text-sm text-muted-foreground mt-2">
                From vintage dress watches to modern tool watches — Luxury Vault gives each timepiece the attention it deserves.
              </p>
            </div>
          </div>
        </Card>

        {/* Features Grid */}
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl">Platform Features</CardTitle>
            <CardDescription>Everything you need to manage your luxury collections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <BarChart3 className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Analytics Dashboard</h3>
                  <p className="text-sm text-muted-foreground">
                    Collection statistics, spending analytics, purchase timelines, and depreciation tracking.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <Heart className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Wear Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Log usage with calendars, monthly grids, and associate wears with trips, events, and sports.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">AI-Powered Insights</h3>
                  <p className="text-sm text-muted-foreground">
                    Collection analysis, taste profiling, sentiment analysis, gap suggestions, and the Vault Pal chatbot.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Community & Trading</h3>
                  <p className="text-sm text-muted-foreground">
                    Friends, messaging, forums, trade matching, trust levels, and wishlist sharing.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <Globe className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Trips & Events</h3>
                  <p className="text-sm text-muted-foreground">
                    Document occasions and associate your collection items with travel and special moments.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Secure & Private</h3>
                  <p className="text-sm text-muted-foreground">
                    Row-level security, two-factor authentication, login history, and encrypted data storage.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5">
            <div className="text-4xl font-bold text-accent mb-2">⌚</div>
            <div className="text-sm text-muted-foreground">Watch Focused</div>
          </div>
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5">
            <div className="text-4xl font-bold text-accent mb-2">AI</div>
            <div className="text-sm text-muted-foreground">Powered Insights</div>
          </div>
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5">
            <div className="text-4xl font-bold text-accent mb-2">∞</div>
            <div className="text-sm text-muted-foreground">Items Per Collection</div>
          </div>
        </div>

        {/* Contact Card */}
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle>Contact & Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground">
              For support or feedback, use the Submit Feedback feature in the app or reach out through messaging. You can also connect with the community through the Forum.
            </p>
            <p className="text-sm text-muted-foreground">
              © 2025 Luxury Vault. All rights reserved. Version 1.0
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
