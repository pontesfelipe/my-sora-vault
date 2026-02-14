import { formatDistanceToNow } from "date-fns";
import { Sparkles, X, UserPlus, Watch, Eye } from "lucide-react";
import { TradeMatchNotification } from "@/hooks/useMessaging";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TradeDisclaimerDialog, useTradeDisclaimer } from "@/components/TradeDisclaimerDialog";

interface TradeNotificationsListProps {
  notifications: TradeMatchNotification[];
  onDismiss: (notificationId: string) => Promise<void>;
  onSendFriendRequestById: (userId: string, message: string) => Promise<{ success?: boolean; error?: string }>;
}

export function TradeNotificationsList({ 
  notifications, 
  onDismiss, 
  onSendFriendRequestById 
}: TradeNotificationsListProps) {
  const { needsAcknowledgment, checkAndShow, acknowledge } = useTradeDisclaimer();
  let pendingNotification: TradeMatchNotification | null = null;

  const executeConnect = async (notification: TradeMatchNotification) => {
    const message = `Hi! I noticed you have a ${notification.watch_brand} ${notification.watch_model} that's open to trade. I have this on my wishlist and would love to discuss a potential exchange!`;
    await onSendFriendRequestById(notification.trade_owner_id, message);
    await onDismiss(notification.id);
  };

  const handleConnect = async (notification: TradeMatchNotification) => {
    if (checkAndShow()) {
      pendingNotification = notification;
      return;
    }
    await executeConnect(notification);
  };

  const handleAcknowledge = async () => {
    acknowledge();
    if (pendingNotification) {
      await executeConnect(pendingNotification);
      pendingNotification = null;
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      <TradeDisclaimerDialog open={needsAcknowledgment} onAcknowledge={handleAcknowledge} />
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Trade Matches</h3>
        </div>
        {notifications.map((notification) => (
          <Card key={notification.id} className="p-4 border-primary/30 bg-primary/5">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Watch className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {notification.watch_brand} {notification.watch_model}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {notification.watch_dial_color && (
                        <Badge variant="outline" className="text-xs">
                          {notification.watch_dial_color}
                        </Badge>
                      )}
                      {notification.watch_type && (
                        <Badge variant="outline" className="text-xs">
                          {notification.watch_type}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        Open to Trade
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => onDismiss(notification.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md">
                  <Eye className="h-4 w-4 text-primary" />
                  <span className="text-xs">
                    Owner details will be revealed after they accept your request
                  </span>
                </div>
                <p className="text-xs">
                  Found {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>

              <Button
                size="sm"
                className="w-full"
                onClick={() => handleConnect(notification)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Connect to Discuss Trade
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
