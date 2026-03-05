import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, Users, Bell, MessageSquare, Search, Loader2 } from "lucide-react";
import { useMessaging, Conversation } from "@/hooks/useMessaging";
import { useForumData, FORUM_CATEGORIES } from "@/hooks/useForumData";
import { useAuth } from "@/contexts/AuthContext";
import { ConversationList } from "@/components/messaging/ConversationList";
import { ChatWindow } from "@/components/messaging/ChatWindow";
import { FriendRequestsList } from "@/components/messaging/FriendRequestsList";
import { TradeNotificationsList } from "@/components/messaging/TradeNotificationsList";
import { AddFriendDialog } from "@/components/messaging/AddFriendDialog";
import { FriendsList } from "@/components/messaging/FriendsList";
import { CreatePostDialog } from "@/components/forum/CreatePostDialog";
import { PostCard } from "@/components/forum/PostCard";
import { MentionNotificationsDropdown } from "@/components/forum/MentionNotificationsDropdown";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

export default function Social() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "messages";
  const [mainTab, setMainTab] = useState(initialTab);

  const handleMainTabChange = (value: string) => {
    setMainTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Tabs value={mainTab} onValueChange={handleMainTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="forum" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Forum
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-0">
          <MessagesSection />
        </TabsContent>

        <TabsContent value="forum" className="mt-0">
          <ForumSection />
        </TabsContent>
      </Tabs>
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
  const [activeTab, setActiveTab] = useState("chats");

  const totalNotifications = friendRequests.length + tradeNotifications.length;
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const handleAcceptRequest = async (requestId: string) => {
    const result = await acceptFriendRequest(requestId);
    if (result.success) {
      toast.success("Friend request accepted!");
    } else {
      toast.error(result.error || "Failed to accept request");
    }
    return result;
  };

  const handleDeclineRequest = async (requestId: string) => {
    const result = await declineFriendRequest(requestId);
    if (result.success) {
      toast.info("Friend request declined");
    } else {
      toast.error(result.error || "Failed to decline request");
    }
    return result;
  };

  const handleRemoveFriend = async (friendId: string) => {
    const result = await removeFriend(friendId);
    if (result.success) {
      toast.success("Friend removed");
      if (selectedConversation && 
          (selectedConversation.user1_id === friendId || selectedConversation.user2_id === friendId)) {
        setSelectedConversation(null);
      }
    } else {
      toast.error(result.error || "Failed to remove friend");
    }
    return result;
  };

  const handleStartChat = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setActiveTab("chats");
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
        <Skeleton className="h-full" />
        <Skeleton className="lg:col-span-2 h-full" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-textMain">Messages</h2>
          <p className="text-sm text-textMuted">Chat with friends and discover trade opportunities</p>
        </div>
        <AddFriendDialog onSendRequest={sendFriendRequest} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-320px)]">
        {/* Sidebar */}
        <Card className="overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="w-full grid grid-cols-3 rounded-none border-b border-borderSubtle">
              <TabsTrigger value="chats" className="relative">
                <MessageCircle className="h-4 w-4 mr-1" />
                Chats
                {totalUnread > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs p-0">
                    {totalUnread}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="friends">
                <Users className="h-4 w-4 mr-1" />
                Friends
              </TabsTrigger>
              <TabsTrigger value="notifications" className="relative">
                <Bell className="h-4 w-4 mr-1" />
                Alerts
                {totalNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs p-0">
                    {totalNotifications}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chats" className="flex-1 overflow-y-auto m-0">
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversation?.id || null}
                onSelect={setSelectedConversation}
              />
            </TabsContent>

            <TabsContent value="friends" className="flex-1 overflow-y-auto m-0 p-3">
              <FriendsList
                friends={friends}
                conversations={conversations}
                onRemove={handleRemoveFriend}
                onStartChat={handleStartChat}
              />
            </TabsContent>

            <TabsContent value="notifications" className="flex-1 overflow-y-auto m-0 p-3 space-y-4">
              <TradeNotificationsList
                notifications={tradeNotifications}
                onDismiss={dismissTradeNotification}
                onSendFriendRequestById={sendFriendRequestById}
              />
              <FriendRequestsList
                requests={friendRequests}
                onAccept={handleAcceptRequest}
                onDecline={handleDeclineRequest}
              />
              {totalNotifications === 0 && (
                <div className="text-center text-textMuted py-8">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 overflow-hidden">
          <ChatWindow
            conversation={selectedConversation}
            onSendMessage={sendMessage}
            onMarkAsRead={markMessagesAsRead}
          />
        </Card>
      </div>
    </>
  );
}

function ForumSection() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  const { posts, loading, createPost, updatePost, deletePost, togglePinPost, votePost } = useForumData({
    searchQuery,
    category: selectedCategory
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-textMain">Forum</h2>
          <p className="text-sm text-textMuted">Share posts and discussions with the community</p>
        </div>
        <div className="flex items-center gap-2">
          {user && <MentionNotificationsDropdown />}
          {user && <CreatePostDialog onSubmit={createPost} />}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textMuted" />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {FORUM_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {t(cat.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-textMuted" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-textMuted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-textMain mb-2">
            {searchQuery || selectedCategory !== 'all' ? "No posts found" : "No posts yet"}
          </h3>
          <p className="text-textMuted">
            {searchQuery || selectedCategory !== 'all' 
              ? "Try adjusting your search or filter" 
              : user 
                ? "Be the first to start a conversation!" 
                : "Sign in to create the first post"
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {posts.map(post => (
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
    </>
  );
}
