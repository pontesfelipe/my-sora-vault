import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/UserAvatar";
import { WatchShowcaseCard } from "@/components/WatchShowcaseCard";
import { PostCard } from "@/components/forum/PostCard";
import { useForumData } from "@/hooks/useForumData";
import { Loader2, ArrowLeft, Lock, UserPlus, MessageCircle, Watch, FileText, Shield } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { TrustLevelBadge } from "@/components/TrustLevelBadge";

interface UserProfileData {
  id: string;
  username: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
  full_name: string | null;
}

interface PublicWatch {
  id: string;
  brand: string;
  model: string;
  dial_color: string;
  type: string;
  ai_image_url: string | null;
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [watches, setWatches] = useState<PublicWatch[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [isCollectionPublic, setIsCollectionPublic] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [trustLevel, setTrustLevel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("posts");

  const isOwnProfile = user?.id === id;

  useEffect(() => {
    if (!id) return;
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    if (!id) return;
    setLoading(true);

    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, avatar_color, full_name")
        .eq("id", id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Load trust level
      const { data: trustData } = await supabase
        .from("user_trust_levels")
        .select("trust_level")
        .eq("user_id", id)
        .maybeSingle();

      if (trustData) {
        setTrustLevel(trustData.trust_level);
      }

      // Check if collection is public
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("is_collection_public")
        .eq("user_id", id)
        .maybeSingle();

      const collectionPublic = prefs?.is_collection_public ?? false;
      setIsCollectionPublic(collectionPublic);

      // Load public posts
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(20);

      setPosts(postsData || []);

      // Load public collection if enabled
      if (collectionPublic) {
        const { data: watchesData } = await supabase
          .from("watches")
          .select("id, brand, model, dial_color, type, ai_image_url")
          .eq("user_id", id)
          .eq("status", "active")
          .order("sort_order", { ascending: true });

        setWatches(watchesData || []);
      }

      // Check friendship status
      if (user && user.id !== id) {
        const { data: friendship } = await supabase
          .from("friendships")
          .select("id")
          .eq("user_id", user.id)
          .eq("friend_id", id)
          .maybeSingle();

        setIsFriend(!!friendship);

        if (!friendship) {
          const { data: request } = await supabase
            .from("friend_requests")
            .select("id")
            .eq("from_user_id", user.id)
            .eq("to_user_id", id)
            .eq("status", "pending")
            .maybeSingle();

          setFriendRequestSent(!!request);
        }
      }
    } catch (err) {
      console.error("Error loading user profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!user || !id) return;
    try {
      const { error } = await supabase
        .from("friend_requests")
        .insert({ from_user_id: user.id, to_user_id: id });

      if (error) throw error;
      setFriendRequestSent(true);
      toast.success(t("feed.friendRequestSent", "Friend request sent!"));
    } catch (err: any) {
      toast.error(err.message || "Failed to send request");
    }
  };

  const handleMessage = async () => {
    navigate("/feed?tab=messages");
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-textMuted" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-textMuted">User not found</p>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Go back
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-6 pb-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-textMain">
              {profile.username || "User"}'s Profile
            </h1>
          </div>

          {/* Profile card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <UserAvatar
                  username={profile.username}
                  avatarUrl={profile.avatar_url}
                  avatarColor={profile.avatar_color}
                  size="lg"
                />
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-textMain">
                    {profile.username || "Unknown User"}
                  </h2>
                  {profile.full_name && (
                    <p className="text-sm text-textMuted">{profile.full_name}</p>
                  )}
                  {trustLevel && (
                    <div className="mt-2">
                      <TrustLevelBadge level={trustLevel as any} />
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!isOwnProfile && user && (
                  <div className="flex gap-2">
                    {isFriend ? (
                      <Button variant="outline" size="sm" onClick={handleMessage}>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    ) : friendRequestSent ? (
                      <Button variant="outline" size="sm" disabled>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Request Sent
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handleSendFriendRequest}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Friend
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="posts" className="gap-2">
                <FileText className="h-4 w-4" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="collection" className="gap-2">
                <Watch className="h-4 w-4" />
                Collection
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-4">
              {posts.length === 0 ? (
                <Card className="p-8 text-center border-dashed border-borderSubtle">
                  <FileText className="h-10 w-10 text-textMuted mx-auto mb-3" />
                  <p className="text-sm text-textMuted">No posts yet</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <Card key={post.id} className="p-4">
                      <h3 className="font-medium text-textMain">{post.title}</h3>
                      {post.content && (
                        <p className="text-sm text-textMuted mt-1 line-clamp-3">{post.content}</p>
                      )}
                      {post.image_url && (
                        <img src={post.image_url} alt="" className="mt-2 rounded-lg max-h-48 object-cover w-full" />
                      )}
                      <p className="text-xs text-textMuted mt-2">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="collection" className="mt-4">
              {!isCollectionPublic ? (
                <Card className="p-8 text-center border-dashed border-borderSubtle">
                  <Lock className="h-10 w-10 text-textMuted mx-auto mb-3" />
                  <h3 className="text-base font-medium text-textMain mb-1">Collection is Private</h3>
                  <p className="text-sm text-textMuted">
                    This user has chosen to keep their collection private.
                  </p>
                </Card>
              ) : watches.length === 0 ? (
                <Card className="p-8 text-center border-dashed border-borderSubtle">
                  <Watch className="h-10 w-10 text-textMuted mx-auto mb-3" />
                  <p className="text-sm text-textMuted">No items in collection</p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {watches.map((watch) => (
                    <Card key={watch.id} className="overflow-hidden">
                      {watch.ai_image_url ? (
                        <img
                          src={watch.ai_image_url}
                          alt={`${watch.brand} ${watch.model}`}
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-surfaceMuted flex items-center justify-center">
                          <Watch className="h-8 w-8 text-textMuted" />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs font-medium text-textMain truncate">{watch.brand}</p>
                        <p className="text-xs text-textMuted truncate">{watch.model}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
