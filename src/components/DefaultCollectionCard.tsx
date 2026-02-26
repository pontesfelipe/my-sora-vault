import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection } from "@/contexts/CollectionContext";
import { Watch } from "lucide-react";
import { Loader2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const DefaultCollectionCard = () => {
  const { collections, collectionsLoading } = useCollection();
  const { user } = useAuth();
  const [defaultCollectionId, setDefaultCollectionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadDefaultCollection = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('default_collection_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data?.default_collection_id) {
          setDefaultCollectionId(data.default_collection_id);
        }
      } catch (error) {
        console.error('Error loading default collection:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDefaultCollection();
  }, [user]);

  const handleChange = async (value: string) => {
    if (!user) return;
    
    setSaving(true);
    const newValue = value === "auto" ? null : value;
    
    try {
      // First check if user preferences record exists
      const { data: existingPref, error: checkError } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      let error;
      if (existingPref) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('user_preferences')
          .update({
            default_collection_id: newValue,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        error = updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            default_collection_id: newValue,
            updated_at: new Date().toISOString()
          });
        error = insertError;
      }

      if (error) throw error;

      setDefaultCollectionId(value === "auto" ? "" : value);
      
      // Also update localStorage for immediate effect
      if (newValue) {
        localStorage.setItem('defaultCollectionId', newValue);
      } else {
        localStorage.removeItem('defaultCollectionId');
      }
      
      if (value === "auto") {
        toast.success("Default collection set to automatic (your owned collection)");
      } else {
        const collection = collections.find(c => c.id === value);
        toast.success(`Default collection set to "${collection?.name}"`);
      }
    } catch (error) {
      console.error('Error saving default collection:', error);
      toast.error("Failed to save default collection preference");
    } finally {
      setSaving(false);
    }
  };

  if (collectionsLoading || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Default Collection
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Default Collection
        </CardTitle>
        <CardDescription>
          Choose which collection opens by default when you log in
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="defaultCollection">Default Collection</Label>
          <Select value={defaultCollectionId || "auto"} onValueChange={handleChange} disabled={saving}>
            <SelectTrigger id="defaultCollection">
              {saving ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                <SelectValue placeholder="Select default collection" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <span className="flex items-center gap-2">
                  Automatic (your owned collection)
                </span>
              </SelectItem>
              {collections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    <span className="flex items-center gap-2">
                      <Watch className="w-4 h-4" />
                      {collection.name}
                    </span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-2">
            This preference is synced across all your devices.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
