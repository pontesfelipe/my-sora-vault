import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useMentionNotifications } from "@/hooks/useMentions";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function MentionNotificationsDropdown() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useMentionNotifications();

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);
    navigate(`/forum?post=${notification.post_id}&comment=${notification.comment_id}`);
    setDrawerOpen(false);
  };

  const triggerButton = (
    <Button variant="ghost" size="icon" className="relative" aria-label="Mention notifications">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          variant="destructive"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      )}
    </Button>
  );

  const header = (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border">
      <span className="font-medium text-sm">Mentions</span>
      {unreadCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={(e) => {
            e.preventDefault();
            markAllAsRead();
          }}
        >
          <CheckCheck className="h-3 w-3 mr-1" />
          Mark all read
        </Button>
      )}
    </div>
  );

  const content = loading ? (
    <div className="p-4 text-center text-sm text-textMuted">Loading...</div>
  ) : notifications.length === 0 ? (
    <div className="p-4 text-center text-sm text-textMuted">No mentions yet</div>
  ) : (
    <div className="max-h-80 overflow-y-auto">
      {notifications.map((notification) => {
        const mentioner = notification.mentioned_by;
        const name = mentioner?.username || "Someone";
        const initials = name.slice(0, 2).toUpperCase();

        return (
          <button
            key={notification.id}
            className={cn(
              "flex items-start gap-2 p-3 cursor-pointer w-full text-left hover:bg-surfaceMuted transition-colors",
              !notification.is_read && "bg-accent/10"
            )}
            onClick={() => handleNotificationClick(notification)}
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={mentioner?.avatar_url || undefined} />
              <AvatarFallback className="bg-surfaceMuted text-textMuted text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{name}</span>
                <span className="text-textMuted"> mentioned you in </span>
                <span className="font-medium truncate">
                  {notification.post_title || "a post"}
                </span>
              </p>
              <p className="text-xs text-textMuted mt-0.5">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </p>
            </div>
            {!notification.is_read && (
              <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2" />
            )}
          </button>
        );
      })}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Mentions</DrawerTitle>
          </DrawerHeader>
          {unreadCount > 0 && (
            <div className="flex justify-end px-4 pb-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllAsRead()}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            </div>
          )}
          <div className="max-h-[60vh] overflow-y-auto pb-safe">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {header}
        {content}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
