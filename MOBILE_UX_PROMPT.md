# Mobile UX Completion Prompt

> Copy everything below the line and paste it as your prompt.

---

I ran a detailed audit of My Sora Vault's mobile UX against our original 10-point prompt. Here are the gaps that need to be fixed. Please implement them in this exact order. Do NOT refactor or rename anything that already works — only add missing features and fix the specific issues listed.

## 1. Global `whileTap` on Button Component

In `src/components/ui/button.tsx`, wrap the rendered element with Framer Motion so every Button in the app gets tactile tap feedback:

- Import `motion` from `framer-motion`
- Change the rendered element to `motion.button` (or use `motion(Slot)` when `asChild` is true)
- Add `whileTap={{ scale: 0.97 }}` and `transition={{ duration: 0.1 }}`
- Respect `prefers-reduced-motion` — if reduced motion is preferred, skip the scale animation

## 2. Offline Resilience (PWA + Cache + Indicator)

### 2a. PWA Setup
- Install `vite-plugin-pwa` as a dev dependency
- Configure it in `vite.config.ts` with: `registerType: 'autoUpdate'`, `manifest` object containing app name "My Sora Vault", short_name "SoraVault", theme_color matching our CSS `--primary`, background_color matching `--background`, display "standalone", and icons (use the existing favicon/logo files in `/public`)
- This will auto-generate the service worker and manifest

