import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { Watch, Loader2, Trash2, Plus, X, ToggleRight, BarChart3 } from "lucide-react";
import { AddFeatureDialog } from "./AddFeatureDialog";
import { FeatureUsageAnalytics } from "./FeatureUsageAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const collectionIcons: Record<string, React.ReactNode> = {
  watches: <Watch className="h-4 w-4" />,
};

// Core features that cannot be deleted or extended
const PROTECTED_FEATURE_KEYS = [
  'wear_tracking',
  'ai_analysis', 
  'price_tracking',
  'depreciation',
  'trade_matching',
  'water_tracking',
  'movement_specs',
  'warranty_tracking',
  'condition_grading',
  'box_status',
  'og_all_tracking',
  'collaboration_tracking',
  'authenticity_tracking',
  'size_breakdown',
  'material_tracking',
];

export const FeatureMatrixTab = () => {
  const { toggles, loading, updateToggle, getFeatureMatrix, getToggleId, refetch } = useFeatureToggles();
  const [extendingFeature, setExtendingFeature] = useState<{ featureKey: string; collectionType: string } | null>(null);
  const [removingFeature, setRemovingFeature] = useState<{ featureKey: string; collectionType: string; featureName: string } | null>(null);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const matrix = getFeatureMatrix();
  const featureKeys = Object.keys(matrix);
  const collectionTypes: string[] = ['watches'];

  const handleToggle = async (collectionType: CollectionType, featureKey: string, currentValue: boolean) => {
    const toggleId = getToggleId(collectionType, featureKey);
    if (toggleId) {
      await updateToggle(toggleId, !currentValue);
    }
  };

  const handleExtendFeature = async (featureKey: string, collectionType: CollectionType, featureName: string) => {
    setExtendingFeature({ featureKey, collectionType });
    try {
      const { error } = await supabase
        .from('collection_feature_toggles')
        .insert({
          collection_type: collectionType,
          feature_key: featureKey,
          feature_name: featureName,
          is_enabled: true,
        });

      if (error) throw error;

      toast.success(`Extended "${featureName}" to ${COLLECTION_CONFIGS[collectionType].label}`);
      refetch();
    } catch (error: any) {
      console.error("Error extending feature:", error);
      toast.error(error.message || "Failed to extend feature");
    } finally {
      setExtendingFeature(null);
    }
  };

  const handleRemoveFromType = async (featureKey: string, collectionType: CollectionType) => {
    try {
      const toggleId = getToggleId(collectionType, featureKey);
      if (!toggleId) return;

      const { error } = await supabase
        .from('collection_feature_toggles')
        .delete()
        .eq('id', toggleId);

      if (error) throw error;

      toast.success("Feature removed from collection type");
      refetch();
    } catch (error: any) {
      console.error("Error removing feature:", error);
      toast.error(error.message || "Failed to remove feature");
    } finally {
      setRemovingFeature(null);
    }
  };

  const handleDeleteFeature = async (featureKey: string) => {
    try {
      const { error } = await supabase
        .from('collection_feature_toggles')
        .delete()
        .eq('feature_key', featureKey);

      if (error) throw error;

      toast.success("Feature deleted successfully");
      refetch();
    } catch (error: any) {
      console.error("Error deleting feature:", error);
      toast.error(error.message || "Failed to delete feature");
    }
  };

  // Group features by category
  const coreFeatureKeys = ['wear_tracking', 'ai_analysis', 'price_tracking', 'depreciation', 'trade_matching'];
  const typeSpecificKeys = ['water_tracking', 'movement_specs', 'warranty_tracking', 'condition_grading', 'box_status', 'og_all_tracking', 'collaboration_tracking', 'authenticity_tracking', 'size_breakdown', 'material_tracking'];
  
  // Custom features are any that aren't in the predefined lists
  const customFeatureKeys = featureKeys.filter(
    key => !coreFeatureKeys.includes(key) && !typeSpecificKeys.includes(key)
  );

  const existingFeatureKeys = [...new Set(toggles.map(t => t.feature_key))];

  // Count how many collection types have this feature
  const getFeatureTypeCount = (featureKey: string): number => {
    return collectionTypes.filter(type => getToggleId(type, featureKey) !== null).length;
  };

  const renderFeatureTable = (groupName: string, groupFeatureKeys: string[], allowModify: boolean) => {
    const relevantFeatures = featureKeys.filter(key => groupFeatureKeys.includes(key));
    if (relevantFeatures.length === 0) return null;

    return (
      <div key={groupName}>
        <h3 className="text-lg font-semibold mb-4">{groupName}</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Feature</TableHead>
                {collectionTypes.map((type) => (
                  <TableHead key={type} className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {collectionIcons[type]}
                      <span>{COLLECTION_CONFIGS[type].label}</span>
                    </div>
                  </TableHead>
                ))}
                {allowModify && <TableHead className="w-[80px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {relevantFeatures.map((featureKey) => {
                const feature = matrix[featureKey];
                if (!feature) return null;

                const isProtected = PROTECTED_FEATURE_KEYS.includes(featureKey);
                const typeCount = getFeatureTypeCount(featureKey);

                return (
                  <TableRow key={featureKey}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {feature.name}
                        <Badge variant="outline" className="text-xs">
                          {featureKey}
                        </Badge>
                      </div>
                    </TableCell>
                    {collectionTypes.map((type) => {
                      const toggleId = getToggleId(type, featureKey);
                      const isAvailable = toggleId !== null;
                      const isEnabled = feature[type];
                      const isExtending = extendingFeature?.featureKey === featureKey && extendingFeature?.collectionType === type;
                      const canRemoveFromType = allowModify && typeCount > 1;

                      return (
                        <TableCell key={type} className="text-center">
                          {isAvailable ? (
                            <div className="flex items-center justify-center gap-1">
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={() => handleToggle(type, featureKey, isEnabled)}
                              />
                              {canRemoveFromType && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Remove from {COLLECTION_CONFIGS[type].label}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to remove "{feature.name}" from {COLLECTION_CONFIGS[type].label}? 
                                              The feature will still be available for other collection types.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleRemoveFromType(featureKey, type)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Remove
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Remove from {COLLECTION_CONFIGS[type].label}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          ) : allowModify ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    onClick={() => handleExtendFeature(featureKey, type, feature.name)}
                                    disabled={isExtending}
                                  >
                                    {isExtending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Plus className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Add to {COLLECTION_CONFIGS[type].label}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                    {allowModify && (
                      <TableCell>
                        {!isProtected && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Feature</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{feature.name}"? This will remove the feature from all collection types and cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteFeature(featureKey)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <Tabs defaultValue="configuration" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="configuration" className="flex items-center gap-2">
          <ToggleRight className="h-4 w-4" />
          Configuration
        </TabsTrigger>
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Usage Analytics
        </TabsTrigger>
      </TabsList>

      <TabsContent value="configuration">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Feature Matrix</CardTitle>
              <CardDescription>
                Configure which features are available for each collection type. 
                Toggle features on or off to customize the experience.
              </CardDescription>
            </div>
            <AddFeatureDialog onSuccess={refetch} existingFeatureKeys={existingFeatureKeys} />
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {renderFeatureTable('Core Features', coreFeatureKeys, false)}
              {renderFeatureTable('Type-Specific', typeSpecificKeys, false)}
              {customFeatureKeys.length > 0 && renderFeatureTable('Custom Features', customFeatureKeys, true)}
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Legend</h4>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Switch checked disabled className="scale-75" />
                  <span>Feature enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={false} disabled className="scale-75" />
                  <span>Feature disabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Click to extend feature to this type</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="h-3 w-3" />
                  <span>Remove from this type</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>—</span>
                  <span>Not applicable (core features)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="analytics">
        <Card>
          <CardHeader>
            <CardTitle>Feature Usage Analytics</CardTitle>
            <CardDescription>
              Track how features are being used across different collection types.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeatureUsageAnalytics />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
