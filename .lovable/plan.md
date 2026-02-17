

# Legal and Risk Boundaries -- Gap Analysis and Hardening Plan

## Current State

Most of the legal and risk boundary requirements are **already implemented**:

- **Trade Rules page** (`/trade-rules`) -- contains core rules, prohibited behaviors, trust framework, and escalation warnings
- **First-trade disclaimer dialog** -- shown before first trade connection via `TradeDisclaimerDialog`, stored in localStorage
- **Persistent chat footer** -- `TradeChatDisclaimer` shown in every trade chat with link to rules
- **`trade_guidelines_acknowledgments` table** -- exists in database (though currently unused by the dialog)
- **No price fields, no "For Sale" toggle, no global trade feed** -- none of these exist in the UI
- **No sorting by value/desirability** in trade discovery

## Gaps to Address

### 1. Disclaimer acknowledgment uses localStorage, not the database

The `useTradeDisclaimer` hook stores acknowledgment in `localStorage` only. The `trade_guidelines_acknowledgments` database table exists but is never written to. This means acknowledgment is lost on device change or cache clear, and admins have no visibility into who has acknowledged.

**Fix:** Write to the database table on acknowledgment and check it on load, falling back to localStorage for offline/speed.

### 2. Banned terminology audit -- minor violations in edge functions

The edge functions `fetch-watch-price` and `search-watch-info` reference "marketplace" and "resale" in their AI prompts sent to external models. These are backend-only and never shown to users, so they are safe from a UI perspective. No user-facing UI contains banned terms ("Buy", "Sell", "Marketplace", "Listing", "Auction").

**No changes needed** -- backend prompts are internal and not user-facing.

### 3. Trade Rules page missing the "Platform Role" section

The current `/trade-rules` page covers rules, prohibitions, and trust levels but does not explicitly state what the platform **is** and **is not** (the "Platform Role" section from your spec).

**Fix:** Add a "Platform Role" card at the top of the Trade Rules page listing what the platform is not (broker, escrow, authenticator, insurer, payment processor) and what it is (social discovery and signaling tool).

### 4. Trade Rules page missing the "Language Enforcement" section

The banned/approved terminology list is not shown to users on the rules page.

**Fix:** Add a "Language Standards" section to the Trade Rules page showing banned terms and approved alternatives.

### 5. Missing "Liability Minimization" transparency section

Users are not explicitly told that the platform stores no prices, transaction records, payments, or shipping data.

**Fix:** Add a brief "What We Don't Store" section to the Trade Rules page for transparency.

## Implementation Details

### Files Modified

- **`src/components/TradeDisclaimerDialog.tsx`** -- Update `useTradeDisclaimer` to read/write from the `trade_guidelines_acknowledgments` database table in addition to localStorage
- **`src/pages/TradeRules.tsx`** -- Add three new sections:
  1. "Platform Role" card (is / is not)
  2. "Language Standards" section (banned and approved terms)
  3. "What We Don't Store" transparency section

### No Database Changes Required

The `trade_guidelines_acknowledgments` table already exists with `user_id` and `acknowledged_at` columns. Just needs to be used.

### No New Files

All changes fit within existing components.

