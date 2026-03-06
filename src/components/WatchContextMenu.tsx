import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Clock, Pencil, ArrowLeftRight, Trash2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { triggerHaptic } from "@/utils/haptics";
import { useTranslation } from "react-i18next";

interface WatchContextMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watch: {
    id: string;
    brand: string;
    model: string;
    available_for_trade?: boolean;
  };
  onLogWear?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function WatchContextMenu({
  open,
  onOpenChange,
  watch,
  onLogWear,
  onEdit,
  onDelete,
}: WatchContextMenuProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const actions = [
    {
      label: t("common.viewDetails"),
      icon: Eye,
      onClick: () => {
        onOpenChange(false);
        navigate(`/watch/${watch.id}`);
      },
    },
    {
      label: t("log.logWristCheck"),
      icon: Clock,
      onClick: () => {
        onOpenChange(false);
        onLogWear?.();
      },
    },
    {
      label: t("common.edit"),
      icon: Pencil,
      onClick: () => {
        onOpenChange(false);
        onEdit?.();
      },
    },
    {
      label: t("common.delete"),
      icon: Trash2,
      variant: "destructive" as const,
      onClick: () => {
        onOpenChange(false);
        onDelete?.();
      },
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-8">
        <DrawerHeader className="text-center pb-2">
          <DrawerTitle className="text-base">
            {watch.brand} {watch.model}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-1">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant === "destructive" ? "destructive" : "ghost"}
              className="w-full justify-start gap-3 h-12 text-sm font-medium"
              onClick={action.onClick}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** Hook for detecting long-press gestures */
export function useLongPress(onLongPress: () => void, delay = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const start = useCallback(() => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      triggerHaptic("heavy");
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlers = {
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchCancel: stop,
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
  };

  return { handlers, isLongPress: isLongPressRef };
}
