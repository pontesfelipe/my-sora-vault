import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Watch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CollectionType, COLLECTION_CONFIGS } from "@/types/collection";

interface AddFeatureDialogProps {
  onSuccess: () => void;
  existingFeatureKeys: string[];
}

const collectionIcons: Record<string, React.ReactNode> = {
  watches: <Watch className="h-4 w-4" />,
};

export const AddFeatureDialog = ({ onSuccess, existingFeatureKeys }: AddFeatureDialogProps) => {
  const [open, setOpen] = useState(false);
  const [featureName, setFeatureName] = useState("");
  const [featureKey, setFeatureKey] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const collectionTypes: CollectionType[] = ['watches'];

  const generateFeatureKey = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 30);
  };

  const handleNameChange = (name: string) => {
    setFeatureName(name);
    if (!featureKey || featureKey === generateFeatureKey(featureName)) {
      setFeatureKey(generateFeatureKey(name));
    }
  };

  const handleTypeToggle = (type: CollectionType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSubmit = async () => {
    if (!featureName.trim()) {
      toast.error("Please enter a feature name");
      return;
    }

    if (!featureKey.trim()) {
      toast.error("Please enter a feature key");
      return;
    }

    if (selectedTypes.length === 0) {
      toast.error("Please select at least one collection type");
      return;
    }

    // Check for duplicate keys in selected types
    const duplicateKey = existingFeatureKeys.includes(featureKey);
    if (duplicateKey) {
      toast.error("A feature with this key already exists");
      return;
    }

    setIsSubmitting(true);

    try {
      const insertData = selectedTypes.map(type => ({
        collection_type: type,
        feature_key: featureKey.trim(),
        feature_name: featureName.trim(),
        is_enabled: true,
      }));

      const { error } = await supabase
        .from('collection_feature_toggles')
        .insert(insertData);

      if (error) throw error;

      toast.success("Feature added successfully");
      setOpen(false);
      setFeatureName("");
      setFeatureKey("");
      setSelectedTypes([]);
      onSuccess();
    } catch (error: any) {
      console.error("Error adding feature:", error);
      toast.error(error.message || "Failed to add feature");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Feature
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Feature</DialogTitle>
          <DialogDescription>
            Create a new feature toggle that can be enabled or disabled for specific collection types.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="featureName">Feature Name</Label>
            <Input
              id="featureName"
              placeholder="e.g., Custom Analytics"
              value={featureName}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="featureKey">Feature Key</Label>
            <Input
              id="featureKey"
              placeholder="e.g., custom_analytics"
              value={featureKey}
              onChange={(e) => setFeatureKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and underscores only. Used in code to reference this feature.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Collection Types</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select which collection types this feature applies to.
            </p>
            <div className="space-y-2">
              {collectionTypes.map((type) => (
                <div key={type} className="flex items-center space-x-3">
                  <Checkbox
                    id={`type-${type}`}
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={() => handleTypeToggle(type)}
                  />
                  <label
                    htmlFor={`type-${type}`}
                    className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                  >
                    {collectionIcons[type]}
                    {COLLECTION_CONFIGS[type].label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Feature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
