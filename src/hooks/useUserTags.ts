import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface UserTag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WatchTag {
  watch_id: string;
  tag_id: string;
}

const MAX_TAGS = 15;

export const useUserTags = () => {
  const { user } = useAuth();
  const [tags, setTags] = useState<UserTag[]>([]);
  const [watchTags, setWatchTags] = useState<WatchTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    if (!user) { setTags([]); setWatchTags([]); setLoading(false); return; }
    
    const [tagsResult, watchTagsResult] = await Promise.all([
      (supabase.from("user_tags" as any) as any).select("*").eq("user_id", user.id).order("sort_order"),
      (supabase.from("watch_tags" as any) as any).select("watch_id, tag_id"),
    ]);

    if (tagsResult.data) setTags(tagsResult.data);
    if (watchTagsResult.data) setWatchTags(watchTagsResult.data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const createTag = async (name: string): Promise<UserTag | null> => {
    if (!user) return null;
    if (tags.length >= MAX_TAGS) {
      toast.error(`Maximum ${MAX_TAGS} tags allowed`);
      return null;
    }
    const trimmed = name.trim();
    if (!trimmed) return null;
    if (tags.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Tag already exists");
      return null;
    }

    const { data, error } = await (supabase.from("user_tags" as any) as any)
      .insert({ user_id: user.id, name: trimmed, sort_order: tags.length })
      .select()
      .single();

    if (error) { toast.error("Failed to create tag"); return null; }
    setTags(prev => [...prev, data]);
    return data;
  };

  const updateTag = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (tags.some(t => t.id !== id && t.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Tag name already exists");
      return;
    }

    const { error } = await (supabase.from("user_tags" as any) as any)
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) { toast.error("Failed to update tag"); return; }
    setTags(prev => prev.map(t => t.id === id ? { ...t, name: trimmed } : t));
  };

  const deleteTag = async (id: string) => {
    const { error } = await (supabase.from("user_tags" as any) as any).delete().eq("id", id);
    if (error) { toast.error("Failed to delete tag"); return; }
    setTags(prev => prev.filter(t => t.id !== id));
    setWatchTags(prev => prev.filter(wt => wt.tag_id !== id));
  };

  const assignTagToWatch = async (watchId: string, tagId: string) => {
    if (watchTags.some(wt => wt.watch_id === watchId && wt.tag_id === tagId)) return;
    const { error } = await (supabase.from("watch_tags" as any) as any)
      .insert({ watch_id: watchId, tag_id: tagId });
    if (error) return;
    setWatchTags(prev => [...prev, { watch_id: watchId, tag_id: tagId }]);
  };

  const removeTagFromWatch = async (watchId: string, tagId: string) => {
    const { error } = await (supabase.from("watch_tags" as any) as any)
      .delete()
      .eq("watch_id", watchId)
      .eq("tag_id", tagId);
    if (error) return;
    setWatchTags(prev => prev.filter(wt => !(wt.watch_id === watchId && wt.tag_id === tagId)));
  };

  const getWatchTagIds = (watchId: string) => watchTags.filter(wt => wt.watch_id === watchId).map(wt => wt.tag_id);
  const getWatchesForTag = (tagId: string) => watchTags.filter(wt => wt.tag_id === tagId).map(wt => wt.watch_id);
  const canCreateMore = tags.length < MAX_TAGS;

  return {
    tags, watchTags, loading, canCreateMore,
    createTag, updateTag, deleteTag,
    assignTagToWatch, removeTagFromWatch,
    getWatchTagIds, getWatchesForTag,
    refetch: fetchTags,
  };
};
