# Luxury Vault — Mobile-First Rebuild Prompt for Lovable

## Overview

Build **Luxury Vault**, a premium mobile-first web application for managing luxury watch collections. The app is primarily accessed on mobile phones and should feel like a native iOS/Android app — fast, gesture-friendly, and visually luxurious. Use **Supabase** for authentication, database, storage, and edge functions. Use **shadcn/ui** + **Tailwind CSS** + **Framer Motion** for the UI. The app supports **Capacitor** for native mobile builds.

---

## Design Philosophy & Mobile-First Principles

### Visual Identity
- **App Name**: "Luxury Vault" (abbreviated "LV")
- **Tagline**: "Watch Collection Studio"
- **Design Language**: Refined luxury — think a high-end watch case with velvet lining. Dark mode default. Muted golds, deep navy blues, soft whites. No visual clutter.
- **Color Palette**: Primary accent is a sophisticated blue (`hsl(215, 50%, 57%)`). Support both light and dark themes with custom CSS variables. Dark theme: deep charcoal backgrounds (`hsl(222, 25%, 3%)`). Light theme: cool off-white (`hsl(216, 33%, 97%)`).
- **Typography**: Clean, tight tracking for headings. Use `text-[10px]` to `text-2xl` range. Uppercase tracking-wider for section labels. System font stack for performance.
- **Border Radius**: Generous — `rounded-2xl` for cards, `rounded-full` for pills and avatars, `rounded-3xl` for the watch case display.

### Mobile-First UX Requirements
- **Touch Targets**: All interactive elements must be minimum 44x44px (`touch-target` class). Buttons should be generous with `h-12` or `h-14` minimum height on mobile.
- **Bottom Navigation**: Fixed bottom nav bar (Home, Log, Feed, Profile, More) with safe-area padding for notched phones. Icons with 10px labels. Active state uses accent color. Badge notifications on the Feed tab.
- **Haptic Feedback**: Trigger haptic feedback on navigation taps and important actions (use Capacitor Haptics or a `triggerHaptic()` utility).
- **Swipe Gestures**: Support swipe-to-delete and swipe-to-reveal-actions on list items (conversations, wear entries).
- **Pull-to-Refresh**: Not required initially, but design data-loading states that support it later.
- **Safe Areas**: Respect `safe-area-bottom` and `safe-area-top` on all fixed elements. The bottom nav must use `pb-safe`.
- **Scroll Performance**: Use `overflow-x-auto` with `scrollbar-hide` for horizontal carousels. Avoid nested scroll areas where possible.
- **Progressive Disclosure**: Use `<details>` for optional fields. Use collapsible sections. Don't overwhelm users with form fields.
- **No Hover States on Mobile**: Ensure all hover interactions have tap equivalents. Use `whileTap={{ scale: 0.96 }}` from Framer Motion for tactile feedback.
- **Drawer for Mobile Menus**: Use the `vaul` drawer component for mobile "More" menu instead of dropdown menus.
- **Responsive Breakpoints**: `md:` (768px) switches from mobile bottom-nav layout to desktop sidebar layout. Mobile is the primary design target.

### Performance
- **Code Splitting**: Lazy-load all pages with `React.lazy()` and `Suspense`.
- **Splash Screen**: Show an animated branded splash screen (LV logo with pulsing animation) for 1.5s on initial load.
- **Image Optimization**: All watch images should use `object-cover` and be displayed in constrained containers. Support AI-generated reference images (`ai_image_url` field).
- **Skeleton States**: Show subtle loading spinners (not full-page skeletons) during data fetching.

---

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with `tailwindcss-animate`, `tailwind-merge`, `class-variance-authority`
- **UI Components**: shadcn/ui (full component library including Dialog, Drawer, AlertDialog, Tabs, Badge, Card, Input, Textarea, Select, ScrollArea, Tooltip, Popover, etc.)
- **Animations**: Framer Motion for page transitions, card entrances, and micro-interactions
- **Routing**: React Router DOM v6
- **State Management**: React Context (AuthContext, CollectionContext, PasscodeContext, ThemeContext) + TanStack React Query for server state
- **Backend**: Supabase (Auth, PostgreSQL database, Storage, Edge Functions, Realtime subscriptions)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts for analytics
- **Native**: Capacitor (iOS + Android) for haptics and native builds
- **Date Handling**: date-fns
- **Drag & Drop**: @dnd-kit for reordering
- **Toasts**: Sonner for toast notifications

