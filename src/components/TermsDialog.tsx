import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TermsDialog = ({ open, onOpenChange }: TermsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Terms & Conditions (Beta Version)</DialogTitle>
          <DialogDescription>
            Last Updated: November 2025
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">1. Beta Disclaimer</h3>
              <p className="text-muted-foreground">
                Luxury Vault is currently in Beta, meaning features may be incomplete, unstable, or changed at any time. 
                Data may be inaccurate due to testing of AI systems, market data fetchers, analytics, or other components. 
                By using the Application, you acknowledge that this is an experimental version and agree not to hold the 
                developer liable for any issues arising during the Beta period.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">2. No Fees & No Data Selling</h3>
              <p className="text-muted-foreground">
                During Beta, Luxury Vault is free of charge. User data is not sold, shared, or monetized. 
                Data is used only to operate the Application and provide AI‑driven insights.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">3. Eligibility</h3>
              <p className="text-muted-foreground">
                Users must be at least 18 years old. Access may be restricted through an invite/whitelist system.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">4. User Responsibilities</h3>
              <p className="text-muted-foreground">
                Users agree not to upload illegal, harmful, or infringing content, and not to attempt to 
                disrupt or reverse engineer the system.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">5. Data & Content</h3>
              <p className="text-muted-foreground">
                Users retain ownership of content uploaded. Luxury Vault may process data solely to operate 
                the Application. Market values and analytics are estimates and may be inaccurate.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">6. AI Features</h3>
              <p className="text-muted-foreground">
                AI features may produce inaccurate, incomplete, or biased results. Users agree not to rely on 
                AI outputs for financial or investment decisions.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">7. Security & Privacy</h3>
              <p className="text-muted-foreground">
                Security measures such as RLS and authentication are applied, but no system is fully secure. 
                Use of the Beta involves some risk of data exposure.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">8. Availability & Changes</h3>
              <p className="text-muted-foreground">
                The developer may modify, suspend, or discontinue the Application at any time.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">9. Intellectual Property</h3>
              <p className="text-muted-foreground">
                Luxury Vault's code, design, features, and branding belong to the developer.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">10. Third‑Party Sources</h3>
              <p className="text-muted-foreground">
                Market data may use external sources. Luxury Vault is not responsible for inaccurate 
                third‑party information.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">11. Limitation of Liability</h3>
              <p className="text-muted-foreground">
                Luxury Vault is provided "as‑is," without warranties. The developer is not liable for 
                damages including data loss, financial decisions, or unauthorized access.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">12. No Professional Advice</h3>
              <p className="text-muted-foreground">
                The Application does not provide legal, financial, or appraisal advice.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">13. Termination</h3>
              <p className="text-muted-foreground">
                Access may be terminated at any time. Users may delete their accounts.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">14. Changes to Terms</h3>
              <p className="text-muted-foreground">
                Terms may be updated. Continued use indicates acceptance.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">15. Governing Law</h3>
              <p className="text-muted-foreground">
                These Terms are governed by Texas law.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
