import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PrivacyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PrivacyDialog = ({ open, onOpenChange }: PrivacyDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Privacy Policy (Beta Version)</DialogTitle>
          <DialogDescription>
            Last Updated: November 2025
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">1. Introduction</h3>
              <p className="text-muted-foreground">
                This Privacy Policy explains how Luxury Vault ("the Application") collects, uses, and 
                protects user information during the Beta phase.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">2. Information We Collect</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Account information (email, password)</li>
                <li>Collection data (watches), images, notes, and preferences</li>
                <li>Activity logs (wear entries, trips, events, water usage)</li>
                <li>Usage analytics</li>
                <li>AI preference data</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">3. How We Use Your Information</h3>
              <p className="text-muted-foreground mb-2">
                Information is used solely to operate and improve the Application, including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Displaying and analyzing your collections</li>
                <li>Generating AI‑based recommendations</li>
                <li>Providing usage, financial, and trend reports</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">4. No Data Selling</h3>
              <p className="text-muted-foreground">
                Luxury Vault does not sell, rent, trade, or monetize user data.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">5. Data Storage & Security</h3>
              <p className="text-muted-foreground">
                Data is stored in Supabase with Row‑Level Security. While safeguards exist, Beta software 
                may contain vulnerabilities.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">6. Third‑Party Services</h3>
              <p className="text-muted-foreground">
                Market research and AI may retrieve data from external sources. These services may have 
                their own privacy policies.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">7. User Rights</h3>
              <p className="text-muted-foreground">
                Users may request deletion of their account and data. Backups may retain data temporarily.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">8. Cookies & Tracking</h3>
              <p className="text-muted-foreground">
                The Application may use cookies for authentication and performance only.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">9. Children's Privacy</h3>
              <p className="text-muted-foreground">
                The Application is not intended for individuals under 18.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">10. Changes to Privacy Policy</h3>
              <p className="text-muted-foreground">
                Policy may be updated. Continued use constitutes acceptance.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