---

## Authentication

### Auth Page (`/auth`)
- **Split layout**: On desktop, left half shows a hero image with the LV branding. On mobile, centered card layout.
- **Sign In tab**: Email + password form with "Email me a sign-in link" (magic link via Supabase OTP). Google OAuth and Apple OAuth buttons below a divider.
- **Request Access tab**: Registration request form for invite-only access. Users submit name + email. Admins approve in the admin panel.
- **Sign Up flow**: First name, last name, email, password. Must accept Terms & Conditions and Privacy Policy (shown in dialogs) via checkboxes.
- **MFA Support**: After password login, check for TOTP MFA factors. If enabled, show a 6-digit OTP verification screen.
- **Login tracking**: Record successful/failed login attempts to a `login_history` table.
- **Allowed users check**: After auth, verify the user's email exists in the `allowed_users` table. Block unauthorized users.
- **Auto-redirect**: If already authenticated, redirect to `/`.

---

## Core 4-Tab Navigation

The app has 4 primary tabs plus a "More" overflow menu:

### Tab 1: Home (`/`)
The dashboard — a glanceable summary of your week.

**Sections (top to bottom):**
1. **Greeting**: "Good morning/afternoon/evening" + current date (e.g., "Friday, February 27").
2. **Quick Log CTA**: Full-width large rounded button — "Wrist Check" with a plus icon. Navigates to `/log`. Use `whileTap={{ scale: 0.98 }}`.
3. **Your Week**:
   - Section header with "X days logged" count.
   - **Week dots row**: 7 circles for Mon-Sun. Filled accent color if a wear entry exists that day. Ring highlight on today. Show day abbreviation above, date number inside.
   - **Watches worn this week**: Stacked card list (max 3). Each card shows: watch thumbnail (48x48 rounded-xl), brand + model, "X days this week", chevron-right. Tap navigates to watch detail. Staggered entrance animation.
   - **Empty state**: Dashed border card with watch icon, "No entries this week", ghost button to log.
4. **Most Worn** (all-time):
   - Horizontal scroll carousel of watch thumbnails (112x112px rounded-2xl). Show brand, model, and total days count below each. Max 6 items. `whileTap={{ scale: 0.96 }}` on each.
   - "View all" link navigates to Profile.

### Tab 2: Log / Wrist Check (`/log`)
A mobile-optimized form for logging which watch you wore today.

**Sections (top to bottom):**
1. **Header**: "Wrist Check" title + "What are you wearing today?" subtitle. Date picker input on the right (defaults to today).
2. **Photo Capture**: Dashed-border card that opens camera (`capture="environment"`). After capture:
   - Shows photo preview with X button to remove.
   - Triggers AI identification via Supabase edge function (`identify-watch-from-photo`). Shows "Identifying watch..." overlay with sparkle animation.
   - On success, shows an identification card with brand/model/reference and Confirm/Dismiss buttons. Confirm auto-selects the matching watch from collection or navigates to add it.
3. **Watch Selector**:
   - Search input ("Search your collection...").
   - Expandable list of watches with thumbnails. Tap to select.
   - Selected watch shows as a card with change button.
   - If no matches, offer to add the watch to collection.
4. **Tags**: Horizontal wrap of suggested tag badges (Daily, Office, Casual, Formal, Trip, Event, Sport, Date Night, Weekend, Special Occasion). Tap to toggle. Custom tag input below.
5. **Notes**: Progressive disclosure via `<details>` — "Add notes (optional)". Textarea inside.
6. **Submit**: Full-width "Log Wrist Check" button with check icon. Disabled until watch selected. Loading state with spinner.
7. **On success**: Toast "Wrist check logged!" and navigate back to Home.

### Tab 3: Feed (`/feed`)
Social features — community posts and direct messages.

**Sub-tabs (full-width 2-column tab bar):**

