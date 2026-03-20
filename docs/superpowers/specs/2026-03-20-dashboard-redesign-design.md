# Phase 0: Dense Dashboard Redesign

## Overview

Redesign the stock-dash summary view into a dense, information-rich dashboard that serves as the application hub. The goal is to fill the "prosumer gap" between beginner apps (Robinhood) and expensive professional tools (Bloomberg/TradingView Premium) by combining Bloomberg-level information density with Apple-level design quality.

**Target user:** The "serious hobbyist" investor who picks 5-10 stocks a year and wants a single-tab morning market check.

**Core principle:** One screen, zero scrolling. Everything the user needs to assess the market and their positions is visible on first load.

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

**What changes:**
- The Toolbar's view switcher (Summary / Top Movers / Grid / Heatmap tabs) is removed
- Header and Toolbar merge into a single slim bar
- SummaryView is replaced by the new Dashboard component
- TopMoversView, GridView, HeatmapView remain as full-page expansion targets
- StockDetail remains unchanged (full-page navigation on stock click)

**What stays the same:**
- StockDetail page and all its 54 metrics
- Server API endpoints and caching layer
- Data fetching hooks (usePolling, useLocalStorage)
- Theme system (dark/light)
- Sparkline, FlashCell components

### Market Switcher

The current 3-market switcher (NASDAQ-100, S&P 500, DOW 30) gains a fourth "All" option that combines all markets (~150 unique stocks). "All" is the default.

