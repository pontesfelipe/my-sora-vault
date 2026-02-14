import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import { Conversation } from "@/hooks/useMessaging";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ShareWatchDetailsDialog } from "./ShareWatchDetailsDialog";
import { TradeChatDisclaimer } from "@/components/TradeChatDisclaimer";

interface ChatWindowProps {
  conversation: Conversation | null;
  onSendMessage: (conversationId: string, content: string) => Promise<{ success?: boolean; error?: string }>;
  onMarkAsRead: (conversationId: string) => Promise<void>;
}

export function ChatWindow({ conversation, onSendMessage, onMarkAsRead }: ChatWindowProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, loading } = useConversationMessages(conversation?.id || null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (conversation) {
      onMarkAsRead(conversation.id);
    }
  }, [conversation, onMarkAsRead]);

  const handleSend = async () => {
    if (!conversation || !newMessage.trim()) return;

    setSending(true);
    const result = await onSendMessage(conversation.id, newMessage.trim());
    if (result.success) {
      setNewMessage("");
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-textMuted">
        <p>Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-borderSubtle bg-surfaceMuted">
        <h3 className="font-medium text-textMain">
          {conversation.other_user_name || conversation.other_user_email}
        </h3>
        <p className="text-xs text-textMuted">{conversation.other_user_email}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-textMuted">
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={cn(
                  "flex w-full",
                  isMine ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2.5",
                    isMine
                      ? "bg-primary text-primary-foreground"
                      : "bg-surfaceMuted text-textMain"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {message.content}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] mt-1.5 text-right",
                      isMine ? "text-primary-foreground/70" : "text-textMuted"
                    )}
                  >
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-borderSubtle">
        <div className="flex gap-2">
          <ShareWatchDetailsDialog 
            conversationId={conversation.id} 
            onSendMessage={onSendMessage} 
          />
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={!newMessage.trim() || sending} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Trade disclaimer */}
      <TradeChatDisclaimer />
    </div>
  );
}