**Feed sub-tab:**
- Search bar (rounded-full, pill-shaped) + notification dropdown + create post button.
- **Category pills**: Horizontal scroll of filter pills (All, plus dynamic categories from `FORUM_CATEGORIES`). Active pill is accent-filled.
- **Post cards**: Each post card shows author avatar, username, timestamp, category badge, content text, image (if any), vote buttons (up/down with counts), comment count. Support edit/delete for own posts, pin for admins.
- **Comment section**: Expandable below each post. Supports @mentions with autocomplete.
- **Create Post dialog**: Title, category select, content textarea with @mention support, optional image upload.
- **Empty state**: "Nothing here yet" with message icon.

**Messages sub-tab:**
- Conversation count + "Add Friend" button.
- **Friend requests & trade notifications**: Accent-tinted card at top if pending requests exist.
- **Conversation list**: Left panel (full width on mobile, 1/3 on desktop). Each conversation shows avatar, name, last message preview, timestamp, unread badge.
- **Chat window**: Right panel (full width on mobile, 2/3 on desktop). Message bubbles, text input, send button. Support swipe-to-delete on conversations.

### Tab 4: Profile (`/profile`)
Your collection showcase and personal stats.

**Sections:**
1. **Profile Header**: Avatar (large), username/display name, trust level badge, follower/following counts. Settings gear and Vault Assistant bot icon buttons.
2. **Favorites**: Horizontal scroll of top 3 most-worn watches (80x80 thumbnails). Brand name and days count below.
3. **Recent Wrist Checks**: Compact list of last 3 wear logs — watch thumbnail, name, date.
4. **Collection Switcher**: Dropdown to switch between named collections.
5. **Sub-tabs (3-column tab bar):**
   - **Collection**: Search bar + Add Watch button. **Watch Case Grid** — the signature UI element:
     - Outer frame with gradient background simulating a watch case (walnut/leather feel in dark mode, cream in light).
     - Inner velvet lining effect with subtle texture overlay.
     - 2-column grid on mobile, 3-column on desktop.
     - Each watch in a **WatchShowcaseCard**: 3D hover/tap effect, aspect-square image with radial glow, glass reflection overlay, brand/model nameplate strip at bottom with days-worn badge and eye icon. Trade badge and rarity badge overlays. Delete button on hover/long-press.
     - Staggered entrance animation (0.06s delay per card).
     - Total count label below grid.
   - **Wishlist**: Table of desired watches with brand, model, notes, priority.
   - **Lists**: Custom user-created lists (e.g., "Dive Watches", "Top 10") + system "Trade" list showing watches marked available_for_trade.

---

## Secondary Pages

### Watch Detail (`/watch/:id`)
Full-page detail view (no bottom nav — has its own back button header).

**Header**: Sticky header with back button, brand name (large), model name, edit button, delete button (with confirmation dialog), type badge.

**3-tab layout (Specifications / Statistics / Wear History):**

**Specifications tab:**
- Two-column grid of specs: Brand, Model, Dial Color, Type, Movement, Power Reserve, Crystal, Case Material, Case Size, Lug-to-Lug, Water Resistance, Caseback, Band.
- Purchase Cost with show/hide toggle (eye icon). Requires passcode verification for non-admins.
- Average Resale Price (US market data).
- Warranty status (valid/expired with date, link to warranty card image).
- Classification section: Rarity badge (common/uncommon/rare/very_rare/grail), Historical Significance badge, Trade availability badge. AI analysis reasoning text in a muted card.

**Statistics tab:**
- Stat cards: Total Days Worn, Purchase Cost (hide-able), Cost Per Day, Avg Resale Price.
- Monthly Breakdown grid: Each month showing days worn.

**Wear History tab:**
- Total days worn (large number).
- Add Wear Entry button.
- Chronological list of wear entries. Each entry shows date, days, notes. Edit (pencil) and delete (trash) buttons with confirmation dialogs.

### Vault Assistant (`/vault-pal`)
AI-powered chat assistant that knows about your collection.

**Layout**: Full-height flex layout with sidebar (desktop) and dropdown (mobile).

**Desktop**:
- Left sidebar (256px): "New Chat" button, search input, conversation list with swipe-to-delete/edit. Each conversation shows title and last updated date.
- Right main area: Header with bot icon + "My Vault Assistant" title + collection switcher. Collection Insights card (AI-generated summary, expandable, with refresh button). Chat messages area. Input bar at bottom.

