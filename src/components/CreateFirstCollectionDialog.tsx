import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, Watch } from "lucide-react";
import { useAllowedUserCheck } from "@/hooks/useAllowedUserCheck";
import { useAuth } from "@/contexts/AuthContext";

interface CreateFirstCollectionDialogProps {
  onSuccess: () => void;
}

export const CreateFirstCollectionDialog = ({ onSuccess }: CreateFirstCollectionDialogProps) => {
  const { user } = useAuth();
  const [name, setName] = useState("My Watch Collection");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isAllowed, loading: checkingAccess, refresh } = useAllowedUserCheck();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !user) {
      toast({
        title: "Error",
        description: "Please enter a collection name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: collectionData, error: collectionError } = await supabase
        .from('collections' as any)
        .insert({
          name: name.trim(),
          created_by: user.id,
          collection_type: 'watches',
        } as any)
        .select()
        .single();

      if (collectionError) throw collectionError;

      const { error: linkError } = await supabase
        .from('user_collections' as any)
        .insert({
          user_id: user.id,
          collection_id: (collectionData as any).id,
          role: 'owner',
        } as any);

      if (linkError) throw linkError;

      toast({
        title: "Success",
        description: "Your watch collection has been created!",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error creating collection:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create collection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAccess) {
    return (
      <Dialog open={true}>
        <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isAllowed === false) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && window.history.back()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Access Required</DialogTitle>
            <DialogDescription>
              Your account needs to be approved before you can create collections.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please contact an administrator to request access to the application. You can submit a registration request from the sign-in page.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button onClick={refresh} variant="outline" className="flex-1">
              Refresh Status
            </Button>
            <Button onClick={() => window.history.back()} className="flex-1">
              Go Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && window.history.back()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Welcome! Create Your Watch Collection</DialogTitle>
          <DialogDescription>
            Give your collection a name to start tracking your watches.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-3 rounded-lg border-2 border-primary bg-popover p-4">
            <Watch className="w-6 h-6 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium leading-none">Watches</p>
              <p className="text-sm text-muted-foreground">Track your watch collection with movement, case size, and water resistance details</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Collection Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Watch Collection"
              disabled={loading}
              autoFocus
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Collection"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
