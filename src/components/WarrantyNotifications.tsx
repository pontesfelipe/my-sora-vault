import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWatchData } from "@/hooks/useWatchData";
import { useCollection } from "@/contexts/CollectionContext";
import { differenceInDays, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { getCollectionConfig, CollectionType } from "@/types/collection";

export const WarrantyNotifications = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { selectedCollectionId, currentCollectionType, currentCollectionConfig } = useCollection();
  const { watches } = useWatchData(selectedCollectionId);
  const config = currentCollectionConfig;

  // Only show warranty notifications for collection types that support warranties
  if (!config.supportsWarranty) {
    return null;
  }

  // Filter items with warranty expiring within 30 days
  const expiringItems = watches.filter(item => {
    if (!item.warranty_date) return false;
    
    const warrantyDate = new Date(item.warranty_date);
    const today = new Date();
    const daysUntilExpiry = differenceInDays(warrantyDate, today);
    
    // Show items expiring within 30 days (but not already expired)
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  }).map(item => ({
    ...item,
    warrantyDate: new Date(item.warranty_date!),
    daysRemaining: differenceInDays(new Date(item.warranty_date!), new Date())
  })).sort((a, b) => a.daysRemaining - b.daysRemaining);

  const notificationCount = expiringItems.length;

  const handleViewInsights = () => {
    setOpen(false);
    navigate("/personal-notes");
  };

  if (notificationCount === 0) {
    return null;
  }

  const singularLabel = t("collectionConfig.singularLabel").toLowerCase();
  const pluralLabel = t("collectionConfig.pluralLabel").toLowerCase();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`${notificationCount} warranty ${notificationCount === 1 ? 'notification' : 'notifications'}`}
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-borderSubtle p-4">
          <h3 className="font-semibold text-textMain">Warranty Expiring Soon</h3>
          <p className="text-xs text-textMuted mt-1">
            {notificationCount} {notificationCount === 1 ? singularLabel : pluralLabel} with warranty expiring within 30 days
          </p>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {expiringItems.map((item) => (
            <div
              key={item.id}
              className="border-b border-borderSubtle p-4 hover:bg-surfaceMuted transition-colors cursor-pointer"
              onClick={handleViewInsights}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-textMain truncate">
                    {item.brand} {item.model}
                  </p>
                  <p className="text-xs text-textMuted mt-1">
                    Expires: {format(item.warrantyDate, 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-xs font-semibold ${
                    item.daysRemaining <= 7 ? 'text-danger' : 
                    item.daysRemaining <= 14 ? 'text-yellow-600' : 
                    'text-yellow-500'
                  }`}>
                    {item.daysRemaining} days
                  </span>
                  <div className={`mt-1 w-2 h-2 rounded-full ${
                    item.daysRemaining <= 7 ? 'bg-danger' : 
                    item.daysRemaining <= 14 ? 'bg-yellow-600' : 
                    'bg-yellow-500'
                  }`} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-borderSubtle p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs"
            onClick={handleViewInsights}
          >
            View All in Collection Insights
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