- Located in the single header bar
- Switching markets filters: heatmap, top movers, and grid data
- Watchlist is unaffected by market selection (always shows user's tickers)
- "All" merges the three symbol lists, deduplicating overlapping tickers

## Layout

### Single Header Bar

Merges the current Header and Toolbar into one slim row (~40px height).

```
┌──────────────────────────────────────────────────────────────┐
│ XTOX    [🔍 Search...]    All|NDQ|SPX|DOW    🌙  ● Open     │
└──────────────────────────────────────────────────────────────┘
```

**Left:** Logo/brand
**Center:** Expandable search (existing behavior, moved to center)
**Right:** Market switcher pills, theme toggle, market status indicator with live pulse

Changes from current:
- Header component and Toolbar component merge into one component
- Polling speed selector moves to a settings dropdown or is removed from the toolbar (can remain in a menu)
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
- **Data source:** New. Derived from existing quote data by grouping stocks by sector (sector field exists in quote data). Calculate average change % per sector.
- **Behavior:** Horizontal scrollable if needed on narrow screens. Purely informational — no click action in Phase 0.

#### 3. Market Heatmap (Hero Panel)
- **Size:** ~70% of main area width, full height of main content area
- **Content:** Top 25-30 stocks by market cap from selected market, treemap layout
- **Data source:** Existing quote data, existing squarify algorithm
- **Behavior:**
  - Click stock → navigate to StockDetail (full page)
  - Hover → show tooltip with price, change, change %, market cap
  - "See all →" link → navigate to full HeatmapView
  - Respects market switcher selection
- **Improvements over current heatmap:**
  - Fix text overlap on small rectangles (hide text below size threshold, show on hover)
  - Add hover tooltip instead of cramming all text into cells
  - Responsive sizing (use container dimensions, not fixed 1000x600 viewBox)

#### 4. Watchlist (Right Sidebar, Top)
- **Size:** ~30% of main area width, ~50% of sidebar height
- **Content:** User's watchlisted tickers with symbol, mini sparkline, and change %
- **Data source:** Existing watchlist from localStorage + existing quote/chart data
- **Behavior:**
  - Click stock → navigate to StockDetail
  - [+] button → inline search to add ticker (existing behavior)
  - Hover row → show remove (x) button
  - Not affected by market switcher
- **Improvements over current watchlist:**
  - Fix cross-market fetch bug (currently falls back to DOW quotes)
  - Use a dedicated `/api/quote/:symbol` endpoint for individual tickers not in current market
  - Show company name alongside symbol

#### 5. Top Movers (Right Sidebar, Bottom)
- **Size:** ~30% of main area width, ~50% of sidebar height
- **Content:** Top 5 gainers + Top 5 losers by change % from selected market
- **Data source:** Existing quote data, sorted by changePercent
- **Behavior:**
  - Click stock → navigate to StockDetail
  - "See all →" link → navigate to full TopMoversView
  - Respects market switcher selection
- **Display:** Split into GAINERS and LOSERS sections with clear visual separation

#### 6. News Strip
- **Height:** ~36px
- **Content:** 3-5 latest headlines in a horizontal ticker-style layout
- **Data source:** Existing `/api/news/:market` endpoint
- **Behavior:**
  - Click headline → open article in new tab (existing behavior)
  - "See all →" link → navigate to full news view (new view, or expand in-page)
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
├── SectorStrip.tsx         # Sector performance strip (new feature)
├── DashboardHeatmap.tsx    # Compact heatmap for dashboard (wraps existing squarify logic)
├── DashboardWatchlist.tsx  # Compact watchlist for dashboard
├── DashboardMovers.tsx     # Compact movers for dashboard
├── NewsStrip.tsx           # Horizontal news ticker
```

### Modified Components
- **App.tsx:** Remove view switcher logic. Dashboard is the default view. "See all" navigations render full views. Market switcher gains "all" option.
- **Header.tsx:** Deprecated, replaced by HeaderBar.tsx
- **Toolbar.tsx:** Deprecated, replaced by HeaderBar.tsx
- **SummaryView.tsx:** Deprecated, replaced by Dashboard.tsx
- **HeatmapView.tsx:** Kept as full-view expansion target. Fix text overlap and add responsive sizing.

### Unchanged Components
- StockDetail.tsx (and StockDetail.css)
- StockChart.tsx
- Sparkline.tsx
- FlashCell.tsx
- GridView.tsx (kept as expansion target, accessible from heatmap "See all")
- TopMoversView.tsx (kept as expansion target)

### Removed Functionality
- View switcher tabs (Summary / Top Movers / Grid / Heatmap)
- Polling speed selector from main toolbar (move to settings/menu if needed)
- Separate Header and Toolbar components

## Data Flow

### New: Sector Performance Data

Sector data is derived client-side from existing quote data:

```typescript
interface SectorPerformance {
  sector: string;
  changePercent: number;  // average of all stocks in sector
  stockCount: number;
}
```

Computed by grouping quotes by their `sector` field and averaging `changePercent`. Recalculated on each polling update.

### New: "All" Market Option

When "All" is selected:
- Fetch quotes from all three markets: `/api/quotes/nasdaq`, `/api/quotes/sp500`, `/api/quotes/dow`
- Deduplicate by symbol (some stocks appear in multiple indices)
- Merge into single array for heatmap, movers, and grid consumption

### New: Individual Quote Endpoint

Add `/api/quote/:symbol` to the server for fetching single stock quotes not in any predefined market list. Used by the watchlist for arbitrary tickers.

### Existing Data Unchanged
- Quote polling via usePolling hook
- Index data via `/api/indices`
- News via `/api/news/:market`
- Chart data via `/api/chart/:symbol`
- All caching behavior remains the same

## Responsive Behavior

### Desktop (>1200px)
Full layout as described. Heatmap hero + sidebar.

### Tablet (768px-1200px)
- Sidebar stacks below heatmap instead of beside it
- Layout becomes: Index strip → Sector strip → Heatmap (full width) → Watchlist + Movers side by side → News strip

### Mobile (<768px)
- Single column stack: Index strip → Sector strip (scrollable) → Heatmap (full width, shorter) → Watchlist → Movers → News
- Header bar: logo + hamburger menu (search, market switcher, theme in menu)

## Error Handling

- **Failed quote fetch:** Show last cached data with a subtle "stale data" indicator (dimmed timestamp)
- **Empty watchlist:** Show "Add stocks to your watchlist" prompt with search input
- **No movers data:** Show skeleton loader, then "Market data loading..." if persistent
- **News fetch failure:** Hide news strip entirely (non-critical panel)
- **Connection loss:** Existing banner behavior preserved

## Performance Considerations

- **Memoize sector calculations** with useMemo keyed on quote data reference
- **Memoize heatmap layout** (squarify) to avoid recalculation on every render
- **Limit dashboard heatmap** to top 25-30 stocks (fewer SVG elements than full view)
- **Batch "All" market fetches** — fetch all three markets in parallel with Promise.all
- **Debounce hover tooltips** on heatmap to reduce re-renders

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
