import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export type FeedFilter = "all" | "friends" | "trending" | "news" | "articles" | "videos";

export interface FeedItem {
  feed_id: string;
  feed_type: string;
  title: string;
  content: string | null;
  image_url: string | null;
  author_id: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  external_url: string | null;
  author_trust_level: string | null;
  watch_authenticated: boolean;
}

const PAGE_SIZE = 10;

export function useHomeFeed(maxItems?: number) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FeedFilter>("friends");
  const [page, setPage] = useState(0);

  const effectiveLimit = maxItems || PAGE_SIZE * (page + 1);

  const query = useQuery({
    queryKey: ["home-feed", user?.id, filter, page, maxItems],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_home_feed", {
        _user_id: user!.id,
        _filter: filter,
        _limit: effectiveLimit,
        _offset: 0,
      });
      if (error) throw error;
      return (data || []) as FeedItem[];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });

  const loadMore = () => setPage((p) => p + 1);

  const hasMore = !maxItems && (query.data?.length || 0) >= PAGE_SIZE * (page + 1);

  return {
    items: query.data || [],
    loading: query.isLoading,
    filter,
    setFilter: (f: FeedFilter) => {
      setFilter(f);
      setPage(0);
    },
    loadMore,
    hasMore,
  };
}
