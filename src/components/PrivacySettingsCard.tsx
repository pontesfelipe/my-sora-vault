import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function PrivacySettingsCard() {
  const { user } = useAuth();
  const [isCollectionPublic, setIsCollectionPublic] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_preferences")
      .select("is_collection_public")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setIsCollectionPublic(data.is_collection_public ?? false);
    }
    setLoading(false);
  };

  const handleToggle = async (checked: boolean) => {
    if (!user) return;
    setIsCollectionPublic(checked);

    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        { user_id: user.id, is_collection_public: checked, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    if (error) {
      setIsCollectionPublic(!checked);
      toast.error("Failed to update privacy settings");
    } else {
      toast.success(checked ? "Collection is now public" : "Collection is now private");
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy
        </CardTitle>
        <CardDescription>Control what others can see on your profile</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Public Posts
            </Label>
            <p className="text-xs text-muted-foreground">Your forum posts are always visible to others</p>
          </div>
          <Switch checked disabled />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="collection-public" className="font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Public Collection
            </Label>
            <p className="text-xs text-muted-foreground">Allow others to see your collection items</p>
          </div>
          <Switch
            id="collection-public"
            checked={isCollectionPublic}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