**Mobile**:
- No sidebar. History button in header opens full-screen overlay with conversation list.
- Otherwise same as desktop.

**Chat features:**
- Message bubbles: User messages right-aligned with primary background. Bot messages left-aligned with muted background. Both have avatar icons.
- Long messages (>300 chars) are collapsible with "Show more/less" toggle.
- Suggested questions shown when empty (e.g., "What's my most worn watch?", "What should I add next?").
- Voice input: Microphone button with animated listening indicator (3 pulsing bars). Uses Web Speech API.
- Streaming indicator: "Thinking..." with spinner when waiting for response.
- Collection insights: Fetched from `collection_insights` table. Auto-refreshes when watches change (via Supabase Realtime subscription). Manual refresh button.

### Settings (`/settings`)
- Account Information card (email display).
- Change Password card (with password strength indicator). Hidden for Google OAuth users.
- Profile Settings card (avatar upload with crop dialog, username, display name).
- Default Collection card.
- Account Linking card (link/unlink Google, Apple).
- Two-Factor Auth card (TOTP setup with QR code).
- Session Management card (view/revoke active sessions).
- Login History card (table of recent logins).
- Danger Zone card (red border): Delete Account button with comprehensive confirmation dialog listing all data that will be deleted.

### Admin Panel (`/admin`)
Protected route — only visible to users with `is_admin` role.

**Tabs**: Registered Users, Allowed Users, Registration Requests, Feedback, Collections, Feature Matrix, Usage Metrics, Access Logs, Documentation, Methodology.

Key admin features:
- Export data to Excel (ExcelJS): Watch inventory, wear logs, all data export.
- Manage users: Edit roles, add/remove allowed users.
- Feature toggles per collection type.
- Usage analytics with charts.

### Other Pages
- **FAQ** (`/faq`): Accordion-based FAQ.
- **About** (`/about`): App info, version, credits.
- **Trade Rules** (`/trade-rules`): Rules and disclaimer for the trading feature.

---

## Data Model (Supabase PostgreSQL)

### Core Tables

**profiles**
- `id` (uuid, FK to auth.users)
- `username`, `full_name`, `avatar_url`
- `created_at`, `updated_at`

**collections**
- `id`, `name`, `collection_type` (enum: 'watches'), `created_by` (FK profiles), `created_at`, `updated_at`

**watches**
- `id`, `brand`, `model`, `dial_color`, `type` (Diver/Dress/Field/Pilot/Racing/Sport/Tool/Casual)
- `cost`, `msrp`, `average_resale_price`
- `status` (active/sold/traded), `sort_order`
- `collection_id` (FK collections), `user_id` (FK profiles)
- `ai_image_url` (AI-generated reference photo URL)
- `available_for_trade` (boolean)
- `when_bought`, `why_bought`, `what_i_like`, `what_i_dont_like` (personal notes)
- `case_size`, `lug_to_lug_size`, `movement`, `has_sapphire`, `caseback_material`
- `warranty_date`, `warranty_card_url`
- `sentiment`, `sentiment_analyzed_at`
- `rarity` (common/uncommon/rare/very_rare/grail), `historical_significance` (regular/notable/historically_significant)
- `metadata_analyzed_at`, `metadata_analysis_reasoning`
- `created_at`, `updated_at`

**watch_specs** (extended specs — 1:1 with watches)
- `id`, `watch_id` (FK watches)
- `price`, `movement`, `power_reserve`, `crystal`, `case_material`, `case_size`, `lug_to_lug`, `water_resistance`, `caseback`, `band`

**wear_entries**
- `id`, `watch_id` (FK watches), `user_id` (FK profiles)
- `wear_date` (date), `days` (integer, typically 1), `notes`
- `created_at`

**water_usage**
- `id`, `watch_id` (FK watches), `user_id`
- `usage_date`, `depth_meters`, `duration_minutes`, `notes`

**trips**
- `id`, `user_id`, `start_date`, `location`, `days`, `purpose`, `notes`
- Linked watches via JSON or junction table.

**events**
- `id`, `user_id`, `start_date`, `location`, `days`, `purpose`
- Linked watches via JSON.

### Social Tables

