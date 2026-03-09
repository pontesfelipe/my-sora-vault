import { Plus, Check, Crown, Edit3, Eye, Watch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { useCollection } from "@/contexts/CollectionContext";
import { useCollectionData } from "@/hooks/useCollectionData";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CreateCollectionTypeDialog } from "./CreateCollectionTypeDialog";
import { useIsMobile } from "@/hooks/use-mobile";

export const CollectionSwitcher = () => {
  const { t } = useTranslation();
  const { selectedCollectionId, setSelectedCollectionId, currentCollection } = useCollection();
  const { collections, refetch } = useCollectionData();
  const { isAdmin } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="w-3 h-3" />;
      case "editor":
        return <Edit3 className="w-3 h-3" />;
      case "viewer":
        return <Eye className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return t("collectionPage.roleOwner");
      case "editor":
        return t("collectionPage.roleEditor");
      case "viewer":
      default:
        return t("collectionPage.roleViewer");
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    switch (role) {
      case "owner":
        return "default";
      case "editor":
        return "secondary";
      case "viewer":
        return "outline";
      default:
        return "outline";
    }
  };

  const ownedCollections = collections.filter((c) => c.role === "owner");
  const canCreateCollection = isAdmin || ownedCollections.length === 0;
  const currentRole = currentCollection?.role || "viewer";

  const triggerButton = (
    <Button variant="outline" className="gap-1.5 max-w-[200px] overflow-hidden">
      <Watch className="w-4 h-4 shrink-0" />
      <span className="truncate">{currentCollection?.name || t("collectionSwitcher.selectCollection")}</span>
      {currentCollection && (
        <Badge variant={getRoleBadgeVariant(currentRole)} className="gap-1 shrink-0">
          {getRoleIcon(currentRole)}
          {getRoleLabel(currentRole)}
        </Badge>
      )}
    </Button>
  );

  const collectionItems = (onSelect: (id: string) => void) => (
    <>
      {collections.map((collection) => {
        const role = collection.role || "viewer";
        const ownerLabel = collection.ownerName || collection.ownerEmail;

        return (
          <button
            key={collection.id}
            onClick={() => onSelect(collection.id)}
            className="flex items-center justify-between w-full px-4 py-3 hover:bg-surfaceMuted transition-colors text-left"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {collection.id === selectedCollectionId && <Check className="w-4 h-4 flex-shrink-0 text-accent" />}
              <Watch className="w-4 h-4 flex-shrink-0 text-textMuted" />
              <div className="flex flex-col min-w-0">
                <span className="truncate text-sm text-textMain">{collection.name}</span>
                {isAdmin && ownerLabel && (
                  <span className="text-xs text-textMuted truncate">{t("collectionSwitcher.byOwner", { owner: ownerLabel })}</span>
                )}
              </div>
            </div>
            <Badge variant={getRoleBadgeVariant(role)} className="gap-1 flex-shrink-0 ml-2">
              {getRoleIcon(role)}
              {getRoleLabel(role)}
            </Badge>
          </button>
        );
      })}

      {canCreateCollection && (
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 w-full px-4 py-3 hover:bg-surfaceMuted transition-colors text-left text-sm text-textMain border-t border-borderSubtle"
        >
          <Plus className="w-4 h-4" />
          {t("collectionSwitcher.createNewCollection")}
        </button>
      )}

      {!canCreateCollection && (
        <div className="px-4 py-3 text-xs text-textMuted border-t border-borderSubtle">
          {t("collectionSwitcher.singleCollectionLimit")}
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t("collectionSwitcher.myCollections")}</DrawerTitle>
            </DrawerHeader>
            <div className="max-h-[60vh] overflow-y-auto pb-safe">
              {collectionItems((id) => {
                setSelectedCollectionId(id);
                setDrawerOpen(false);
              })}
            </div>
          </DrawerContent>
        </Drawer>

        {showCreateDialog && (
          <CreateCollectionTypeDialog
            onSuccess={() => {
              setShowCreateDialog(false);
              refetch();
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>{t("collectionSwitcher.myCollections")}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {collections.map((collection) => {
            const role = collection.role || "viewer";
            const ownerLabel = collection.ownerName || collection.ownerEmail;

            return (
              <DropdownMenuItem
                key={collection.id}
                onClick={() => setSelectedCollectionId(collection.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {collection.id === selectedCollectionId && <Check className="w-4 h-4 flex-shrink-0" />}
                  <Watch className="w-4 h-4 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{collection.name}</span>
                    {isAdmin && ownerLabel && (
                      <span className="text-xs text-muted-foreground truncate">
                        {t("collectionSwitcher.byOwner", { owner: ownerLabel })}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant={getRoleBadgeVariant(role)} className="gap-1 flex-shrink-0 ml-2">
                  {getRoleIcon(role)}
                  {getRoleLabel(role)}
                </Badge>
              </DropdownMenuItem>
            );
          })}

          {canCreateCollection && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowCreateDialog(true)} className="cursor-pointer">
                <Plus className="w-4 h-4 mr-2" />
                {t("collectionSwitcher.createNewCollection")}
              </DropdownMenuItem>
            </>
          )}

          {!canCreateCollection && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-muted-foreground">{t("collectionSwitcher.singleCollectionLimit")}</div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showCreateDialog && (
        <CreateCollectionTypeDialog
          onSuccess={() => {
            setShowCreateDialog(false);
            refetch();
          }}
        />
      )}
    </>
  );
};
