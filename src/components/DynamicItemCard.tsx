import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { MoreVertical, DollarSign, TrendingUp, Edit2, Trash2, ArrowUpDown, Watch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/utils/format";
import { useIsMobile } from "@/hooks/use-mobile";
import watchHero from "@/assets/watch-hero.jpg";

interface DynamicItemCardProps {
  item: any;
  collectionType?: string;
  totalWearDays?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onMarkAsSold?: () => void;
  onMarkAsTraded?: () => void;
  isDraggable?: boolean;
}

export const DynamicItemCard = ({
  item,
  totalWearDays = 0,
  onEdit,
  onDelete,
  onMarkAsSold,
  onMarkAsTraded,
  isDraggable = false,
}: DynamicItemCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, [role="menu"]')) return;
    navigate(`/watch/${item.id}`);
  };

  const cost = item.cost || 0;
  const resalePrice = item.average_resale_price;
  const appreciation = resalePrice ? ((resalePrice - cost) / cost * 100).toFixed(0) : null;

  const imageUrl = item.ai_image_url || watchHero;

  const menuActions = [
    { label: t("common.edit"), icon: Edit2, onClick: onEdit },
    { label: t("common.markAsSold"), icon: DollarSign, onClick: onMarkAsSold, separator: true },
    { label: t("common.markAsTraded"), icon: ArrowUpDown, onClick: onMarkAsTraded },
    { label: t("common.delete"), icon: Trash2, onClick: onDelete, destructive: true, separator: true },
  ];

  const menuButton = (
    <Button variant="secondary" size="icon" className="h-8 w-8 backdrop-blur-sm bg-background/80 shadow-md" aria-label="Item actions">
      <MoreVertical className="h-4 w-4" />
    </Button>
  );

  return (
    <Card 
      className="group hover:shadow-luxury transition-all duration-300 cursor-pointer overflow-hidden border-0 shadow-card"
      onClick={handleCardClick}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img 
          src={imageUrl} 
          alt={`${item.brand} ${item.model}`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
              <Watch className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-foreground truncate drop-shadow-sm">{item.brand}</h3>
              <p className="text-xs text-foreground/80 truncate drop-shadow-sm">{item.model}</p>
            </div>
          </div>
        </div>
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isMobile ? (
            <>
              <div onClick={(e) => { e.stopPropagation(); setDrawerOpen(true); }}>
                {menuButton}
              </div>
              <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerContent onClick={(e) => e.stopPropagation()}>
                  <DrawerHeader>
                    <DrawerTitle>{item.brand} {item.model}</DrawerTitle>
                  </DrawerHeader>
                  <div className="pb-safe">
                    {menuActions.map((action, i) => (
                      <div key={action.label}>
                        {action.separator && i > 0 && <div className="h-px bg-borderSubtle mx-4" />}
                        <button
                          onClick={() => { setDrawerOpen(false); action.onClick?.(); }}
                          className={`flex items-center gap-3 w-full px-4 py-3 text-left text-sm transition-colors hover:bg-surfaceMuted ${
                            action.destructive ? "text-destructive" : "text-textMain"
                          }`}
                        >
                          <action.icon className="w-4 h-4" />
                          {action.label}
                        </button>
                      </div>
                    ))}
                  </div>
                </DrawerContent>
              </Drawer>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>{menuButton}</DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  {t("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onMarkAsSold}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  {t("common.markAsSold")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onMarkAsTraded}>
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  {t("common.markAsTraded")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {item.available_for_trade && (
          <div className="absolute top-2 left-2">
            <Badge className="text-xs bg-accent/90 text-accent-foreground backdrop-blur-sm">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              {t("common.trade")}
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("common.dialColor")}:</span>
          <Badge variant="outline" className="text-xs font-medium">
            {item.dial_color}
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          {item.movement && (
            <Badge variant="outline" className="text-xs">
              {item.movement}
            </Badge>
          )}
          {item.case_size && (
            <Badge variant="secondary" className="text-xs">
              {item.case_size}
            </Badge>
          )}
          {item.rarity && item.rarity !== 'common' && (
            <Badge className="text-xs bg-accent/10 text-accent border-accent/30">
              {item.rarity.replace('_', ' ')}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold">{formatCurrency(cost)}</span>
          </div>
          
          {appreciation && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${parseFloat(appreciation) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{appreciation}%</span>
            </div>
          )}
          
          {totalWearDays > 0 && (
            <Badge variant="secondary" className="text-xs font-medium">
              {totalWearDays} day{totalWearDays !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