**friendships**
- `id`, `user_id`, `friend_id`, `status` (pending/accepted/declined), `created_at`

**conversations** (DM)
- `id`, `user1_id`, `user2_id`, `created_at`, `updated_at`

**messages**
- `id`, `conversation_id` (FK conversations), `sender_id`, `content`, `read`, `created_at`

**forum_posts**
- `id`, `user_id`, `title`, `content`, `category`, `image_url`, `is_pinned`, `created_at`, `updated_at`

**post_comments**
- `id`, `post_id` (FK forum_posts), `user_id`, `content`, `parent_comment_id` (for nesting), `created_at`

**post_votes** / **comment_votes**
- `id`, `post_id`/`comment_id`, `user_id`, `vote_type` (+1/-1)

**mentions**
- `id`, `post_id`/`comment_id`, `mentioned_user_id`, `mentioner_user_id`, `read`, `created_at`

### AI & Insights Tables

**vault_pal_conversations**
- `id`, `user_id`, `title`, `created_at`, `updated_at`

**vault_pal_messages**
- `id`, `conversation_id` (FK vault_pal_conversations), `role` (user/assistant), `content`, `created_at`

**collection_insights**
- `id`, `user_id`, `insights` (text), `created_at`, `updated_at`

**collection_gap_suggestions**
- `id`, `user_id`, `brand`, `model`, `dial_colors`, `notes`, `rank`

### Admin Tables

**allowed_users**: `id`, `email`, `notes`, `added_by`, `added_at`
**registration_requests**: `id`, `email`, `first_name`, `last_name`, `reason`, `status`, `created_at`
**access_logs**: `id`, `user_id`, `user_email`, `action`, `page`, `ip_address`, `user_agent`, `details`, `created_at`
**collection_feature_toggles**: `id`, `collection_type`, `feature_key`, `feature_name`, `is_enabled`
**feedback**: `id`, `user_id`, `type`, `content`, `status`, `created_at`
**login_history**: `id`, `user_id`, `success`, `ip_address`, `user_agent`, `created_at`

### Wishlist & Lists

**wishlist_items**: `id`, `user_id`, `brand`, `model`, `notes`, `priority`, `created_at`
**user_lists**: `id`, `user_id`, `name`, `description`, `created_at`
**list_items**: `id`, `list_id` (FK user_lists), `watch_id` (FK watches)

---

## Supabase Edge Functions

1. **identify-watch-from-photo**: Receives base64 image, uses AI vision to identify the watch brand/model/reference/dial_color/type/movement/case_size. Returns identification data.
2. **analyze-collection**: Receives user's watch array, generates AI insights about collection patterns, gaps, and style profile.
3. **vault-pal-chat**: Receives user message + collection context, returns AI assistant response.
4. **delete-user**: Admin or self-delete function that cascades deletion of all user data.
5. **analyze-watch-metadata**: AI analysis for rarity and historical significance classification.

---

## Mobile-Specific Improvements to Implement

### 1. Gesture Navigation
- Swipe right from the left edge to go back (on detail pages).
- Swipe down on modals/dialogs to dismiss (already handled by `vaul` Drawer).
- Long-press on watch cards to show quick-action context menu (View, Log Wear, Edit, Trade, Delete).

### 2. Optimized Touch Interactions
- All buttons must have `min-h-[44px] min-w-[44px]`.
- Tags/pills should have `py-2 px-4` minimum padding for easy tapping.
- Date picker should use a native-feeling mobile date selector.
- Use sheet/drawer pattern instead of dropdown menus on mobile.

### 3. Camera & Photo UX
- The wrist check photo capture should open the camera directly (not file picker) using `capture="environment"`.
- Show a quick animation when the AI identification succeeds.
- Allow pinch-to-zoom on watch photos in the detail view.

### 4. Offline Resilience
- Cache the watch collection data locally for instant display on return visits.
- Queue wear entries when offline and sync when reconnected.
- Show a subtle "offline" indicator in the header when disconnected.

### 5. Notification-Ready Architecture
- Design the notification badge system on the Feed tab to accept push notification counts.
- Structure trade notifications and friend requests as a notification center accessible from the Feed tab.

