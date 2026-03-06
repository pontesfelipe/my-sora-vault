

## Home Page Redesign: Social Feed + Platform Analytics

### Overview
Redesign the Home page to add a **Social Feed module** and a **Most Worn This Week (platform-wide)** section while keeping the existing Your Week and Wrist Check features. The Feed page (currently at `/feed`) remains for full forum + messages; the Home page gets a lightweight social feed preview.

### Architecture

```text
Home Page Layout (top to bottom):
┌─────────────────────────┐
│ Greeting + Date         │
│ [Wrist Check] button    │
├─────────────────────────┤
│ YOUR WEEK (WearCalendar)│
├─────────────────────────┤
│ MOST WORN THIS WEEK     │
│ (platform + friends)    │
│ Horizontal scroll cards │
├─────────────────────────┤
│ SOCIAL FEED             │
│ Filter chips: Friends | │
│ Trending | News |       │
│ Articles | Videos       │
│ Vertical card list      │
│ [Load More] button      │
├─────────────────────────┤
│ [Sponsored slot]        │
└─────────────────────────┘
```

### Implementation Plan

#### 1. Database: Platform-wide "Most Worn This Week" query
- Create a new **backend function** (`get_platform_most_worn_this_week`) that aggregates `wear_entries` across all users (or friends) for the current week, returning top watches with brand/model/image/count. This avoids exposing other users' data via RLS -- a security-definer function returns only aggregated, anonymized results.
- Create a new **backend function** (`get_friends_most_worn_this_week`) that filters to the user's friends list only.

#### 2. Database: Social Feed content
- Create a new table **`editorial_content`** for platform editorial/news/articles/videos (admin-managed), with columns: `id`, `title`, `summary`, `url`, `image_url`, `content_type` (news/article/video), `published_at`, `created_by`, `created_at`. RLS: public SELECT for authenticated users, admin-only INSERT/UPDATE/DELETE.
- Create a new backend function **`get_home_feed`** that unions:
  - Friends' recent forum posts (from `user_posts` joined with `friendships`)
  - Comments on the current user's posts
  - Likes on the current user's posts
  - Trending posts (most liked/commented platform-wide, last 7 days)
  - Editorial content from `editorial_content`
  - Returns a unified feed with `feed_type` label (friends/trending/editorial)

#### 3. New hook: `useHomeFeed`
- Calls `get_home_feed` RPC with filter param (friends/trending/news/articles/videos/all)
- Pagination: fetch N items, "Load More" button
- React Query caching with 2min stale time

#### 4. New hook: `usePlatformMostWorn`
- Calls `get_platform_most_worn_this_week` and `get_friends_most_worn_this_week`
- Returns combined data with tabs/toggle for "Platform" vs "Friends"

#### 5. New component: `HomeFeedSection`
- Filter chips at top (Friends default, Trending, News, Articles, Videos)
- Compact vertical card list with: author avatar, text preview, optional image, like/comment counts
- Cards labeled with subtle chip: "Friend", "Trending", "Editorial"
- "Load More" button after initial 10 items (infinite scroll on mobile via intersection observer)
- Tap opens detail (navigates to post or external URL)

#### 6. New component: `MostWornThisWeekSection`
- Horizontal scrollable cards (similar to existing Most Worn but sourced from platform data)
- Toggle between "Platform" and "Friends" via chips
- Collapsible on mobile with "See more" if list is long

#### 7. Update `Home.tsx`
- Keep existing: greeting, Wrist Check CTA, WearCalendar
- Rename existing "Most Worn" to "Your Most Worn" (personal)
- Add `MostWornThisWeekSection` (platform-wide)
- Add `HomeFeedSection`
- Keep sponsored slot placeholder

#### 8. i18n
- Add all new keys to all 6 locale files (EN, ES, FR, PT, JA, ZH)

#### 9. Change Control Log
- Version 1.20, category: New Feature

### Technical Notes
- The `get_home_feed` function uses `SECURITY DEFINER` to safely join across users while respecting privacy -- only returns public post data and friend activity
- Editorial content is admin-managed via the existing Admin page (new tab)
- No ads implemented yet; sponsored slot remains reserved

