# Lovable Prompt Plan — Home / Landing Page

## Context

You are an experienced full-stack engineer working on **TLV (The Luxury Vault)**, a luxury watch collector community app built with:

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** with custom design tokens (`textMain`, `textMuted`, `textSoft`, `accent`, `surfaceMuted`, `borderSubtle`, `background`)
- **shadcn/ui** (Radix primitives) for all base components (`Card`, `Button`, `Badge`, `Drawer`, `Tabs`, `Skeleton`, etc.)
- **Supabase** (auth, database, RPC functions, real-time)
- **TanStack React Query** for data fetching/caching
- **Framer Motion** for animations
- **Capacitor** (iOS + Android native shell)
- **react-i18next** for internationalization
- **react-router-dom v6** with lazy-loaded routes
- **date-fns** for date formatting

The app has 4 bottom-nav tabs: **Home** (`/`), **Log** (`/log`), **Feed** (`/feed`), **Profile** (`/profile`), plus a "More" hamburger drawer.

Design principle: **"Less is more."** Keep UI clean, decluttered, fast, and easy to interact with. Prefer progressive disclosure over dense screens. Do NOT add extra modules beyond what is specified below.

---

## PROMPT 1 — "Your Week" Module (with Quick Log)

> Refactor the existing Home page (`src/pages/Home.tsx`) to replace the current layout with a single, focused **"Your Week"** module. This is the primary module on the Home page and the first thing the user sees after login.

### Requirements

1. **Greeting Header** (keep existing)
   - Time-based greeting ("Good morning/afternoon/evening")
   - Current date formatted with locale support
   - Use existing `getGreeting()` logic and `date-fns` locale map

2. **Wear Calendar — "Your Week" Strip**
   - Refactor the existing `<WearCalendar>` component into a compact **horizontal week strip** (Mon–Sun)
   - Each day cell shows:
     - Day abbreviation (M, T, W, T, F, S, S)
     - A small circular watch thumbnail if a watch was worn that day, or an empty ring if not
     - Today's cell is highlighted with the `accent` color border
   - Tapping a **filled day** opens the existing `<QuickLogSheet>` pre-populated with that watch
   - Tapping an **empty day** navigates to `/log` so the user can log a wear for that date
   - Week navigation: swipe left/right to move between weeks (use Framer Motion gesture), or tap a small calendar icon to open a date picker (existing `<Popover>` + `<Calendar>`)
   - Show a subtle summary below the strip: "X of 7 days logged this week"

3. **Quick Log CTA**
   - Keep the existing full-width "Wrist Check" button but move it directly below the week strip
   - On tap → navigate to `/log` (existing behavior)
   - Use `motion.div whileTap={{ scale: 0.98 }}` (existing pattern)

4. **Your Most Worn This Week** (personal, not platform)
   - Show a horizontal scroll of the user's most-worn watches **this week only** (not all-time)
   - Reuse the existing card pattern: 28×28 rounded-2xl image thumbnail, brand, model, day count
   - Max 6 items, sorted by wear count descending
   - Tapping a watch card → navigate to `/watch/:id`
   - If no data, show a single-line empty state: "No wears logged this week"

5. **Remove from Home page:**
   - Remove `<MostWornThisWeekSection>` (platform/friends most-worn) — this belongs in Feed, not Home
   - Remove `<HomeFeedSection>` — will be re-added in Prompt 2 as a separate module
   - Remove the hidden sponsored-content placeholder div

6. **Technical constraints:**
   - Keep all existing imports/hooks that are still used; remove unused ones
   - Maintain lazy-loading (`export default Home`)
   - Maintain `<PageTransition>` wrapper
   - All strings must use `useTranslation()` — add new keys under `home.*` namespace
   - Ensure skeleton loading states for the week strip and most-worn section
   - Mobile-first: optimize touch targets (min 44px), use `scrollbar-hide` on horizontal scrolls

---

## PROMPT 2 — Social Feed Module (Friends + Platform)

> Add a **Social Feed** module below "Your Week" on the Home page. This is a condensed preview of the full Feed page, showing a mix of friend activity and platform-wide trending content.

### Requirements

1. **Section Header**
   - Title: "What's Happening" (uppercase, `text-sm font-semibold tracking-wider text-textMuted`)
   - Right-aligned "See All" link → navigates to `/feed`

2. **Filter Chips** (horizontal scroll)
   - Chips: `Friends`, `Trending`, `News`, `Articles`, `Videos`
   - Default selection: `Friends`
   - Active chip: `bg-accent text-white`; inactive: `bg-surfaceMuted text-textMuted`
   - Reuse the existing `useHomeFeed` hook and `FeedFilter` type
   - Changing filter resets pagination

3. **Feed Cards** (max 5 items on Home; full list on `/feed`)
   - Reuse the existing card layout from `<HomeFeedSection>`:
     - `<UserAvatar>` (sm), username, feed-type badge, content preview (2-line clamp), optional image (max-h-40 rounded-xl), like count, comment count, timestamp
   - Tapping a card with `external_url` → open in external browser
   - Tapping a card without `external_url` → navigate to `/feed`
   - Add a subtle divider (1px `borderSubtle`) between cards instead of `space-y-3` gap for a tighter feel

4. **Load More → "See All"**
   - Instead of a "Load More" button, show a "See all in Feed →" link at the bottom that navigates to `/feed`
   - Use `ChevronRight` icon, `text-accent` color

5. **Empty State**
   - If no items for the selected filter: "Nothing here yet. Follow collectors to see their activity." inside a `<Card>` with `p-6 text-center`

