# Phase 0: Dense Dashboard Redesign

## Overview

Redesign the stock-dash summary view into a dense, information-rich dashboard that serves as the application hub. The goal is to fill the "prosumer gap" between beginner apps (Robinhood) and expensive professional tools (Bloomberg/TradingView Premium) by combining Bloomberg-level information density with Apple-level design quality.

**Target user:** The "serious hobbyist" investor who picks 5-10 stocks a year and wants a single-tab morning market check.

**Core principle:** One screen, zero scrolling. Everything the user needs to assess the market and their positions is visible on first load. Individual panels scroll internally when content overflows.

## Architecture

### Navigation Model: Dashboard Hub

The dashboard replaces the current multi-view architecture (Summary, Top Movers, Grid, Heatmap) with a single hub view. Individual views become expansion targets accessed via "See all" links on dashboard panels.

**Navigation flow:**
```
Dashboard (hub)
├── "See all" → Full Heatmap View
├── "See all" → Full Watchlist View
├── "See all" → Full Top Movers View
├── "See all" → Full News View
├── Stock click → Full-page StockDetail (existing, unchanged)
└── Market switcher filters all panels simultaneously
```

### Navigation State

The current app uses a `view` state variable and `selectedStock` state variable in App.tsx (no router). This model extends with one new state:

```typescript
type View = 'dashboard' | 'heatmap' | 'movers' | 'grid' | 'watchlist' | 'news';
```

- `'dashboard'` is the default and replaces `'summary'`
- `'heatmap'`, `'movers'`, `'grid'` are existing full-page views reached via "See all" links
- `'watchlist'` and `'news'` are new full-page views reached via "See all" links
- `selectedStock` continues to work as-is for StockDetail navigation
- A **back button** appears in the header bar when `view !== 'dashboard'`, returning to `'dashboard'`
- No router is introduced in Phase 0 — state-driven navigation remains

When in an expanded view, the header bar stays identical except a `← Dashboard` back button appears to the left of the logo.

**What changes:**
- The Toolbar's view switcher (Summary / Top Movers / Grid / Heatmap tabs) is removed
- Header and Toolbar merge into a single slim bar
- SummaryView is replaced by the new Dashboard component
- TopMoversView, GridView, HeatmapView remain as full-page expansion targets
- Two new full-page views: WatchlistView, NewsView
- StockDetail remains unchanged (full-page navigation on stock click)
- New server endpoint: `/api/quotes/all` and `/api/quote/:symbol`

**What stays the same:**
- StockDetail page and all its 54 metrics
- Existing server API endpoints (new ones are additive)
- useLocalStorage hook
- Theme system (dark/light)
- Sparkline, FlashCell components

### Market Switcher

The current 3-market switcher (NASDAQ-100, S&P 500, DOW 30) gains a fourth "All" option that combines all markets (~150 unique stocks). "All" is the default.

