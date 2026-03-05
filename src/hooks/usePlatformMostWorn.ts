import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MostWornItem {
  brand: string;
  model: string;
  ai_image_url: string | null;
  wear_count: number;
  user_count: number;
}

export function usePlatformMostWorn() {
  const { user } = useAuth();

  const platformQuery = useQuery({
    queryKey: ["platform-most-worn-week"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_most_worn_this_week");
      if (error) throw error;
      return (data || []) as MostWornItem[];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });

  const friendsQuery = useQuery({
    queryKey: ["friends-most-worn-week", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_friends_most_worn_this_week", {
        _user_id: user!.id,
      });
      if (error) throw error;
      return (data || []) as MostWornItem[];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });

  return {
    platformData: platformQuery.data || [],
    friendsData: friendsQuery.data || [],
    loading: platformQuery.isLoading || friendsQuery.isLoading,
  };
}
