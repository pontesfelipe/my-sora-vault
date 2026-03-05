import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { Conversation } from "@/hooks/useMessaging";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { SwipeableConversationItem } from "./SwipeableConversationItem";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  onDelete?: (conversationId: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect, onDelete }: ConversationListProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-textMuted">
        <p className="text-sm">{t("feed.noConversationsYet")}</p>
        <p className="text-xs mt-1">{t("feed.addFriendToStart")}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-borderSubtle">
      {conversations.map((conversation) => (
        <SwipeableConversationItem
          key={conversation.id}
          conversation={conversation}
          isSelected={selectedId === conversation.id}
          onSelect={() => onSelect(conversation)}
          onDelete={onDelete ? () => onDelete(conversation.id) : undefined}
          isMobile={isMobile}
        />
      ))}
    </div>
  );
}
