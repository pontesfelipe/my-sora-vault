import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, DollarSign, TrendingUp, Edit2, Trash2, ArrowUpDown, Watch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/utils/format";
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

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, [role="menu"]')) return;
    navigate(`/watch/${item.id}`);
  };

  const cost = item.cost || 0;
  const resalePrice = item.average_resale_price;
  const appreciation = resalePrice ? ((resalePrice - cost) / cost * 100).toFixed(0) : null;

  const imageUrl = item.ai_image_url || watchHero;

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8 backdrop-blur-sm bg-background/80 shadow-md">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onMarkAsSold}>
                <DollarSign className="w-4 h-4 mr-2" />
                Mark as Sold
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMarkAsTraded}>
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Mark as Traded
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {item.available_for_trade && (
          <div className="absolute top-2 left-2">
            <Badge className="text-xs bg-accent/90 text-accent-foreground backdrop-blur-sm">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              Trade
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Dial Color:</span>
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
