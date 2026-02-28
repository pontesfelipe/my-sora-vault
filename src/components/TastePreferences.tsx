import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, Wand2, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TastePreferencesProps {
  onSuggest: (description: string, focusOnGaps?: boolean) => void;
  isGenerating: boolean;
  remainingUsage?: number | null;
}

export const TastePreferences = ({ onSuggest, isGenerating, remainingUsage }: TastePreferencesProps) => {
  const [tasteDescription, setTasteDescription] = useState("");
  const [saved, setSaved] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [focusOnGaps, setFocusOnGaps] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data?.taste_description) {
        setTasteDescription(data.taste_description);
        setSaved(true);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const handleSave = async () => {
    try {
      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_preferences")
          .update({ taste_description: tasteDescription })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_preferences")
          .insert([{ taste_description: tasteDescription }]);
        if (error) throw error;
      }

      setSaved(true);
      toast({
        title: "Preferences saved",
        description: "Your taste preferences have been saved",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
    }
  };

  const handleAnalyzeCollection = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-taste-profile");

      if (error) throw error;

      if (data?.tasteProfile) {
        setTasteDescription(data.tasteProfile);
        setSaved(false);
        toast({
          title: "Taste profile generated",
          description: "Your collection has been analyzed. Review and save the generated profile.",
        });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Error analyzing collection:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to analyze collection",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Wishlist Generator
        </CardTitle>
        <CardDescription>
          Describe your taste preferences or auto-generate from your collection, then let AI suggest watches for your wishlist
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button
            onClick={handleAnalyzeCollection}
            variant="outline"
            size="sm"
            disabled={isAnalyzing || isGenerating}
            className="gap-2"
          >
            <Wand2 className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? "Analyzing..." : "Auto-Generate from Collection"}
          </Button>
        </div>
        <Textarea
          value={tasteDescription}
          onChange={(e) => {
            setTasteDescription(e.target.value);
            setSaved(false);
          }}
          placeholder="Describe what you love in watches: styles, brands, complications, price range, occasions... Or click 'Auto-Generate from Collection' to analyze your existing collection."
          rows={6}
          className="resize-none"
        />

        <div className="flex items-center gap-2">
          <Switch
            id="focus-gaps"
            checked={focusOnGaps}
            onCheckedChange={setFocusOnGaps}
          />
          <Label htmlFor="focus-gaps" className="flex items-center gap-1.5 text-sm cursor-pointer">
            <Target className="w-3.5 h-3.5" />
            Focus on collection gaps
          </Label>
          <span className="text-xs text-muted-foreground ml-1">
            (suggest watches that fill missing categories)
          </span>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              variant="outline"
              disabled={!tasteDescription.trim() || saved}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {saved ? "Saved" : "Save Preferences"}
            </Button>
            <Button
              onClick={() => onSuggest(tasteDescription, focusOnGaps)}
              disabled={isGenerating || !tasteDescription.trim() || remainingUsage === 0}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? "Generating..." : "Generate AI Suggestions"}
            </Button>
          </div>
          {remainingUsage !== null && remainingUsage !== undefined && (
            <span className="text-xs text-muted-foreground">
              {remainingUsage} uses remaining this month
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
