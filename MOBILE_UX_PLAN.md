# Mobile UX Completion Plan — My Sora Vault

## Audit Summary

**Current score: ~38/64 (59%)** across 10 mobile UX categories.

Tech stack: React 18 + TypeScript, Vite, TailwindCSS, shadcn/Radix UI, Framer Motion, Supabase, React Query (TanStack), Capacitor 8, Sonner toasts.

---

## Phase 1 — Critical Gaps (Offline + Core Interactions)

### 1.1 Offline Resilience (0/5 → target 4/5)

**Why first:** Without offline support, the app breaks on any network interruption — common on mobile.

| Task | Details |
|------|---------|
| PWA manifest | Add `/public/manifest.json` with app name, icons, theme color, `display: standalone` |
| Service worker | Use `vite-plugin-pwa` to generate a precache SW for static assets + app shell |
| React Query cache config | Set `staleTime: 5 * 60 * 1000`, `gcTime: 30 * 60 * 1000`, `retry: 2` on the global QueryClient. Add `@tanstack/query-persist-client-core` + `createSyncStoragePersister` to persist cache to localStorage |
| Offline indicator | Create `useOnlineStatus()` hook using `navigator.onLine` + `online`/`offline` events. Show a toast or thin banner in `AppLayout.tsx` when offline |
| Offline wear-entry queue | Queue failed wear-log mutations in localStorage. On reconnect, flush the queue. Show a "pending sync" badge |

### 1.2 Gesture Navigation (1/5 → target 4/5)

| Task | Details |
|------|---------|
| Pull-to-refresh | Add `usePullToRefresh` hook on scrollable list pages (Collection, Feed, Log). Trigger React Query `refetchQueries`. Use Framer Motion for the pull indicator animation |
| Long-press context menu | Add a `useLongPress` hook (300ms threshold). On watch cards, show a Drawer/Sheet with: View Details, Log Wear, Edit, Trade, Delete. Wire existing actions into the menu |
| Swipe down to dismiss modals | Add `drag="y"` + `dragConstraints` on Sheet/Dialog content. On `onDragEnd` with velocity > threshold, close the modal |

### 1.3 Global `whileTap` Feedback (0 → done)

| Task | Details |
|------|---------|
| Button component | Wrap the shadcn `Button` in `motion.button` with `whileTap={{ scale: 0.97 }}` and `transition={{ duration: 0.1 }}`. This gives every button in the app tactile feedback with one change |

---

## Phase 2 — Touch Polish & Drawers

### 2.1 Replace Remaining Dropdowns with Drawers on Mobile

| Component | File | Action |
|-----------|------|--------|
| CollectionSwitcher | `src/components/CollectionSwitcher.tsx` | Use Drawer on `sm:` breakpoint, keep DropdownMenu on desktop |
| MentionNotifications | `src/components/messaging/MentionNotifications.tsx` | Same pattern |
| DynamicItemCard | `src/components/DynamicItemCard.tsx` | Same pattern |

**Pattern:** Create a `useIsMobile()` hook (or reuse existing) that checks `window.innerWidth < 768`. Conditionally render `<Drawer>` vs `<DropdownMenu>`.

### 2.2 Tag/Pill Touch Targets

| Task | Details |
|------|---------|
| Increase padding | Change tag/pill/badge components from `px-3 py-1.5` to `px-4 py-2` for comfortable 44px touch targets |
| Audit all Badge usages | Ensure consistent sizing across WearLogCard tags, watch detail tags, filter chips |

---

## Phase 3 — Quick-Add & Log Shortcuts

### 3.1 Quick-Add Bottom Sheet from Home

| Task | Details |
|------|---------|
| "Log Today" action | On Home page watch cards (recently worn, collection grid), add a tap handler that opens a pre-filled AddWearDialog bottom sheet with the watch already selected |
| One-tap log | Add a small clock/log icon overlay on watch card thumbnails. Tapping it logs a wear entry for today with no dialog (optimistic, with undo toast) |

### 3.2 Vault Assistant Polish

| Task | Details |
|------|---------|
| Auto-resize textarea | Replace fixed-height `<textarea>` with one that grows with content: `onInput` → set `style.height = scrollHeight + 'px'`, cap at 120px |
| Scroll-to-latest indicator | When user scrolls up in chat, show a floating "↓ New messages" pill at bottom. On tap, `scrollIntoView({ behavior: 'smooth' })` to latest message |
| Horizontal suggested questions | Change suggested question pills container from `flex-wrap` to `overflow-x-auto flex-nowrap` with `scrollbar-hide` utility |

---

## Phase 4 — Animations & Visual Polish

### 4.1 Page Route Transitions

| Task | Details |
|------|---------|
| AnimatePresence on routes | Wrap `<Routes>` in `<AnimatePresence mode="wait">`. Add `<motion.div>` with `initial={{ opacity: 0, y: 8 }}`, `animate={{ opacity: 1, y: 0 }}`, `exit={{ opacity: 0 }}` on each lazy page |

### 4.2 Skeleton Loading

| Task | Details |
|------|---------|
| Watch grid skeletons | Create a `WatchCardSkeleton` component with pulsing gray rectangles matching watch card layout. Show 6-8 skeletons while React Query `isLoading` is true |
| Feed item skeletons | Same pattern for social feed items |

### 4.3 Pinch-to-Zoom on Watch Photos

| Task | Details |
|------|---------|
| Watch detail photos | Use a library like `react-zoom-pan-pinch` or implement with touch events + CSS transform. Apply on the watch detail image gallery |

---

## Phase 5 — Accessibility Hardening

### 5.1 Missing `aria-label` on Icon Buttons

| Area | Action |
|------|--------|
| Admin panel buttons | Add `aria-label` to all icon-only buttons in admin tabs |
| Settings page buttons | Same for settings icon buttons |
| GlobalSearch watch images | Add meaningful `alt` text (currently generic) |

### 5.2 Color Contrast Audit

| Task | Details |
|------|---------|
| Run axe-core or Lighthouse | Verify WCAG AA (4.5:1 for text, 3:1 for large text) on both light and dark themes |
| Fix any failures | Adjust CSS variables in `index.css` if needed |

---

## Implementation Priority Order

```
Phase 1.3  →  Global whileTap (1 file, 5 min, huge impact)
Phase 1.1  →  Offline resilience (most critical gap)
Phase 2.1  →  Drawer replacements (3 components)
Phase 1.2  →  Gesture navigation (pull-to-refresh, long-press)
Phase 3.1  →  Quick-add from Home
Phase 3.2  →  Vault Assistant polish
Phase 2.2  →  Tag padding
Phase 4    →  Animations & skeletons
Phase 5    →  Accessibility hardening
```

---

## Expected Final Score

If all phases completed: **~58/64 (91%)**

Remaining items intentionally deferred:
- Push notifications (requires backend infrastructure + Apple/Google setup)
- Swipe-right-to-go-back (conflicts with native browser/Capacitor gestures)
- Full image crop for watch photos (avatar crop already exists, low priority)
- WCAG contrast (needs manual audit, not automatable in a prompt)

---

## Ready-to-Share Prompt

See `MOBILE_UX_PROMPT.md` for the copy-paste prompt.
