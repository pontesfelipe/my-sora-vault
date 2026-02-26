import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CollectionType } from "@/types/collection";

export interface FeatureToggle {
  id: string;
  collection_type: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeatureMatrix {
  [featureKey: string]: {
    name: string;
    watches: boolean;
  };
}

export const useFeatureToggles = () => {
  const [toggles, setToggles] = useState<FeatureToggle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchToggles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('collection_feature_toggles')
        .select('*')
        .order('feature_key');

      if (error) throw error;
      setToggles((data || []) as FeatureToggle[]);
    } catch (error) {
      console.error('Error fetching feature toggles:', error);
      toast.error('Failed to load feature toggles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToggles();
  }, [fetchToggles]);

  const updateToggle = useCallback(async (toggleId: string, isEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('collection_feature_toggles')
        .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
        .eq('id', toggleId);

      if (error) throw error;

      setToggles(prev =>
        prev.map(t => (t.id === toggleId ? { ...t, is_enabled: isEnabled } : t))
      );

      toast.success(`Feature ${isEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating toggle:', error);
      toast.error('Failed to update feature toggle');
    }
  }, []);

  const isFeatureEnabled = useCallback(
    (collectionType: string, featureKey: string): boolean => {
      const toggle = toggles.find(
        t => t.collection_type === collectionType && t.feature_key === featureKey
      );
      return toggle?.is_enabled ?? true;
    },
    [toggles]
  );

  const getFeatureMatrix = useCallback((): FeatureMatrix => {
    const matrix: FeatureMatrix = {};

    const allFeatureKeys = [...new Set(toggles.map(t => t.feature_key))];

    for (const featureKey of allFeatureKeys) {
      const watchToggle = toggles.find(t => t.collection_type === 'watches' && t.feature_key === featureKey);

      const featureName = watchToggle?.feature_name || featureKey;

      matrix[featureKey] = {
        name: featureName,
        watches: watchToggle?.is_enabled ?? false,
      };
    }

    return matrix;
  }, [toggles]);

  const getToggleId = useCallback(
    (collectionType: string, featureKey: string): string | null => {
      const toggle = toggles.find(
        t => t.collection_type === collectionType && t.feature_key === featureKey
      );
      return toggle?.id || null;
    },
    [toggles]
  );

  return {
    toggles,
    loading,
    updateToggle,
    isFeatureEnabled,
    getFeatureMatrix,
    getToggleId,
    refetch: fetchToggles,
  };
};