6. **Technical constraints:**
   - Extract into a new component: `src/components/home/SocialFeedPreview.tsx`
   - Limit query to 5 items (override `PAGE_SIZE` or pass a `limit` prop)
   - Reuse `useHomeFeed` hook — add an optional `maxItems` parameter
   - Maintain skeleton loading with `<FeedItemSkeleton>` (show 2 skeletons)

---

## PROMPT 3 — Mobile-Only: Background Updates + Push Notifications

> Implement background data refresh and push notifications for the **mobile apps only** (iOS + Android via Capacitor). Do NOT implement any of this for web/desktop.

### Requirements

1. **Platform Detection**
   - Use the existing `src/utils/nativeApp.ts` utilities or Capacitor's `Capacitor.isNativePlatform()` to gate all mobile-only code
   - All push notification and background refresh code must be wrapped in platform checks

2. **Background Data Refresh**
   - Install and configure `@capacitor/background-runner` (or equivalent Capacitor plugin)
   - On background wake (every ~15 minutes when OS permits):
     - Fetch new social feed items count
     - Fetch unread notification count (likes, trade requests, friend requests)
     - Update the app badge number on the device icon
   - Store last-fetched timestamps in `@capacitor/preferences` to avoid redundant fetches

3. **Push Notifications**
   - Install and configure `@capacitor/push-notifications`
   - Register for push on first app launch after login
   - Store the device push token in Supabase (create table `push_tokens` with columns: `id`, `user_id`, `token`, `platform` (ios/android), `created_at`, `updated_at`)
   - Handle three notification types:

     **a) Likes**
     - Trigger: When another user likes the current user's post or comment
     - Notification title: "{username} liked your post"
     - Notification body: First 80 chars of the post content
     - Tap action: Navigate to `/feed`

     **b) Trade Requests**
     - Trigger: When another collector sends a trade inquiry on the user's watch
     - Notification title: "New trade request"
     - Notification body: "{username} is interested in your {brand} {model}"
     - Tap action: Navigate to `/feed?tab=messages` (existing messages tab)

     **c) Friend Requests**
     - Trigger: When another user sends a follow/friend request
     - Notification title: "New friend request"
     - Notification body: "{username} wants to connect with you"
     - Tap action: Navigate to `/feed?tab=notifications` or `/profile`

4. **Notification Preferences**
   - Add a "Notifications" section to the existing Settings page (`src/pages/Settings.tsx`)
   - Toggle switches for each notification type: Likes, Trade Requests, Friend Requests
   - Store preferences in Supabase user metadata or a `notification_preferences` table
   - Default: all enabled

5. **Badge Count on Bottom Nav**
   - Reuse the existing `useSocialNotifications` hook
   - Extend it to include trade request count and friend request count (not just social notifications)
   - The red badge on the Feed tab in `<BottomNavigation>` should reflect the total unread count across all three types

6. **Backend (Supabase)**
   - Create Supabase Edge Functions (or Database Webhooks) to trigger push notifications:
     - `on_like_created` → send push to post author
     - `on_trade_request_created` → send push to watch owner
     - `on_friend_request_created` → send push to target user
   - Each function should:
     - Look up the target user's push token(s)
     - Check notification preferences
     - Skip if user has disabled that notification type
     - Send via FCM (Android) / APNs (iOS) using the token

7. **Technical constraints:**
   - All mobile-only code should be in `src/utils/pushNotifications.ts` and `src/utils/backgroundRefresh.ts`
   - Use a `usePushNotifications` hook that initializes on app mount (inside `AppContent` in `App.tsx`), gated behind `Capacitor.isNativePlatform()`
   - Handle notification permission denied gracefully — show a one-time toast explaining how to enable in device settings
   - Capacitor config updates go in `capacitor.config.ts`

---

## PROMPT 4 — Trust & Safety UX Signals on Home Page

> Add subtle trust signals to the Home page feed cards and user interactions. These are **display-only** — no new verification flows, just surfacing existing trust data.

### Requirements

1. **Trust Badges on Feed Cards**
   - Next to the username in each feed card, show the user's highest verification badge:
     - Level 1: Small shield icon with "Verified" tooltip
     - Level 2: Shield + checkmark icon with "ID Verified" tooltip
     - Level 3: Gold shield icon with "Safe Trader" tooltip
   - Use the existing `<TrustLevelBadge>` component (`src/components/TrustLevelBadge.tsx`)
   - Badge data comes from the feed item's author metadata (extend `FeedItem` interface to include `author_trust_level?: number`)

2. **Watch Authentication Badge**
   - If a feed card references an authenticated watch, show a small "Authenticated" badge below the watch image
   - Use `<Badge variant="outline">` with a small checkmark icon
   - Only show if `item.watch_authenticated === true` (extend `FeedItem` interface)

3. **Trade Safety Indicator**
   - On trade-related feed items (`feed_type === "trade"`), show a subtle safety banner:
     - "Protected by TLV Safe Trade" in `text-[10px] text-green-600` with a small lock icon
   - This is purely informational — no action needed

4. **Technical constraints:**
   - Extend the `FeedItem` interface in `src/hooks/useHomeFeed.ts` with optional trust fields
   - Update the Supabase RPC `get_home_feed` to return trust-level data (add to the SQL query)
   - Keep all badges small and non-intrusive — they should not compete with the content

---

## Implementation Order

Execute these prompts **sequentially** in Lovable:

1. **Prompt 1** first — establishes the new Home page structure
2. **Prompt 2** second — adds the social feed below
3. **Prompt 3** third — mobile-only background/push (independent of UI layout)
4. **Prompt 4** fourth — trust signals layered on top of existing feed cards

Each prompt is self-contained and builds on the previous one. Test after each prompt before proceeding to the next.
