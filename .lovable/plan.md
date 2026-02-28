

# Mobile UX Completion Plan

Based on the audit documents and codebase analysis, here is what already exists and what needs to be implemented.

## Already Done (No Work Needed)
- Offline status hook + banner (`useOnlineStatus`, `OfflineBanner`)
- Offline wear-entry queue (`offlineSync.ts`)
- Haptics utility (`haptics.ts`)
- `useIsMobile` hook
- Long-press context menu (`useLongPress` + `WatchContextMenu`)
- Watch grid skeleton (`WatchCardSkeleton` in `WatchCaseGrid`)
- `PageTransition` wrapper (used on Home, Log, Feed, Profile)
- Quick-log from Home (QuickLogSheet, one-tap log icon)
- Some whileTap on specific cards

---

## Implementation Steps (in priority order)

### 1. Global whileTap on Button component
- In `src/components/ui/button.tsx`, wrap with `motion.button` / `motion(Slot)` from framer-motion
- Add `whileTap={{ scale: 0.97 }}` with `prefers-reduced-motion` check
- Single file change, affects every button in the app

### 2. React Query cache config
- Update `QueryClient` in `App.tsx` with `staleTime: 5min`, `gcTime: 30min`, `retry: 2`, `refetchOnWindowFocus: false`

### 3. Replace dropdowns with Drawers on mobile
- `CollectionSwitcher.tsx`: use `useIsMobile()` to render Drawer on mobile, keep DropdownMenu on desktop
- `DynamicItemCard.tsx`: same pattern
- `MentionNotificationsDropdown.tsx`: same pattern

### 4. Pull-to-refresh hook
- Create `src/hooks/usePullToRefresh.ts` using touch events + Framer Motion indicator
- Apply on Collection page, Feed page, Log page
- Trigger React Query `refetch()` on pull

### 5. Route-level AnimatePresence
- Wrap `<Routes>` in `App.tsx` with `<AnimatePresence mode="wait">`
- Requires `useLocation` + key on route wrapper
- Respects `prefers-reduced-motion`

### 6. Feed skeleton component
- Create `src/components/FeedItemSkeleton.tsx` (avatar circle + text lines + image placeholder)
- Show 3 skeletons when feed `isLoading`

### 7. Vault Assistant chat polish
- Auto-resize textarea in VaultPal chat input
- Scroll-to-latest floating pill using IntersectionObserver
- Horizontal scrolling suggested question pills (`overflow-x-auto flex-nowrap`)

### 8. Accessibility fixes
- Add `aria-label` to icon-only buttons in admin panel tabs and Settings
- Fix `alt` text in GlobalSearch to use watch name
- Increase tag/pill padding to `py-2` for 44px touch targets

---

## Technical Notes
- `vite-plugin-pwa` is **not recommended** here since the app uses Capacitor for native builds; a service worker may conflict with Capacitor's webview. PWA setup is skipped.
- No new libraries needed — all work uses existing framer-motion, shadcn Drawer, Lucide icons, and Sonner toasts.

