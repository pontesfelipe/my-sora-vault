import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DocumentationTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Application Architecture</CardTitle>
          <CardDescription>Technical overview of the Sora Vault platform</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-3">Technology Stack</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">React 18</Badge>
                  <Badge variant="outline">TypeScript</Badge>
                  <Badge variant="outline">Vite</Badge>
                  <Badge variant="outline">Tailwind CSS</Badge>
                  <Badge variant="outline">Lovable Cloud</Badge>
                  <Badge variant="outline">React Query</Badge>
                  <Badge variant="outline">React Router</Badge>
                  <Badge variant="outline">ExcelJS</Badge>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Data Flow</h3>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-medium text-foreground mb-2">1. Authentication Flow</h4>
                    <pre className="text-xs overflow-x-auto">
{`User → Auth Page → Authentication → JWT Token → AuthContext
                              ↓
                    Profile Creation (Trigger)
                              ↓
                    Default Collection Creation`}
                    </pre>
                  </div>

                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-medium text-foreground mb-2">2. Data Access Pattern</h4>
                    <pre className="text-xs overflow-x-auto">
{`Component → Custom Hook → React Query → Database Client
                                               ↓
                                RLS Policy Check → Database
                                               ↓
                                Data Response → Cache Update → UI`}
                    </pre>
                  </div>

                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-medium text-foreground mb-2">3. AI Feature Flow</h4>
                    <pre className="text-xs overflow-x-auto">
{`User Action → Rate Limit Check → Backend Function
                                        ↓
                              AI Service (Lovable AI)
                                        ↓
                              Usage Logged → Response Cached`}
                    </pre>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Database Schema</h3>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium mb-2">Core Tables</h4>
                      <ul className="space-y-1 text-muted-foreground text-xs">
                        <li>• profiles - User profile data</li>
                        <li>• user_roles - Role assignments</li>
                        <li>• collections - Watch collections</li>
                        <li>• user_collections - Collection access</li>
                        <li>• watches - Watch entries</li>
                        <li>• watch_specs - Watch specifications</li>
                      </ul>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium mb-2">Activity Tables</h4>
                      <ul className="space-y-1 text-muted-foreground text-xs">
                        <li>• wear_entries - Wear log</li>
                        <li>• trips - Trip records</li>
                        <li>• events - Event records</li>
                        <li>• water_usage - Water activities</li>
                        <li>• sports - Sport activities</li>
                      </ul>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium mb-2">Social Tables</h4>
                      <ul className="space-y-1 text-muted-foreground text-xs">
                        <li>• friendships - Friend connections</li>
                        <li>• friend_requests - Pending requests</li>
                        <li>• conversations - Chat threads</li>
                        <li>• messages - Chat messages</li>
                        <li>• trade_match_notifications - Matches</li>
                      </ul>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium mb-2">System Tables</h4>
                      <ul className="space-y-1 text-muted-foreground text-xs">
                        <li>• ai_feature_usage - AI rate limits</li>
                        <li>• access_logs - Activity logging</li>
                        <li>• allowed_users - Registration control</li>
                        <li>• registration_requests - Signup queue</li>
                        <li>• terms_acceptances - Legal records</li>
                        <li>• login_history - Login tracking</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Backend Functions</h3>
                <div className="grid gap-2 text-sm">
                  {[
                    { name: "admin-reset-password", desc: "Admin password reset" },
                    { name: "admin-user-providers", desc: "User auth providers" },
                    { name: "analyze-collection", desc: "AI analysis of collection" },
                    { name: "analyze-sentiment", desc: "Sentiment analysis for notes" },
                    { name: "analyze-taste-profile", desc: "AI taste profile analysis" },
                    { name: "analyze-watch-metadata", desc: "Extract watch metadata" },
                    { name: "delete-user", desc: "Complete user deletion" },
                    { name: "extract-warranty-info", desc: "OCR warranty cards" },
                    { name: "fetch-watch-price", desc: "Get market prices" },
                    { name: "generate-watch-image", desc: "AI image generation" },
                    { name: "identify-watch-from-photo", desc: "Photo identification" },
                    { name: "import-spreadsheet-data", desc: "Bulk data import" },
                    { name: "search-watch-info", desc: "Search watch database" },
                    { name: "suggest-watches", desc: "AI watch suggestions" },
                    { name: "vault-pal-chat", desc: "AI assistant chatbot" },
                  ].map((fn) => (
                    <div key={fn.name} className="flex justify-between p-2 border rounded">
                      <code className="text-xs">{fn.name}</code>
                      <span className="text-xs text-muted-foreground">{fn.desc}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Component Structure</h3>
                <pre className="text-xs p-4 border rounded-lg bg-muted/30 overflow-x-auto">
{`src/
├── components/
│   ├── admin/          # Admin panel components
│   ├── forum/          # Forum & posts
│   ├── messaging/      # Chat & friends system
│   ├── ui/             # Shadcn UI components
│   └── *.tsx           # Feature components
├── contexts/           # React contexts (Auth, Theme, Collection, Passcode)
├── hooks/              # Custom hooks
├── pages/              # Route components
├── types/              # TypeScript types
├── integrations/       # Backend integrations
└── utils/              # Helper functions`}
                </pre>
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
