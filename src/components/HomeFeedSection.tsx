import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useHomeFeed, FeedFilter } from "@/hooks/useHomeFeed";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { TrustLevelBadge } from "@/components/TrustLevelBadge";
import { FeedItemSkeleton } from "@/components/FeedItemSkeleton";
import { formatDistanceToNow } from "date-fns";
import type { TrustLevel } from "@/hooks/useTrustLevel";

const FILTER_OPTIONS: FeedFilter[] = ["friends", "trending", "news", "articles", "videos"];

export function HomeFeedSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, loading, filter, setFilter, loadMore, hasMore } = useHomeFeed();

  const handleTap = (item: (typeof items)[0]) => {
    if (item.external_url) {
      window.open(item.external_url, "_blank", "noopener");
    } else {
      // Navigate to feed page for post details
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
      <h2 className="text-sm font-semibold uppercase tracking-wider text-textMuted mb-3">
        {t("home.socialFeed")}
      </h2>

      {/* Filter chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-accent text-white"
                : "bg-surfaceMuted text-textMuted hover:text-textMain"
            }`}
          >
            {t(`home.filter_${f}`)}
          </button>
        ))}
      </div>

      {/* Feed cards */}
      <div className="space-y-3">
        {loading ? (
          <>
            <FeedItemSkeleton />
            <FeedItemSkeleton />
          </>
        ) : items.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-textMuted">{t("home.noFeedItems")}</p>
          </Card>
        ) : (
          items.map((item) => (
            <Card
              key={item.feed_id}
              className="p-4 cursor-pointer active:scale-[0.99] transition-transform"
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
                   {item.watch_authenticated && (
                     <div className="flex items-center gap-1 mb-2">
                       <ShieldCheck className="h-3 w-3 text-accent" />
                       <span className="text-[10px] font-medium text-accent">
                         {t("home.authenticated")}
                       </span>
                     </div>
                   )}
                   {item.image_url && (
                    <div className="rounded-xl overflow-hidden mb-2 max-h-40">
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
                      <ExternalLink className="h-3.5 w-3.5 ml-auto" />
                    )}
                    <span className="text-[10px] ml-auto">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Load more */}
      {hasMore && !loading && (
        <Button
          variant="outline"
          className="w-full mt-3"
          onClick={(e) => {
            e.stopPropagation();
            loadMore();
          }}
        >
          {t("home.loadMore")}
        </Button>
      )}
    </section>
  );
}
