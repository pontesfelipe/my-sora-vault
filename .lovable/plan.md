

# Implementation Plan — Home Page Prompts 1–4

This is a large, multi-phase implementation. I recommend executing them sequentially across multiple messages to ensure stability. Here is the full plan.

---

## Phase 1: "Your Week" Module Refactor (Prompt 1)

**Goal**: Simplify Home page to focus on personal weekly wear tracking.

### Changes:
1. **`src/pages/Home.tsx`** — Remove `<MostWornThisWeekSection>`, `<HomeFeedSection>`, and the sponsored placeholder. Restructure layout to: Greeting → Week Strip → Wrist Check CTA → Your Most Worn This Week (filtered to current week only, not all-time). Add empty state for no wears this week.

2. **`src/components/WearCalendar.tsx`** — Add swipe gesture navigation (Framer Motion `drag="x"` on the week strip) to move between weeks. Show circular watch thumbnails in day cells instead of just accent-filled circles. Tapping an empty day navigates to `/log` with that date pre-selected. Summary line: "X of 7 days logged this week".

3. **`src/pages/Home.tsx` `getMostWorn`** — Filter `wearEntries` to only the current week (using `startOfWeek`/`endOfWeek`) instead of all-time.

4. **i18n** — Add keys: `home.noWearsThisWeek`, `home.daysLogged`, etc. to all 6 locale files.

---

## Phase 2: Social Feed Preview (Prompt 2)

**Goal**: Add a condensed 5-item social feed preview below "Your Week".

### Changes:
1. **New component: `src/components/home/SocialFeedPreview.tsx`** — Filter chips (Friends, Trending, News, Articles, Videos), max 5 items, divider-separated cards, "See all in Feed →" link at bottom. Reuses `useHomeFeed` with a `maxItems` parameter.

2. **`src/hooks/useHomeFeed.ts`** — Add optional `maxItems` parameter that overrides `PAGE_SIZE`.

3. **`src/pages/Home.tsx`** — Add `<SocialFeedPreview />` below the Most Worn section.

4. **i18n** — Add keys for "What's Happening", "See all in Feed", "Nothing here yet" to all 6 locales.

---

## Phase 3: Mobile Push Notifications (Prompt 3)

**Goal**: Background refresh and push notifications for native apps only.

### Database:
- Create `push_tokens` table: `id`, `user_id`, `token`, `platform`, `created_at`, `updated_at` with RLS (users manage own tokens).
- Create `notification_preferences` table: `id`, `user_id`, `likes_enabled`, `trades_enabled`, `friends_enabled` (all default true) with RLS.

### New files:
- **`src/utils/pushNotifications.ts`** — Register for push, store token in DB, handle incoming notifications with navigation routing.
- **`src/utils/backgroundRefresh.ts`** — Periodic feed/notification count fetch (Capacitor Background Runner).
- **`src/hooks/usePushNotifications.ts`** — Init hook gated behind `Capacitor.isNativePlatform()`, called in `App.tsx`.

### Edge Functions:
- **`supabase/functions/send-push-notification/index.ts`** — Lookup push tokens, check preferences, send via FCM/APNs.

### UI:
- **`src/pages/Settings.tsx`** — Add "Notifications" section with toggle switches for Likes, Trade Requests, Friend Requests (mobile only).
- **`src/components/BottomNavigation.tsx`** — Extend badge count to include trade + friend request counts via `useSocialNotifications`.

### Dependencies:
- Install `@capacitor/push-notifications` and optionally `@capacitor/background-runner`.

### Note:
Push notification sending requires FCM/APNs server keys. The edge function will be scaffolded but will need API keys configured as secrets before it can send actual pushes.

---

## Phase 4: Trust & Safety Badges (Prompt 4)

**Goal**: Surface trust signals on feed cards.

### Changes:
1. **`src/hooks/useHomeFeed.ts`** — Extend `FeedItem` interface with `author_trust_level?: string` and `watch_authenticated?: boolean`.

2. **Database** — Update `get_home_feed` RPC to join `user_trust_levels` and return trust level with each feed item.

3. **`src/components/home/SocialFeedPreview.tsx`** (and `HomeFeedSection.tsx`) — Next to author username, render `<TrustLevelBadge>` if trust level exists. Show "Authenticated" badge on watch-referenced cards. Show "Protected by TLV Safe Trade" banner on trade-type items.

4. **i18n** — Add keys for "Authenticated", "Protected by TLV Safe Trade" to all 6 locales.

---

## Change Control Log

A single entry at version **1.230** (or incremented per phase) will be logged for each phase, category "New Feature" / "Enhancement".

---

## Recommended Execution Order

Due to the scope, I recommend implementing **Phase 1 first**, verifying it works, then proceeding to Phase 2, etc. Shall I begin with Phase 1?

