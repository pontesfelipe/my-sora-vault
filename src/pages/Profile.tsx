import { useState, useMemo, useEffect, useCallback } from "react";
import { PageTransition } from "@/components/PageTransition";
import { useNavigate } from "react-router-dom";
import {
  Watch, Settings, Heart, List, Plus, Search, Users, ChevronRight,
  Grid3X3, BookHeart, Bot, ShoppingBag, ArrowUpDown, ScrollText
} from "lucide-react";
import { CreateListDialog } from "@/components/CreateListDialog";
import { ListDetailView } from "@/components/ListDetailView";
import { useTrustLevel } from "@/hooks/useTrustLevel";
import { TrustLevelBadge } from "@/components/TrustLevelBadge";
import { WatchCaseGrid } from "@/components/WatchCaseGrid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWatchData } from "@/hooks/useWatchData";
import { useWishlistData } from "@/hooks/useWishlistData";
import { useCollection } from "@/contexts/CollectionContext";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { AddWatchDialog } from "@/components/AddWatchDialog";
import { CollectionSwitcher } from "@/components/CollectionSwitcher";
import { WishlistTable } from "@/components/WishlistTable";
import { AddWishlistDialog } from "@/components/AddWishlistDialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { motion } from "framer-motion";

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCollectionId, currentCollection, currentCollectionType, currentCollectionConfig } = useCollection();
  const { watches, wearEntries, loading, refetch } = useWatchData(selectedCollectionId);
  const { wishlist, loading: wishlistLoading, refetch: refetchWishlist } = useWishlistData();
  const { data: trustData, config: trustConfig } = useTrustLevel();
  const [activeTab, setActiveTab] = useState("collection");
  const [searchQuery, setSearchQuery] = useState("");
  const [profileData, setProfileData] = useState<any>(null);

  // Load profile data
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfileData(data);
      });
  }, [user]);

  // Get follower/following counts
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("friendships")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .then(({ count }) => setFollowingCount(count || 0));

    supabase
      .from("friendships")
      .select("id", { count: "exact" })
      .eq("friend_id", user.id)
      .then(({ count }) => setFollowerCount(count || 0));
  }, [user]);

  // Recent logs
  const recentLogs = useMemo(() => {
    return [...wearEntries]
      .sort((a, b) => b.wear_date.localeCompare(a.wear_date))
      .slice(0, 5)
      .map((entry) => ({
        ...entry,
        watch: watches.find((w) => w.id === entry.watch_id),
      }));
  }, [wearEntries, watches]);

  // Most worn (top favorites)
  const topWatches = useMemo(() => {
    const counts: Record<string, number> = {};
    wearEntries.forEach((e) => {
      counts[e.watch_id] = (counts[e.watch_id] || 0) + e.days;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({
        watch: watches.find((w) => w.id === id),
        count,
      }))
      .filter((x) => x.watch);
  }, [watches, wearEntries]);

  const filteredWatches = watches.filter(
    (w) =>
      w.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="space-y-5 pb-4">
      {/* Profile Header */}
      <div className="flex items-start gap-4">
        <UserAvatar size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold text-textMain truncate">
              {profileData?.username || profileData?.full_name || user?.email?.split("@")[0]}
            </h1>
            {trustData && <TrustLevelBadge level={trustData.trust_level} />}
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm text-textMuted">
              <strong className="text-textMain">{followerCount}</strong> followers
            </span>
            <span className="text-sm text-textMuted">
              <strong className="text-textMain">{followingCount}</strong> following
            </span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/vault-pal")}
            className="h-9 w-9"
          >
            <Bot className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
            className="h-9 w-9"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Top Favorites */}
      {topWatches.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-textMuted mb-2">
            Favorites
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {topWatches.map(({ watch, count }) => (
              <motion.div
                key={watch!.id}
                className="shrink-0 cursor-pointer"
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate(`/watch/${watch!.id}`)}
              >
                <div className="h-20 w-20 rounded-2xl bg-surfaceMuted overflow-hidden">
                  {watch!.ai_image_url ? (
                    <img src={watch!.ai_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Watch className="h-6 w-6 text-textMuted" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] font-medium text-textMain truncate w-20 mt-1">
                  {watch!.brand}
                </p>
                <p className="text-[10px] text-accent">{count}d</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Logs - "What I'm Wearing" */}
      {recentLogs.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-textMuted mb-2">
            Recent Wrist Checks
          </h2>
          <div className="space-y-1.5">
            {recentLogs.slice(0, 3).map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-surfaceMuted transition-colors cursor-pointer"
                onClick={() => log.watch && navigate(`/watch/${log.watch.id}`)}
              >
                <div className="h-8 w-8 rounded-lg bg-surfaceMuted overflow-hidden shrink-0">
                  {log.watch?.ai_image_url ? (
                    <img src={log.watch.ai_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Watch className="h-3 w-3 text-textMuted" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-textMain truncate">
                    {log.watch?.brand} {log.watch?.model}
                  </p>
                </div>
                <span className="text-xs text-textMuted shrink-0">
                  {format(new Date(log.wear_date), "MMM d")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Collection Switcher */}
      <div className="flex items-center justify-between">
        <CollectionSwitcher />
      </div>

      {/* Tabs: Collection, Wishlist, Lists */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="collection" className="gap-1.5 text-xs">
            <Grid3X3 className="h-3.5 w-3.5" />
            Collection
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="gap-1.5 text-xs">
            <Heart className="h-3.5 w-3.5" />
            Wishlist
          </TabsTrigger>
          <TabsTrigger value="lists" className="gap-1.5 text-xs">
            <List className="h-3.5 w-3.5" />
            Lists
          </TabsTrigger>
        </TabsList>

        {/* Collection Tab */}
        <TabsContent value="collection" className="mt-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textMuted" />
              <Input
                placeholder={`Search ${currentCollectionConfig.pluralLabel.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-full bg-surfaceMuted border-none text-sm"
              />
            </div>
            <AddWatchDialog onSuccess={refetch} />
          </div>

          {/* Collection Grid - "infinite watch box" */}
          {filteredWatches.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-borderSubtle">
              <Watch className="h-10 w-10 text-textMuted mx-auto mb-3" />
              <p className="text-sm text-textMuted">
                {searchQuery ? "No matches" : "Your collection is empty"}
              </p>
            </Card>
          ) : (
            <WatchCaseGrid watches={filteredWatches} wearEntries={wearEntries} onDelete={refetch} isLoading={loading} />
          )}
          <p className="text-xs text-textMuted text-center">
            {watches.length} {watches.length === 1 ? currentCollectionConfig.singularLabel.toLowerCase() : currentCollectionConfig.pluralLabel.toLowerCase()}
          </p>
        </TabsContent>

        {/* Wishlist Tab */}
        <TabsContent value="wishlist" className="mt-4 space-y-3">
          <WishlistTable items={wishlist} onDelete={refetchWishlist} />
        </TabsContent>

        {/* Lists Tab */}
        <TabsContent value="lists" className="mt-4 space-y-3">
          <ListsSection watches={watches} />
        </TabsContent>
      </Tabs>
    </div>
    </PageTransition>
  );
};

function ListsSection({ watches }: { watches: any[] }) {
  const { user } = useAuth();
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<any>(null);

  const fetchLists = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_lists")
      .select("*, list_items(watch_id)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setLists(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // Trade list (system-level, not stored in user_lists)
  const tradeWatches = watches.filter((w) => w.available_for_trade);

  if (selectedList) {
    if (selectedList.id === "__trade__") {
      return (
        <ListDetailView
          list={{ id: "__trade__", name: "Trade", is_system: true }}
          watches={watches}
          onBack={() => setSelectedList(null)}
        />
      );
    }
    return (
      <ListDetailView
        list={selectedList}
        watches={watches}
        onBack={() => setSelectedList(null)}
        onDelete={fetchLists}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end mb-2">
        <CreateListDialog onSuccess={fetchLists} />
      </div>

      {/* Trade system list */}
      <Card
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surfaceMuted transition-colors border-borderSubtle"
        onClick={() => setSelectedList({ id: "__trade__", name: "Trade", is_system: true })}
      >
        <div className="h-9 w-9 rounded-xl bg-accentSubtle flex items-center justify-center">
          <ArrowUpDown className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-textMain">Trade</p>
          <p className="text-xs text-textMuted">{tradeWatches.length} items</p>
        </div>
        <ChevronRight className="h-4 w-4 text-textMuted" />
      </Card>

      {/* Custom lists */}
      {lists.map((list) => (
        <Card
          key={list.id}
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surfaceMuted transition-colors border-borderSubtle"
          onClick={() => setSelectedList(list)}
        >
          <div className="h-9 w-9 rounded-xl bg-surfaceMuted flex items-center justify-center">
            <List className="h-4 w-4 text-textMuted" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-textMain">{list.name}</p>
            <p className="text-xs text-textMuted">
              {list.list_items?.length || 0} items
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-textMuted" />
        </Card>
      ))}

      {lists.length === 0 && (
        <Card className="p-4 text-center border-dashed border-borderSubtle text-sm text-textMuted">
          <p>Create custom lists to organize your collection</p>
          <p className="text-xs mt-1">e.g. "Dive Watches", "My Top 10"</p>
        </Card>
      )}
    </div>
  );
}

export default Profile;