- Located in the single header bar as pills/tabs
- Switching markets filters: heatmap, top movers, sector strip, and grid data
- Watchlist is unaffected by market selection (always shows user's tickers)
- "All" is handled server-side via a new `/api/quotes/all` endpoint (see API Changes)
- When "All" is selected, search filters against the full merged quote array

## API Changes

### New: `/api/quotes/all`

Merges quotes from all three markets server-side, deduplicates by symbol, and caches as a single entry.

```
GET /api/quotes/all
Response: Quote[] (same shape as /api/quotes/:market)
Cache TTL: 10 seconds (same as individual markets)
```

**Implementation:** On first request (or cache miss), fetch all three symbol lists, merge and deduplicate into ~150 unique symbols, then fetch quotes using the existing `fetchQuotes()` batching logic. Cache the merged result. This avoids the client fetching three endpoints and tripling API load.

**Rate limit mitigation:** ~150 symbols at 10 per batch with 300ms delays = ~4.5 seconds. The minimum polling interval when "All" is selected should be 10 seconds (enforced client-side). The server cache ensures only one fetch cycle runs at a time via the existing stale-while-revalidate pattern.

### New: `/api/quote/:symbol`

Fetches a single stock quote for arbitrary tickers (used by watchlist for stocks not in any market list).

```
GET /api/quote/:symbol
Response: Quote (same shape as individual items in /api/quotes/:market)
Cache TTL: 10 seconds
```

**Implementation:** Call `yahooFinance.quote(symbol)` and run through existing `mapQuote()`. Also map `shortName` for company name display. Cache by symbol.

### Modified: `mapQuote()` function

Add two new fields to the mapping:

```javascript
function mapQuote(q) {
  return {
    // ... existing fields ...
    shortName: q.shortName,   // Company name (e.g., "Apple Inc.")
    sector: q.sector,         // Sector (if available from quote)
  };
}
```

**Note on sector data:** Yahoo Finance's `quote()` module does NOT reliably return `sector`. See the Sector Strip section for how this is handled.

### Modified: Quote type

```typescript
export interface Quote {
  // ... existing fields ...
  shortName?: string;
  sector?: string;
}

export type Market = 'nasdaq' | 'sp500' | 'dow' | 'all';
export type View = 'dashboard' | 'heatmap' | 'movers' | 'grid' | 'watchlist' | 'news';
```

## Layout

### Single Header Bar

Merges the current Header and Toolbar into one row (~46px height).

```
┌──────────────────────────────────────────────────────────────┐
│ XTOX    [🔍 Search...]    All|NDQ|SPX|DOW    🌙  ● Open     │
└──────────────────────────────────────────────────────────────┘
```

**Left:** Logo/brand (and `← Dashboard` back button when in expanded view)
**Center:** Expandable search — when expanded, overlays adjacent elements rather than pushing them. Filters against current market's quote array (all ~150 when "All" is selected).
**Right:** Market switcher pills, theme toggle, market status indicator with live pulse

Changes from current:
- Header component and Toolbar component merge into one component
- Polling speed selector removed from toolbar (hardcoded to 10s default, or moved to a future settings panel)
- View switcher tabs are removed entirely

### Dashboard Layout: Heatmap Hero + Sidebar

```
┌──────────────────────────────────────────────────────────────┐
│                        HEADER BAR                            │
├──────────────────────────────────────────────────────────────┤
│ S&P 500  5,234 +0.82% ~~  │  NASDAQ 18,102 +1.24% ~~  │ ...│  ← Index Strip
├──────────────────────────────────────────────────────────────┤
│ Tech +1.4%  Health -0.6%  Finance +0.9%  Energy -1.2%  ...  │  ← Sector Strip
├────────────────────────────────────────┬─────────────────────┤
│                                        │ WATCHLIST    [+]    │
│                                        │ AAPL    ~~ +1.2%   │
│           MARKET HEATMAP               │ NVDA    ~~ +3.4%   │
│          [See all →]                   │ TSLA    ~~ -2.1%   │
│                                        │ MSFT    ~~ +0.5%   │
│    ┌────┬────┬────┬───┐               │                     │
│    │AAPL│MSFT│NVDA│...│               ├─────────────────────┤
│    │+1.2│+0.5│+3.4│   │               │ TOP MOVERS [All →]  │
│    ├────┤    ├────┤   │               │ GAINERS             │
│    │AMZN│    │META│   │               │ SMCI       +8.4%   │
│    │+0.8│    │-1.8│   │               │ MRVL       +5.2%   │
│    ├────┼────┼────┼───┤               │ AMD        +4.1%   │
│    │JPM │TSLA│GOOG│UNH│               │ LOSERS              │
│    └────┴────┴────┴───┘               │ PEP        -3.2%   │
│                                        │ KO         -2.8%   │
├────────────────────────────────────────┴─────────────────────┤
│ NEWS  Fed signals rate cut... │ NVIDIA beats Q4... │ [All →] │  ← News Strip
└──────────────────────────────────────────────────────────────┘
```

### Panel Specifications

#### 1. Index Strip
- **Height:** ~44px
- **Content:** S&P 500, NASDAQ, DOW 30 — each showing name, price, change %, and inline sparkline
- **Data source:** Existing `/api/indices` endpoint
- **Behavior:** Always visible, not affected by market switcher. Click an index → no navigation (informational only).

#### 2. Sector Performance Strip
- **Height:** ~32px
- **Content:** 11 GICS sectors with daily % change, color-coded (green/red)
- **Data source:** New server endpoint required.
- **Implementation approach:** Yahoo Finance's `quote()` does not reliably return sector data. Instead, create a static sector mapping in `server/sectors.js` that maps each of the ~150 stock symbols to their GICS sector. This is a one-time manual mapping (sectors rarely change). The server exposes a new endpoint:

```
GET /api/sectors
Response: SectorPerformance[]
Cache TTL: 30 seconds
```

The server groups the current market's quotes by sector using the static mapping, then calculates average `changePercent` per sector.

```typescript
interface SectorPerformance {
  sector: string;
  changePercent: number;
  stockCount: number;
}
```

- **Behavior:** Horizontal scrollable on narrow screens. Purely informational — no click action in Phase 0.
- **Fallback:** If the endpoint fails, hide the sector strip entirely (non-critical).

#### 3. Market Heatmap (Hero Panel)
- **Size:** ~70% of main area width, fills available height in main content area
- **Content:** Top 25-30 stocks by market cap from selected market, treemap layout. Stocks without `marketCap` are excluded (same as current behavior).
- **Data source:** Existing quote data, existing squarify algorithm
- **Behavior:**
  - Click stock → navigate to StockDetail (full page)
  - Hover → show tooltip with symbol, company name, price, change, change %, market cap
  - "See all →" link → navigate to full HeatmapView (`view = 'heatmap'`)
  - Respects market switcher selection
- **Improvements over current heatmap:**
  - Fix text overlap on small rectangles (hide text below size threshold, show on hover only)
  - Add hover tooltip instead of cramming all text into cells
  - Responsive sizing (use container ref dimensions, not fixed 1000x600 viewBox)
- **Note:** These improvements are independent fixes that can be separate PRs within Phase 0 work.

#### 4. Watchlist (Right Sidebar, Top)
- **Size:** ~30% of main area width, ~50% of sidebar height
- **Max items visible:** 8 stocks. Internal scroll if more. Shows total count in header (e.g., "WATCHLIST (12)").
- **Content:** User's watchlisted tickers with symbol, shortName, mini sparkline, and change %
- **Data source:** Existing watchlist from localStorage. Quote data comes from current market quotes if the ticker is present, otherwise fetched via `/api/quote/:symbol`.
- **Behavior:**
  - Click stock → navigate to StockDetail
  - [+] button → inline search to add ticker (existing behavior)
  - Hover row → show remove (x) button
  - Not affected by market switcher
  - "See all →" link → navigate to full WatchlistView (`view = 'watchlist'`)
- **Bug fix:** Replace the current DOW fallback fetch with batched `/api/quote/:symbol` calls for tickers not in the current market's quote array.

#### 5. Top Movers (Right Sidebar, Bottom)
- **Size:** ~30% of main area width, ~50% of sidebar height
- **Content:** Top 5 gainers + Top 5 losers by change % from selected market
- **Data source:** Existing quote data, sorted by changePercent
- **Behavior:**
  - Click stock → navigate to StockDetail
  - "See all →" link → navigate to full TopMoversView (`view = 'movers'`)
  - Respects market switcher selection
- **Display:** Split into GAINERS and LOSERS sections with clear visual separation

#### 6. News Strip
- **Height:** ~36px
- **Content:** 3-5 latest headlines in a horizontal layout
- **Data source:** Existing `/api/news/:market` endpoint. When market is "All", fetch `/api/news/nasdaq` (NASDAQ has the broadest tech/growth coverage). This is a pragmatic choice — merging news from all three markets is deferred.
- **Behavior:**
  - Click headline → open article in new tab (existing behavior)
  - "See all →" link → navigate to full NewsView (`view = 'news'`)
  - Headlines separated by dividers, truncated with ellipsis

## Component Architecture

### New Components

```
src/components/
├── Dashboard.tsx          # Main dashboard layout (replaces SummaryView)
├── Dashboard.css          # Dashboard styles
├── HeaderBar.tsx           # Merged header+toolbar (replaces Header + Toolbar)
├── HeaderBar.css           # HeaderBar styles
├── IndexStrip.tsx          # Index cards strip
├── SectorStrip.tsx         # Sector performance strip
├── DashboardHeatmap.tsx    # Compact heatmap for dashboard (wraps existing squarify logic)
├── DashboardWatchlist.tsx  # Compact watchlist for dashboard
├── DashboardMovers.tsx     # Compact movers for dashboard
├── NewsStrip.tsx           # Horizontal news ticker
├── NewsView.tsx            # Full-page news view (expansion target)
├── NewsView.css
├── WatchlistView.tsx       # Full-page watchlist view (expansion target)
├── WatchlistView.css
```

### Modified Components
- **App.tsx:** Remove view switcher logic. Dashboard is the default view. "See all" navigations set `view` state. Market type gains `'all'` option. The `usePolling` hook call changes: when market is `'all'`, fetch from `/api/quotes/all`; otherwise fetch from `/api/quotes/${market}` as before. Quotes are passed as props to Dashboard and all expanded views.
- **Header.tsx:** Deprecated, replaced by HeaderBar.tsx
- **Toolbar.tsx:** Deprecated, replaced by HeaderBar.tsx
- **SummaryView.tsx:** Deprecated, replaced by Dashboard.tsx
- **HeatmapView.tsx:** Kept as full-view expansion target. Apply text overlap fix and responsive sizing.
- **types.ts:** Update Market and View types, add shortName and sector to Quote.

### Unchanged Components
- StockDetail.tsx (and StockDetail.css)
- StockChart.tsx
- Sparkline.tsx
- FlashCell.tsx
- GridView.tsx (kept as expansion target)
- TopMoversView.tsx (kept as expansion target)

### Removed Functionality
- View switcher tabs (Summary / Top Movers / Grid / Heatmap)
- Polling speed selector from main toolbar (hardcode 10s default)
- Separate Header and Toolbar components

## Data Flow

### usePolling Hook Changes

The `usePolling` hook currently accepts a `Market` value and fetches `/api/quotes/${market}`. It is modified to:

- Accept `'all'` as a market value
- When market is `'all'`, fetch from `/api/quotes/all` (the new server endpoint)
- When market is anything else, fetch from `/api/quotes/${market}` (unchanged)
- Enforce minimum 10s polling interval when market is `'all'` (client-side check)
- Return type remains `Quote[]` — the merged/deduplicated array from the server

This keeps the hook's interface simple. The server handles all merging and deduplication.

### Data Plumbing to Expanded Views

All expanded views receive their data from App.tsx via props, same as today:

- `quotes: Quote[]` — the current market's quotes (or merged "All" quotes)
- `market: Market` — the current market selection
- Expanded views do NOT re-fetch; they use the same polled data
- This is the existing pattern (GridView, HeatmapView, TopMoversView already receive quotes as props)

### Sector Performance Data

Fetched client-side from the new `/api/sectors` endpoint. The Dashboard component fetches this independently of the quote polling. Refreshed every 30 seconds.

### Watchlist Data

Watchlist quote data is resolved in DashboardWatchlist:
1. For each watchlist symbol, check if it exists in the current `quotes` array
2. If found, use that data
3. If not found, fetch via `/api/quote/:symbol` and cache locally in component state
4. On polling updates, repeat step 1-2 (step 3 results are cached until component unmounts)

## Responsive Behavior

### Desktop (>1200px)
Full layout as described. Heatmap hero + sidebar.

### Tablet (768px-1200px)
- Sidebar stacks below heatmap instead of beside it
- Layout becomes: Index strip → Sector strip → Heatmap (full width) → Watchlist + Movers side by side → News strip

### Mobile (<768px)
- Single column stack: Index strip → Sector strip (scrollable) → Heatmap (full width, shorter) → Watchlist → Movers → News
- Header bar: logo and market status visible. Search, market switcher, and theme toggle collapse behind a hamburger icon that opens a dropdown menu.
- Hamburger menu is a simple absolutely-positioned dropdown (not a full-screen overlay). Contains: search input, market pills, theme toggle.

## Error Handling

- **Failed quote fetch:** Show last cached data with a subtle "stale data" indicator (dimmed timestamp)
- **Empty watchlist:** Show "Add stocks to your watchlist" prompt with search input
- **No movers data:** Show skeleton loader, then "Market data loading..." if persistent
- **Sector strip failure:** Hide sector strip entirely (non-critical panel)
- **News fetch failure:** Hide news strip entirely (non-critical panel)
- **Individual watchlist quote failure:** Show symbol with "—" for price/change
- **Connection loss:** Existing banner behavior preserved

## Performance Considerations

- **Server-side "All" merging** avoids tripling client API calls
- **Memoize sector strip** rendering with useMemo keyed on quote data
- **Memoize heatmap layout** (squarify) to avoid recalculation on every render
- **Limit dashboard heatmap** to top 25-30 stocks (fewer SVG elements than full view)
- **Debounce hover tooltips** on heatmap to reduce re-renders
- **Enforce 10s minimum poll** for "All" market to respect Yahoo Finance rate limits
- **Cache individual watchlist quotes** in component state to avoid refetching on every render

## Out of Scope (Phase 0)

These are explicitly deferred to later phases:
- User authentication and accounts
- Portfolio tracking
- Price alerts / notifications
- Stock screener / filtering
- Stock comparison tool
- Technical indicators on charts
- Drag-and-drop widget customization
- Keyboard shortcuts (Cmd+K search)
- WebSocket real-time data (keep polling)
- Data provider migration (keep Yahoo Finance for now)
- Merged news from all markets (use NASDAQ news when "All" selected)