### 6. Watch Case Display (Signature Feature)
The collection grid should look and feel like opening a physical watch case:
- Outer frame: Gradient from dark wood/leather tones. Subtle top-edge highlight for "glass lid" effect.
- Inner lining: Velvet-like gradient with a fine texture overlay (subtle dot pattern at 3% opacity).
- Each watch "compartment": 3D perspective with radial cushion glow behind the watch image. Glass reflection overlay that appears on hover/tap. Drop shadow that deepens on interaction.
- Nameplate: Frosted glass strip at the bottom of each card with brand, model, days worn, and view icon.
- CSS variables for theming: `--watch-case-frame-start`, `--watch-case-frame-end`, `--watch-velvet-start`, `--watch-velvet-end`, `--watch-cushion-glow`, `--watch-case-shadow`, `--watch-case-top`, `--watch-case-bottom`.

### 7. Quick Add Wear Shortcut
- On the Home page, tapping a watch card in "Your Week" should show a bottom sheet with "Log today" as a one-tap action.
- "Quick Add Wear" dialog: Pre-selects the watch and today's date. Just tap to confirm.

### 8. Mobile Chat (Vault Assistant) Improvements
- Full-screen chat experience with keyboard-aware scroll.
- Voice input button prominently placed next to the text input.
- Suggested questions should be swipeable horizontal pills instead of wrapped buttons.
- Auto-resize textarea that grows with content (max 3 lines).

### 9. Loading & Transition Polish
- Page transitions: Subtle fade-in (not full-page slide).
- Card entrances: Staggered `opacity: 0 → 1` with slight `y: 20 → 0` movement.
- Button feedback: `whileTap={{ scale: 0.98 }}` on primary actions.
- Skeleton placeholder for the watch case grid while loading.

### 10. Accessibility
- All images must have alt text (`${brand} ${model}`).
- Focus states must be visible.
- Color contrast must meet WCAG AA standards (especially in light mode).
- Screen reader labels on icon-only buttons (`aria-label`).

---

## Security

- **Row Level Security (RLS)**: All Supabase tables must have RLS policies. Users can only read/write their own data. Admins have broader access via `is_admin` role check.
- **Passcode Verification**: Sensitive actions (view cost, delete watch, delete wear entry) require a passcode/PIN verification before proceeding. Use a PasscodeContext that tracks verification state with a timeout.
- **Input Sanitization**: All user inputs rendered in the UI must be sanitized to prevent XSS.
- **Rate Limiting**: Edge functions should implement basic rate limiting for AI features.

---

## Summary of Routes

| Route | Component | Layout | Auth Required |
|-------|-----------|--------|---------------|
| `/auth` | Auth | None | No |
| `/` | Home | AppLayout (bottom nav) | Yes |
| `/log` | Log | AppLayout | Yes |
| `/feed` | Feed | AppLayout | Yes |
| `/profile` | Profile | AppLayout | Yes |
| `/vault-pal` | VaultPal | AppLayout | Yes |
| `/watch/:id` | WatchDetail | Standalone | Yes |
| `/settings` | Settings | AppLayout | Yes |
| `/admin` | Admin | Standalone | Yes (admin) |
| `/faq` | FAQ | AppLayout | Yes |
| `/about` | About | AppLayout | Yes |
| `/trade-rules` | TradeRules | AppLayout | Yes |

---

## Key Implementation Notes

1. **Start with the mobile layout first**. The bottom navigation + main content area is the primary experience. Desktop sidebar is secondary.
2. **The Watch Case Grid is the hero feature**. Invest time in the velvet/glass/3D card effects. This is what makes the app feel premium.
3. **The Log (Wrist Check) page is the most-used screen**. It must be fast, frictionless, and satisfying. One-tap logging after selecting a watch.
4. **AI features (photo identification, collection insights, Vault Assistant) are differentiators**. Wire them up via Supabase Edge Functions with graceful fallbacks if they fail.
5. **Social features (Feed, Messages, Trade) are secondary** to the core collection management. Build them as a growth layer.
6. **All dialogs on mobile should use the Drawer (vaul) pattern** — sliding up from the bottom with a drag handle, not centered modals that float awkwardly.
7. **Test on actual mobile devices frequently**. Pay attention to: keyboard overlap on forms, safe-area insets, scroll momentum, and touch responsiveness.
