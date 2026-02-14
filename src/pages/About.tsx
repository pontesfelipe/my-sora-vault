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
                  Your Personal Watch Collection Studio
                </p>
              </div>
            </div>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
              The premier platform for watch enthusiasts who demand excellence in managing their luxury timepiece collection. 
              Track, analyze, and curate your watches with unprecedented precision.
            </p>
          </div>
        </div>

        {/* Watch Showcase */}
        <Card className="group overflow-hidden border-0 shadow-luxury hover:shadow-xl transition-all duration-500">
          <div className="relative h-64 overflow-hidden">
            <img 
              src={watchHero} 
              alt="Luxury watches" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center gap-2">
                <Watch className="h-6 w-6 text-accent" />
                <h3 className="text-xl font-bold">Watches</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Track movement types, case materials, water resistance, market values, wear history, and warranty details.
              </p>
            </div>
          </div>
        </Card>

        {/* Features Grid */}
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl">Platform Features</CardTitle>
            <CardDescription>Everything you need to manage your watch collection</CardDescription>
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
                    Comprehensive statistics and insights about your collection usage.
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
                    Log usage history and discover patterns in your wearing habits.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">AI Insights</h3>
                  <p className="text-sm text-muted-foreground">
                    Get personalized recommendations and collection analysis.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Community</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect with collectors and explore trade opportunities.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <Globe className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Trip & Events</h3>
                  <p className="text-sm text-muted-foreground">
                    Associate watches with special moments and memories.
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
                    Enterprise-grade encryption protects your data.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5">
            <div className="text-4xl font-bold text-accent mb-2">∞</div>
            <div className="text-sm text-muted-foreground">Watches Per Collection</div>
          </div>
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5">
            <div className="text-4xl font-bold text-accent mb-2">AI</div>
            <div className="text-sm text-muted-foreground">Powered Insights</div>
          </div>
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5">
            <div className="text-4xl font-bold text-accent mb-2">
              <Watch className="h-10 w-10 mx-auto text-accent" />
            </div>
            <div className="text-sm text-muted-foreground">Built for Watch Lovers</div>
          </div>
        </div>

        {/* Contact Card */}
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle>Contact & Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground">
              For support or feedback, please reach out through the Messages feature or contact an administrator.
            </p>
            <p className="text-sm text-muted-foreground">
              © 2024 Luxury Vault. All rights reserved.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}