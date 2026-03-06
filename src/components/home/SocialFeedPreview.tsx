import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, ExternalLink, ChevronRight, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useHomeFeed, FeedFilter } from "@/hooks/useHomeFeed";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/UserAvatar";
import { TrustLevelBadge } from "@/components/TrustLevelBadge";
import { FeedItemSkeleton } from "@/components/FeedItemSkeleton";
import { formatDistanceToNow } from "date-fns";
import type { TrustLevel } from "@/hooks/useTrustLevel";

const FILTER_OPTIONS: FeedFilter[] = ["friends", "trending", "news", "articles", "videos"];
const MAX_PREVIEW_ITEMS = 5;

export function SocialFeedPreview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, loading, filter, setFilter } = useHomeFeed();

  const previewItems = items.slice(0, MAX_PREVIEW_ITEMS);

  const handleTap = (item: (typeof items)[0]) => {
    if (item.external_url) {
      window.open(item.external_url, "_blank", "noopener");
    } else {
      navigate("/feed");
    }
  };

  const getBadgeLabel = (feedType: string) => {
    switch (feedType) {
      case "friends": return t("home.friendLabel");
      case "trending": return t("home.trendingLabel");
      case "news": return t("home.newsLabel");
      case "article": case "articles": return t("home.articleLabel");
      case "video": case "videos": return t("home.videoLabel");
      default: return feedType;
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-textMuted">
          {t("home.whatsHappening")}
        </h2>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-accent text-accent-foreground"
                : "bg-surfaceMuted text-textMuted hover:text-textMain"
            }`}
          >
            {t(`home.filter_${f}`)}
          </button>
        ))}
      </div>

      {/* Feed cards */}
      <div className="space-y-0">
        {loading ? (
          <div className="space-y-3">
            <FeedItemSkeleton />
            <FeedItemSkeleton />
          </div>
        ) : previewItems.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-textMuted">{t("home.nothingHereYet")}</p>
          </Card>
        ) : (
          previewItems.map((item, idx) => (
            <div key={item.feed_id}>
              <div
                className="py-3 cursor-pointer active:bg-surfaceMuted/50 transition-colors rounded-lg px-1"
                onClick={() => handleTap(item)}
              >
                <div className="flex items-start gap-3">
                  <UserAvatar
                    username={item.author_username}
                    avatarUrl={item.author_avatar_url}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-textMain truncate">
                        {item.author_username || t("home.anonymous")}
                      </span>
                      {/* Trust Level Badge */}
                      {item.author_trust_level && item.author_trust_level !== "observer" && (
                        <TrustLevelBadge
                          level={item.author_trust_level as TrustLevel}
                          size="sm"
                        />
                      )}
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {getBadgeLabel(item.feed_type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-textSoft line-clamp-2 mb-2">
                      {item.content || item.title}
                    </p>
                    {/* Authenticated watch badge */}
                    {item.watch_authenticated && (
                      <div className="flex items-center gap-1 mb-2">
                        <ShieldCheck className="h-3 w-3 text-accent" />
                        <span className="text-[10px] font-medium text-accent">
                          {t("home.authenticated")}
                        </span>
                      </div>
                    )}
                    {item.image_url && (
                      <div className="rounded-xl overflow-hidden mb-2 max-h-32">
                        <img
                          src={item.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-textMuted">
                      <span className="flex items-center gap-1 text-xs">
                        <Heart className="h-3.5 w-3.5" />
                        {item.like_count}
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {item.comment_count}
                      </span>
                      {item.external_url && (
                        <ExternalLink className="h-3.5 w-3.5" />
                      )}
                      <span className="text-[10px] ml-auto">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {idx < previewItems.length - 1 && <Separator className="ml-12" />}
            </div>
          ))
        )}
      </div>

      {/* See all in Feed */}
      {previewItems.length > 0 && (
        <button
          onClick={() => navigate("/feed")}
          className="w-full flex items-center justify-center gap-1 py-3 mt-2 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
        >
          {t("home.seeAllInFeed")}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </section>
  );
}
