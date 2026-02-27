import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function MethodologyTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sora Vault Methodology</CardTitle>
          <CardDescription>
            Design principles and approaches used in building the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="data-model">
              <AccordionTrigger>Data Model Design</AccordionTrigger>
              <AccordionContent className="space-y-3 text-muted-foreground">
                <p>
                  <strong>User-Centric Architecture:</strong> All data is organized around users and their watch collections. 
                  Each user can own one collection (or multiple for admins), and all watches, entries, and preferences 
                  are scoped to specific users.
                </p>
                <p>
                  <strong>Relational Structure:</strong> Watches connect to wear entries, which can optionally link 
                  to trips, events, and water usage activities. This allows for rich querying and analysis.
                </p>
                <p>
                  <strong>Row-Level Security (RLS):</strong> Every table has RLS policies ensuring users can only 
                  access their own data, with admin exceptions for support and management.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="security">
              <AccordionTrigger>Security Approach</AccordionTrigger>
              <AccordionContent className="space-y-3 text-muted-foreground">
                <p>
                  <strong>Authentication:</strong> Uses secure email/password and Google OAuth authentication. 
                  All sessions are managed securely with JWT tokens.
                </p>
                <p>
                  <strong>Authorization:</strong> Role-based access control with two roles: admin and user. 
                  Roles are stored in a separate table to prevent privilege escalation.
                </p>
                <p>
                  <strong>Data Protection:</strong> All database tables use RLS policies. Admin functions 
                  use SECURITY DEFINER with restricted search paths to prevent SQL injection.
                </p>
                <p>
                  <strong>Access Control:</strong> Invite-only registration system. Users must be pre-approved 
                  via the allowed users list or submit a registration request for admin approval.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ai-features">
              <AccordionTrigger>AI Integration</AccordionTrigger>
              <AccordionContent className="space-y-3 text-muted-foreground">
                <p>
                  <strong>Rate Limiting:</strong> AI features are rate-limited to 4 uses per feature per month 
                  for regular users. Admins have unlimited access.
                </p>
                <p>
                  <strong>Usage Tracking:</strong> All AI feature usage is logged for monitoring and analysis.
                </p>
                <p>
                  <strong>Features:</strong> Collection analysis, watch suggestions, sentiment analysis, 
                  metadata extraction, price fetching, photo identification, and the Vault Pal chatbot.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="trade-matching">
              <AccordionTrigger>Trade Matching Algorithm</AccordionTrigger>
              <AccordionContent className="space-y-3 text-muted-foreground">
                <p>
                  <strong>Fuzzy Matching:</strong> When a watch is marked for trade, the system uses fuzzy 
                  matching to find wishlist items with similar brand and model names.
                </p>
                <p>
                  <strong>Location Filtering:</strong> Users can set trade match scope (global, same country, 
                  same state, same city) to filter matches by location.
                </p>
                <p>
                  <strong>Trigger-Based:</strong> Matching runs automatically via database triggers when 
                  a watch's trade availability changes.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="wear-analytics">
              <AccordionTrigger>Wear Analytics</AccordionTrigger>
              <AccordionContent className="space-y-3 text-muted-foreground">
                <p>
                  <strong>Daily Tracking:</strong> Each wear entry represents a single day of wearing a watch. 
                  Entries can span multiple days if specified.
                </p>
                <p>
                  <strong>Context Association:</strong> Wear entries can be linked to trips, events, or water 
                  activities to provide context and enable filtered analysis.
                </p>
                <p>
                  <strong>Aggregations:</strong> The dashboard provides monthly and yearly aggregations, 
                  cost-per-wear calculations, and trend analysis.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