### 2b. React Query Cache Configuration
In `src/App.tsx` where `QueryClient` is created, update the `defaultOptions`:
```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 30 * 60 * 1000,         // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

### 2c. Online/Offline Status Hook + Indicator
- Create `src/hooks/useOnlineStatus.ts` — a hook that returns `isOnline: boolean` using `navigator.onLine` and listens for `online`/`offline` window events
- In `src/components/AppLayout.tsx`, use this hook. When offline, show a thin amber/yellow banner at the top: "You're offline — some features may be unavailable" with a wifi-off icon from Lucide
- Animate the banner in/out with Framer Motion `AnimatePresence`

### 2d. Offline Wear-Entry Queue
- Create `src/hooks/useOfflineQueue.ts`
- When a wear entry mutation fails due to network error, save it to localStorage under key `sora_offline_queue`
- Listen for the `online` event. On reconnect, flush all queued entries by re-submitting them to Supabase
- Show a Sonner toast: "Syncing X pending entries..." and "All entries synced!" on completion
- In the AddWearDialog submit handler, catch network errors and route them to the queue

## 3. Replace Remaining Dropdowns with Mobile Drawers

For these three components, use the pattern: detect mobile with `useIsMobile()` hook (check if one exists already in `src/hooks/`). On mobile, render a `Drawer` (from shadcn). On desktop, keep the existing `DropdownMenu`.

- `src/components/CollectionSwitcher.tsx` — the collection picker dropdown
- `src/components/messaging/MentionNotifications.tsx` — the notifications dropdown
- `src/components/DynamicItemCard.tsx` — the card action menu

Do NOT remove the desktop DropdownMenu — conditionally render based on screen size.

## 4. Gesture Navigation

### 4a. Pull-to-Refresh
- Create `src/hooks/usePullToRefresh.ts` that:
  - Tracks touch start/move/end events on a scroll container
  - Only activates when scrollTop is 0 and user pulls down > 60px
  - Shows a small spinning loader at the top during refresh
  - Calls a provided `onRefresh` async callback
- Apply this hook on: Collection page watch grid, Feed/Social page, Log/wears history page
- The `onRefresh` callback should call the relevant React Query `refetch()`

### 4b. Long-Press Context Menu on Watch Cards
- Create `src/hooks/useLongPress.ts` — returns event handlers for a 300ms long-press detection
- On long-press of any watch card in the collection grid, open a Drawer (bottom sheet) with actions:
  - 👁 View Details → navigate to watch detail
  - 📝 Log Wear → open AddWearDialog pre-filled with this watch
  - ✏️ Edit → navigate to edit
  - 🔄 Trade → mark as available for trade (if trade feature exists)
  - 🗑 Delete → confirm and delete
- Add subtle haptic feedback on long-press trigger (use the existing haptic utility if one exists in `src/utils/`)
- Make sure regular tap still navigates to watch detail as before

## 5. Quick-Add from Home Page

### 5a. One-Tap "Log Today" on Watch Cards
- On the Home page's "Recently Worn" and collection watch cards, add a small floating icon button (bottom-right corner of the card) with a `Plus` or `Clock` Lucide icon
- Tapping this icon opens the `AddWearDialog` with the watch pre-selected and today's date filled in
- The icon should have `44x44px` touch target, semi-transparent background, and a subtle `whileTap` scale

### 5b. Quick-Add Bottom Sheet
- If there's a FAB (floating action button) or a primary CTA on the Home page, make it open a bottom sheet (Drawer) with:
  - "Log a Wear" (opens AddWearDialog)
  - "Add a Watch" (navigates to add watch flow)
  - "Quick Photo ID" (opens camera for AI identification)

## 6. Vault Assistant Chat Polish

### 6a. Auto-Resize Textarea
- In the Vault Assistant chat input, replace the fixed-height textarea with an auto-growing one
- On `input` event: reset height to `auto`, then set `height = Math.min(scrollHeight, 120) + 'px'`
- Start at 1 row, grow to max ~4 rows (120px), then scroll internally

### 6b. Scroll-to-Latest Indicator
- When the user scrolls up in the chat by more than 200px from the bottom, show a floating pill button: "↓ New messages"
- On tap, smooth-scroll to the bottom
- Hide when user is at or near the bottom
- Use `IntersectionObserver` on a sentinel div at the bottom of the chat list

### 6c. Horizontal Suggested Questions
- Change the suggested question pills container from `flex flex-wrap` to `flex overflow-x-auto flex-nowrap gap-2 scrollbar-hide`
- Each pill should have `flex-shrink: 0` (use `shrink-0` Tailwind class)
- Add `pb-2` for scroll inertia space on iOS

## 7. Page Route Transitions

- In the main router (likely `App.tsx` or wherever `<Routes>` is rendered), wrap the routes in Framer Motion `AnimatePresence` with `mode="wait"`
- Each lazy-loaded page component should be wrapped in a `motion.div` with:
  ```tsx
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
  ```
- Respect `prefers-reduced-motion` — skip animations if reduced motion is preferred

## 8. Skeleton Loading States

### 8a. Watch Grid Skeleton
- Create `src/components/WatchCardSkeleton.tsx` — a pulsing placeholder matching the watch card layout (image rectangle + 2 text lines + badge)
- Use Tailwind `animate-pulse bg-muted rounded-lg`
- In the collection grid, show 6 skeletons when `isLoading` is true

### 8b. Feed Skeleton
- Create `src/components/social/FeedItemSkeleton.tsx` — placeholder for feed items (avatar circle + text lines + image rectangle)
- Show 3 skeletons when feed is loading

## 9. Accessibility Fixes

### 9a. Add `aria-label` to Icon-Only Buttons
Scan these areas and add descriptive `aria-label` to every icon-only button (buttons with no visible text):
- Admin panel tabs (AccessLogsTab, UsageMetricsTab, etc.)
- Settings page
- Any toolbar or action bar with icon-only buttons

### 9b. Fix GlobalSearch Alt Text
- In the GlobalSearch component, ensure watch result images have `alt={watchName}` not a generic string

### 9c. Tag/Pill Padding
- Increase tag and pill padding from `py-1.5` to `py-2` across all Badge/tag usages in:
  - Wear log tags
  - Watch detail tags
  - Filter chips
  - Any component using small tappable pill-shaped elements

## Important Implementation Notes

- Use the existing `useIsMobile` hook if it exists — do not create a duplicate
- Use the existing haptic feedback utility in `src/utils/` if it exists — do not duplicate
- All new hooks go in `src/hooks/`
- All new components follow existing naming conventions and file structure
- Use Sonner for all toast notifications (already installed)
- Use Lucide React for all icons (already installed)
- Use Framer Motion for all animations (already installed)
- Use shadcn Drawer component for all bottom sheets (already installed)
- Do NOT install new UI libraries unless absolutely necessary
- Do NOT refactor existing working code — only add or modify what's specified
- Preserve all existing functionality — nothing should break
