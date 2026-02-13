import { useState } from "react";
import { MessageCircle, Heart, MessageSquare, Search, Loader2, Users, Camera, Plus } from "lucide-react";
import { useForumData, FORUM_CATEGORIES } from "@/hooks/useForumData";
import { useAuth } from "@/contexts/AuthContext";
import { CreatePostDialog } from "@/components/forum/CreatePostDialog";
import { PostCard } from "@/components/forum/PostCard";
import { MentionNotificationsDropdown } from "@/components/forum/MentionNotificationsDropdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useMessaging } from "@/hooks/useMessaging";
import { ConversationList } from "@/components/messaging/ConversationList";
import { ChatWindow } from "@/components/messaging/ChatWindow";
import { AddFriendDialog } from "@/components/messaging/AddFriendDialog";
import { FriendRequestsList } from "@/components/messaging/FriendRequestsList";
import { TradeNotificationsList } from "@/components/messaging/TradeNotificationsList";
import { toast } from "sonner";
import type { Conversation } from "@/hooks/useMessaging";

export default function Feed() {
  const [activeTab, setActiveTab] = useState("feed");
  const { user } = useAuth();

  return (
    <div className="space-y-4 pb-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="feed" className="gap-2">
            <Users className="h-4 w-4" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-4">
          <FeedSection />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <MessagesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FeedSection() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { posts, loading, createPost, updatePost, deletePost, togglePinPost, votePost } = useForumData({
    searchQuery,
    category: selectedCategory,
  });

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textMuted" />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-full bg-surfaceMuted border-none text-sm"
          />
        </div>
        {user && <MentionNotificationsDropdown />}
        {user && <CreatePostDialog onSubmit={createPost} />}
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedCategory === "all"
              ? "bg-accent text-accent-foreground"
              : "bg-surfaceMuted text-textMuted hover:text-textMain"
          }`}
        >
          All
        </button>
        {FORUM_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === cat.value
                ? "bg-accent text-accent-foreground"
                : "bg-surfaceMuted text-textMuted hover:text-textMain"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-textMuted" />
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-borderSubtle">
          <MessageSquare className="h-10 w-10 text-textMuted mx-auto mb-3" />
          <h3 className="text-base font-medium text-textMain mb-1">
            {searchQuery ? "No posts found" : "Nothing here yet"}
          </h3>
          <p className="text-sm text-textMuted">
            {user ? "Be the first to share something!" : "Sign in to join the conversation"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onVote={votePost}
              onDelete={deletePost}
              onEdit={updatePost}
              onTogglePin={togglePinPost}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MessagesSection() {
  const {
    friends,
    friendRequests,
    conversations,
    tradeNotifications,
    loading,
    sendFriendRequest,
    sendFriendRequestById,
    acceptFriendRequest,
    declineFriendRequest,
    sendMessage,
    markMessagesAsRead,
    dismissTradeNotification,
    removeFriend,
  } = useMessaging();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-textMuted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-textMuted">
          {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
        </p>
        <AddFriendDialog onSendRequest={sendFriendRequest} />
      </div>

      {/* Friend requests & trade notifications */}
      {(friendRequests.length > 0 || tradeNotifications.length > 0) && (
        <Card className="p-3 space-y-3 border-accent/20 bg-accentSubtle/20">
          <TradeNotificationsList
            notifications={tradeNotifications}
            onDismiss={dismissTradeNotification}
            onSendFriendRequestById={sendFriendRequestById}
          />
          <FriendRequestsList
            requests={friendRequests}
            onAccept={async (id) => {
              const result = await acceptFriendRequest(id);
              if (result.success) toast.success("Friend request accepted!");
              return result;
            }}
            onDecline={async (id) => {
              const result = await declineFriendRequest(id);
              if (result.success) toast.info("Request declined");
              return result;
            }}
          />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-360px)] min-h-[400px]">
        <Card className="overflow-hidden">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation?.id || null}
            onSelect={setSelectedConversation}
          />
        </Card>
        <Card className="lg:col-span-2 overflow-hidden">
          <ChatWindow
            conversation={selectedConversation}
            onSendMessage={sendMessage}
            onMarkAsRead={markMessagesAsRead}
          />
        </Card>
      </div>
    </div>
  );
}
