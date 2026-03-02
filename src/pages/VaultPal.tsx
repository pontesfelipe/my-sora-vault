import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Trash2, Bot, Sparkles, Loader2, User, Plus, MessageSquare, Pencil, Search, X, ChevronDown, ChevronUp, RefreshCw, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVaultPalChat, ChatMessage, Conversation } from "@/hooks/useVaultPalChat";
import { useCollection } from "@/contexts/CollectionContext";
import { CollectionSwitcher } from "@/components/CollectionSwitcher";
import { getItemLabel } from "@/types/collection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { SwipeableConversationItem } from "@/components/SwipeableConversationItem";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { useVoiceInput } from "@/hooks/useVoiceInput";

const VaultPal = () => {
  const {
    messages,
    conversations,
    currentConversationId,
    isLoading,
    isLoadingConversations,
    isSearching,
    searchQuery,
    sendMessage,
    loadConversation,
    startNewChat,
    deleteConversation,
    updateConversationTitle,
    searchConversations,
  } = useVaultPalChat();
  const { currentCollection, currentCollectionType } = useCollection();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [collectionInsights, setCollectionInsights] = useState<string | null>(null);
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  // Voice input hook
  const { isListening, isSupported: isVoiceSupported, interimText, toggleListening } = useVoiceInput({
    onTranscript: (transcript) => {
      setInput((prev) => {
        const newInput = prev ? `${prev} ${transcript}` : transcript;
        return newInput;
      });
    },
  });

  const itemLabel = currentCollectionType ? getItemLabel(currentCollectionType, true) : "items";

  // Load collection insights
  const loadInsights = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("collection_insights")
      .select("insights")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data?.insights) {
      setCollectionInsights(data.insights);
    }
  }, [user]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  // Refresh insights when watches change
  const refreshInsights = useCallback(async () => {
    if (!user || isRefreshingInsights) return;
    
    setIsRefreshingInsights(true);
    try {
      const { data: watches, error: watchesError } = await supabase
        .from("watches")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");
      
      if (watchesError) throw watchesError;
      
      if (!watches || watches.length < 3) {
        toast.info("Need at least 3 items in your collection for AI insights");
        setIsRefreshingInsights(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("analyze-collection", {
        body: { watches },
      });

      if (error) throw error;

      if (data?.insights) {
        await supabase
          .from("collection_insights")
          .upsert({
            user_id: user.id,
            insights: data.insights,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        setCollectionInsights(data.insights);
        toast.success("Collection insights updated!");
      }
    } catch (error) {
      console.error("Error refreshing insights:", error);
      toast.error("Failed to refresh insights");
    } finally {
      setIsRefreshingInsights(false);
    }
  }, [user, isRefreshingInsights]);

  // Subscribe to watch changes for auto-refresh
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("watches-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "watches",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const timeoutId = setTimeout(() => {
            refreshInsights();
          }, 2000);
          return () => clearTimeout(timeoutId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshInsights]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
    setShowHistory(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleEditTitle = (conversationId: string, currentTitle: string) => {
    setEditingTitle(conversationId);
    setNewTitle(currentTitle);
  };

  const handleSaveTitle = async () => {
    if (editingTitle && newTitle.trim()) {
      await updateConversationTitle(editingTitle, newTitle.trim());
      setEditingTitle(null);
      setNewTitle("");
    }
  };

  const singularItemLabel = currentCollectionType ? getItemLabel(currentCollectionType, false) : "item";

  const suggestedQuestions = [
    `What's my most worn ${singularItemLabel}?`,
    "What patterns do you see in my collection?",
    "What should I add next?",
    "Tell me about my collecting style",
    `Which ${itemLabel} have I not worn recently?`,
  ];

  // On mobile: use dvh for proper viewport height minus bottom nav (~4.5rem) and top header (~3.5rem)
  // On desktop: standard calc
  return (
    <div className={`flex ${isMobile ? 'h-[calc(100dvh-4rem)] pb-safe' : 'h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]'}`}>
      {/* Conversation History Sidebar - Desktop */}
      {!isMobile && (
        <div className="w-64 shrink-0 border-r border-borderSubtle bg-surfaceMuted flex flex-col">
          <div className="p-3 border-b border-borderSubtle space-y-2">
            <Button
              onClick={startNewChat}
              className="w-full gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-textMuted" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => searchConversations(e.target.value)}
                className="pl-8 pr-8 h-8 text-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => searchConversations("")}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {isLoadingConversations || isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-textMuted" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-xs text-textMuted text-center py-8 px-4">
                  {searchQuery ? "No matching conversations found" : "No conversations yet. Start chatting!"}
                </p>
              ) : (
                conversations.map((conv) => (
                  <SwipeableConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === currentConversationId}
                    onSelect={() => loadConversation(conv.id)}
                    onDelete={() => {
                      console.log("[VaultPal] request delete conversation", conv.id);
                      setDeleteConfirmId(conv.id);
                    }}
                    onEdit={() => handleEditTitle(conv.id, conv.title)}
                    searchQuery={searchQuery}
                    isMobile={isMobile}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - Compact on mobile */}
        <div className={`shrink-0 border-b border-borderSubtle bg-surface ${isMobile ? 'px-3 py-2' : 'px-4 py-4'}`}>
          <div className={`flex items-center justify-between gap-2 ${isMobile ? '' : 'mb-4'}`}>
            <div className="flex items-center gap-2 min-w-0">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHistory(!showHistory)}
                  className="shrink-0 h-9 w-9"
                  aria-label="Chat history"
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              )}
              <div className={`shrink-0 ${isMobile ? 'p-1.5' : 'p-2.5'} rounded-xl bg-accent/10`}>
                <Bot className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-accent`} />
              </div>
              <div className="min-w-0">
                <h1 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-textMain truncate`}>My Vault Assistant</h1>
                {!isMobile && <p className="text-xs text-textMuted">Your personal collection expert</p>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startNewChat}
                  className="h-9 w-9"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
              <CollectionSwitcher />
              {!isMobile && currentConversationId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startNewChat}
                  className="text-textMuted"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              )}
            </div>
          </div>

          {/* Collection Insights Header - Collapsed by default on mobile */}
          {collectionInsights && !isMobile && (
            <Card className="bg-accentSubtle/30 border-accent/20 mt-3">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div 
                      className={`text-sm text-textMuted leading-relaxed ${
                        insightsExpanded ? "" : "line-clamp-2"
                      }`}
                    >
                      {collectionInsights}
                    </div>
                    {collectionInsights.length > 150 && (
                      <button
                        onClick={() => setInsightsExpanded(!insightsExpanded)}
                        className="flex items-center gap-1 mt-2 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
                      >
                        {insightsExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Show more
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-accent hover:text-accent/80"
                    onClick={refreshInsights}
                    disabled={isRefreshingInsights}
                    aria-label="Refresh insights"
                  >
                    {isRefreshingInsights ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mobile History Overlay - Full screen with proper positioning */}
        {isMobile && showHistory && (
          <div className="absolute inset-0 z-50 bg-background flex flex-col">
            <div className="p-3 border-b border-borderSubtle space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Chat History</h3>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowHistory(false)}>
                  <X className="w-4 h-4 mr-1" />
                  Close
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-textMuted" />
                <Input
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => searchConversations(e.target.value)}
                  className="pl-8 pr-8 h-9 text-sm"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => searchConversations("")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1 pb-20">
                <Button
                  onClick={() => {
                    startNewChat();
                    searchConversations("");
                    setShowHistory(false);
                  }}
                  className="w-full gap-2 mb-2"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </Button>
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-textMuted" />
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="text-xs text-textMuted text-center py-4">
                    {searchQuery ? "No matching conversations" : "No conversations yet"}
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <SwipeableConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === currentConversationId}
                      onSelect={() => {
                        loadConversation(conv.id);
                        setShowHistory(false);
                      }}
                      onDelete={() => {
                        console.log("[VaultPal] request delete conversation (mobile)", conv.id);
                        setDeleteConfirmId(conv.id);
                      }}
                      onEdit={() => handleEditTitle(conv.id, conv.title)}
                      searchQuery={searchQuery}
                      isMobile={true}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Chat Messages Area */}
        <ScrollArea className={`flex-1 ${isMobile ? 'px-3' : 'px-4'}`} ref={scrollRef}>
          <div className={`${isMobile ? 'py-3 space-y-3' : 'py-4 space-y-4'} max-w-3xl mx-auto`}>
            {messages.length === 0 ? (
              <div className={`flex flex-col items-center justify-center ${isMobile ? 'py-6' : 'py-12'} text-center`}>
                <div className={`${isMobile ? 'p-3' : 'p-4'} rounded-2xl bg-accent/10 mb-3`}>
                  <Bot className={`${isMobile ? 'w-7 h-7' : 'w-10 h-10'} text-accent`} />
                </div>
                <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-textMain mb-1.5`}>
                  Welcome to My Vault Assistant
                </h2>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-textMuted mb-4 max-w-md px-2`}>
                  I know everything about your {itemLabel.toLowerCase()}, 
                  wear patterns, and preferences. Ask me anything!
                </p>

                {/* Mobile insights pill if available */}
                {isMobile && collectionInsights && (
                  <button
                    onClick={() => setInsightsExpanded(!insightsExpanded)}
                    className="w-full mb-4 px-3 py-2 rounded-xl bg-accentSubtle/30 border border-accent/20 text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3 h-3 text-accent shrink-0" />
                      <span className="text-xs font-medium text-accent">Collection Insights</span>
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-accent"
                          onClick={(e) => { e.stopPropagation(); refreshInsights(); }}
                          disabled={isRefreshingInsights}
                        >
                          {isRefreshingInsights ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </Button>
                        {insightsExpanded ? <ChevronUp className="w-3 h-3 text-accent" /> : <ChevronDown className="w-3 h-3 text-accent" />}
                      </div>
                    </div>
                    <p className={`text-xs text-textMuted leading-relaxed ${insightsExpanded ? '' : 'line-clamp-2'}`}>
                      {collectionInsights}
                    </p>
                  </button>
                )}

                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 w-full px-2 snap-x snap-mandatory touch-pan-y">
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(question)}
                      className={`${isMobile ? 'text-[11px] py-2 px-3.5' : 'text-xs py-2.5 px-5'} whitespace-nowrap shrink-0 snap-start rounded-full bg-accent/10 text-accent font-medium border border-accent/20 hover:bg-accent/20 active:scale-95 transition-all`}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, idx) => (
                <MessageBubble key={idx} message={message} isMobile={isMobile} />
              ))
            )}
            
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-lg bg-accent/10 shrink-0">
                  <Bot className="w-3.5 h-3.5 text-accent" />
                </div>
                <div className="flex items-center gap-2 text-textMuted">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-xs">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className={`shrink-0 border-t border-borderSubtle bg-surface ${isMobile ? 'px-3 py-2' : 'px-4 py-3'}`}>
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            {/* Voice input indicator */}
            {isListening && (
              <div className="flex items-center justify-center gap-2 mb-2 py-1.5 px-3 bg-accent/10 rounded-lg">
                <div className="flex gap-1">
                  <span className="w-1 h-3 bg-accent rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 h-3 bg-accent rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 h-3 bg-accent rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-accent font-medium">
                  {interimText || "Listening..."}
                </span>
              </div>
            )}
            <div className="flex gap-1.5">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const ta = e.target;
                  ta.style.height = 'auto';
                  ta.style.height = Math.min(ta.scrollHeight, isMobile ? 80 : 120) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Speak now..." : `Ask about your ${itemLabel.toLowerCase()}...`}
                className={`${isMobile ? 'min-h-[40px] max-h-[80px] text-sm' : 'min-h-[44px] max-h-[120px]'} resize-none overflow-hidden`}
                rows={1}
                disabled={isLoading}
                style={{ height: isMobile ? '40px' : '44px' }}
              />
              {isVoiceSupported && (
                <Button
                  type="button"
                  variant={isListening ? "default" : "outline"}
                  size="icon"
                  className={`shrink-0 ${isMobile ? 'h-10 w-10' : 'h-[44px] w-[44px]'} transition-colors ${
                    isListening ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""
                  }`}
                  onClick={toggleListening}
                  disabled={isLoading}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
              )}
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                size="icon"
                className={`shrink-0 ${isMobile ? 'h-10 w-10' : 'h-[44px] w-[44px]'}`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            {!isMobile && (
              <p className="text-xs text-textMuted mt-2 text-center">
                {isVoiceSupported 
                  ? "Press Enter to send, Shift+Enter for new line, or tap mic for voice" 
                  : "Press Enter to send, Shift+Enter for new line"}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Edit Title Dialog */}
      <Dialog open={!!editingTitle} onOpenChange={(open) => { if (!open) setEditingTitle(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter new title..."
            onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingTitle(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTitle}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteConfirmId) {
                  await deleteConversation(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};


const MessageBubble = ({ message, isMobile = false }: { message: ChatMessage; isMobile?: boolean }) => {
  const isUser = message.role === "user";
  const [isExpanded, setIsExpanded] = useState(false);
  
  const lines = message.content.split("\n");
  const isLongMessage = message.content.length > 300 || lines.length > 4;
  
  const displayContent = isExpanded || !isLongMessage 
    ? message.content 
    : message.content.slice(0, 250) + "...";

  return (
    <div className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-lg shrink-0 ${isUser ? "bg-primary/10" : "bg-accent/10"}`}>
        {isUser ? (
          <User className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-primary`} />
        ) : (
          <Bot className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-accent`} />
        )}
      </div>
      <div
        className={`flex-1 rounded-xl ${isMobile ? 'px-3 py-2' : 'px-4 py-3'} ${
          isUser
            ? `bg-primary text-primary-foreground ${isMobile ? 'ml-6' : 'ml-12'}`
            : `bg-muted text-textMain ${isMobile ? 'mr-6' : 'mr-12'}`
        }`}
      >
        <div className={`${isMobile ? 'text-[13px]' : 'text-sm'} whitespace-pre-wrap break-words leading-relaxed`}>
          {displayContent.split("\n").map((line, i) => (
            <p key={i} className={i > 0 ? "mt-1.5" : ""}>
              {line}
            </p>
          ))}
        </div>
        {isLongMessage && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1 mt-1.5 text-xs font-medium transition-colors ${
              isUser 
                ? "text-primary-foreground/80 hover:text-primary-foreground" 
                : "text-accent hover:text-accent/80"
            }`}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                More
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default VaultPal;
