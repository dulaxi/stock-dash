# Dense Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current multi-view stock dashboard with a dense, single-screen command center featuring a heatmap hero layout, merged header bar, sector strip, and dashboard-hub navigation.

**Architecture:** Dashboard-hub model where the main view is a dense single-screen layout (index strip, sector strip, heatmap hero + sidebar with watchlist/movers, news ticker). "See all" links expand panels to full-page views. Stock clicks navigate to existing full-page StockDetail. Server gains `/api/quotes/all` and `/api/quote/:symbol` endpoints.

**Tech Stack:** React 19, TypeScript, Vite, Express 5, yahoo-finance2, CSS (no new libraries)

**Spec:** `docs/superpowers/specs/2026-03-20-dashboard-redesign-design.md`

---

## File Structure

### Server Changes
- **Modify:** `server/index.js` — Add `/api/quotes/all`, `/api/quote/:symbol`, `/api/sectors` endpoints
- **Modify:** `server/symbols.js` — Export combined `ALL_SYMBOLS` array
- **Create:** `server/sectors.js` — Static GICS sector mapping for ~150 stocks

### Type Changes
- **Modify:** `src/types.ts` — Add `shortName`, `sector` to Quote; update Market and View types

### Hook Changes
- **Modify:** `src/hooks/usePolling.ts` — Support `'all'` market, enforce 10s minimum for "All"

### New Components
- **Create:** `src/components/HeaderBar.tsx` + `HeaderBar.css` — Merged header+toolbar
- **Create:** `src/components/Dashboard.tsx` + `Dashboard.css` — Main dashboard layout
- **Create:** `src/components/IndexStrip.tsx` — Index cards strip
- **Create:** `src/components/SectorStrip.tsx` — Sector performance strip
- **Create:** `src/components/DashboardHeatmap.tsx` — Compact heatmap for dashboard
- **Create:** `src/components/DashboardWatchlist.tsx` — Compact watchlist panel
- **Create:** `src/components/DashboardMovers.tsx` — Compact top movers panel
- **Create:** `src/components/NewsStrip.tsx` — Horizontal news ticker
- **Create:** `src/components/NewsView.tsx` + `NewsView.css` — Full-page news expansion
- **Create:** `src/components/WatchlistView.tsx` + `WatchlistView.css` — Full-page watchlist expansion

### Modified Components
- **Modify:** `src/App.tsx` — New navigation model, "All" market, dashboard as default view
- **Modify:** `src/components/HeatmapView.tsx` — Fix text overlap, responsive sizing, hover tooltips

### Deprecated (delete after dashboard is working)
- `src/components/Header.tsx` + `Header.css`
- `src/components/Toolbar.tsx` + `Toolbar.css`
- `src/components/SummaryView.tsx` + `SummaryView.css`
- `src/components/Watchlist.tsx` + `Watchlist.css`

---

## Task 1: Update Types and Server — Foundation

**Files:**
- Modify: `src/types.ts`
- Modify: `server/index.js`
- Modify: `server/symbols.js`
- Create: `server/sectors.js`

- [ ] **Step 1: Update types.ts**

Add `shortName` and `sector` to Quote, update Market and View types:

```typescript
export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  open?: number;
  dayHigh?: number;
  dayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  trailingPE?: number;
  shortName?: string;
  sector?: string;
}

export interface IndexQuote extends Quote {
  name: string;
}

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: string;
  thumbnail: string | null;
}

export interface SectorPerformance {
  sector: string;
  changePercent: number;
  stockCount: number;
}

export type Market = 'nasdaq' | 'sp500' | 'dow' | 'all';
export type View = 'dashboard' | 'heatmap' | 'movers' | 'grid' | 'watchlist' | 'news';
export type PollingSpeed = 5000 | 10000 | 30000;
```

- [ ] **Step 2: Update mapQuote in server/index.js**

Add `shortName` to the mapQuote function (lines 10-25):

```javascript
function mapQuote(q) {
  return {
    symbol: q.symbol,
    price: q.regularMarketPrice,
    change: q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
    volume: q.regularMarketVolume,
    marketCap: q.marketCap,
    open: q.regularMarketOpen,
    dayHigh: q.regularMarketDayHigh,
    dayLow: q.regularMarketDayLow,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow,
    trailingPE: q.trailingPE,
    shortName: q.shortName,
  };
}
```

- [ ] **Step 3: Create server/sectors.js**

Static GICS sector mapping. This maps every tracked symbol to its sector. Sectors are stable — this file rarely needs updates.

```javascript
// Static GICS sector mapping for all tracked symbols
export const SECTOR_MAP = {
  // Technology
  AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology', GOOG: 'Technology',
  GOOGL: 'Technology', META: 'Technology', AVGO: 'Technology', ADBE: 'Technology',
  CRM: 'Technology', AMD: 'Technology', INTC: 'Technology', QCOM: 'Technology',
  TXN: 'Technology', AMAT: 'Technology', MU: 'Technology', LRCX: 'Technology',
  SNPS: 'Technology', CDNS: 'Technology', KLAC: 'Technology', MRVL: 'Technology',
  ADI: 'Technology', NXPI: 'Technology', FTNT: 'Technology', PANW: 'Technology',
  CRWD: 'Technology', ON: 'Technology', SMCI: 'Technology', MCHP: 'Technology',
  GEN: 'Technology', ORCL: 'Technology', IBM: 'Technology', ACN: 'Technology',
  CSCO: 'Technology', HPQ: 'Technology', HPE: 'Technology', DELL: 'Technology',
  PLTR: 'Technology', NOW: 'Technology', INTU: 'Technology',

  // Communication Services
  NFLX: 'Communication Services', DIS: 'Communication Services',
  CMCSA: 'Communication Services', TMUS: 'Communication Services',
  VZ: 'Communication Services', T: 'Communication Services',
  CHTR: 'Communication Services', EA: 'Communication Services',
  TTWO: 'Communication Services', WBD: 'Communication Services',

  // Consumer Discretionary
  AMZN: 'Consumer Discretionary', TSLA: 'Consumer Discretionary',
  HD: 'Consumer Discretionary', MCD: 'Consumer Discretionary',
  NKE: 'Consumer Discretionary', SBUX: 'Consumer Discretionary',
  LOW: 'Consumer Discretionary', TJX: 'Consumer Discretionary',
  BKNG: 'Consumer Discretionary', MAR: 'Consumer Discretionary',
  ORLY: 'Consumer Discretionary', ROST: 'Consumer Discretionary',
  DHI: 'Consumer Discretionary', GM: 'Consumer Discretionary',
  F: 'Consumer Discretionary', ABNB: 'Consumer Discretionary',
  CMG: 'Consumer Discretionary', YUM: 'Consumer Discretionary',
  LULU: 'Consumer Discretionary',

  // Consumer Staples
  PG: 'Consumer Staples', KO: 'Consumer Staples', PEP: 'Consumer Staples',
  COST: 'Consumer Staples', WMT: 'Consumer Staples', PM: 'Consumer Staples',
  MO: 'Consumer Staples', CL: 'Consumer Staples', MDLZ: 'Consumer Staples',
  KHC: 'Consumer Staples', GIS: 'Consumer Staples', KDP: 'Consumer Staples',
  MNST: 'Consumer Staples',

  // Healthcare
  UNH: 'Healthcare', JNJ: 'Healthcare', LLY: 'Healthcare', PFE: 'Healthcare',
  ABBV: 'Healthcare', MRK: 'Healthcare', TMO: 'Healthcare', ABT: 'Healthcare',
  DHR: 'Healthcare', BMY: 'Healthcare', AMGN: 'Healthcare', GILD: 'Healthcare',
  ISRG: 'Healthcare', VRTX: 'Healthcare', REGN: 'Healthcare', MDT: 'Healthcare',
  SYK: 'Healthcare', BSX: 'Healthcare', ZTS: 'Healthcare', EW: 'Healthcare',
  MRNA: 'Healthcare', DXCM: 'Healthcare', BIIB: 'Healthcare', ILMN: 'Healthcare',
  IDXX: 'Healthcare',

  // Financials
  JPM: 'Financials', V: 'Financials', MA: 'Financials', BAC: 'Financials',
  WFC: 'Financials', GS: 'Financials', MS: 'Financials', BLK: 'Financials',
  SCHW: 'Financials', C: 'Financials', AXP: 'Financials', MMC: 'Financials',
  CB: 'Financials', PGR: 'Financials', AON: 'Financials', CME: 'Financials',
  ICE: 'Financials', MCO: 'Financials', SPGI: 'Financials', TRV: 'Financials',
  AIG: 'Financials', MET: 'Financials', PRU: 'Financials', BRK: 'Financials',

  // Industrials
  CAT: 'Industrials', HON: 'Industrials', UNP: 'Industrials', UPS: 'Industrials',
  BA: 'Industrials', RTX: 'Industrials', DE: 'Industrials', LMT: 'Industrials',
  GE: 'Industrials', MMM: 'Industrials', EMR: 'Industrials', ETN: 'Industrials',
  ITW: 'Industrials', WM: 'Industrials', RSG: 'Industrials', CSX: 'Industrials',
  NSC: 'Industrials', FDX: 'Industrials',

  // Energy
  XOM: 'Energy', CVX: 'Energy', COP: 'Energy', EOG: 'Energy',
  SLB: 'Energy', MPC: 'Energy', PSX: 'Energy', VLO: 'Energy',
  OXY: 'Energy', HAL: 'Energy',

  // Utilities
  NEE: 'Utilities', DUK: 'Utilities', SO: 'Utilities', D: 'Utilities',
  AEP: 'Utilities', SRE: 'Utilities', EXC: 'Utilities', XEL: 'Utilities',

  // Real Estate
  PLD: 'Real Estate', AMT: 'Real Estate', CCI: 'Real Estate',
  EQIX: 'Real Estate', SPG: 'Real Estate', O: 'Real Estate',
  PSA: 'Real Estate', WELL: 'Real Estate',

  // Materials
  LIN: 'Materials', APD: 'Materials', SHW: 'Materials', ECL: 'Materials',
  NEM: 'Materials', FCX: 'Materials', DOW: 'Materials', DD: 'Materials',
};
```

- [ ] **Step 4: Update server/symbols.js**

Add a combined ALL_SYMBOLS export:

```javascript
// Add at the end of symbols.js:
export const ALL_SYMBOLS = [...new Set([...NASDAQ_100, ...SP_500, ...DOW_30])];
```

- [ ] **Step 5: Add new server endpoints in server/index.js**

Add three new endpoints after the existing routes. Add import for SECTOR_MAP and ALL_SYMBOLS at the top.

**Import changes (line 3):**
```javascript
import { MARKET_MAP, INDEX_SYMBOLS, ALL_SYMBOLS } from './symbols.js';
import { SECTOR_MAP } from './sectors.js';
```

**New endpoint — `/api/quotes/all` (add after the existing `/api/quotes/:market` route):**
```javascript
app.get('/api/quotes/all', async (req, res) => {
  const key = 'quotes-all';
  const cached = cacheGet(key);
  if (cached && !cached.stale) return res.json(cached.data);
  if (cached) {
    res.json(cached.data);
    fetchQuotes(ALL_SYMBOLS).then(data => {
      const withSector = data.map(q => ({ ...q, sector: SECTOR_MAP[q.symbol] || null }));
      cacheSet(key, withSector, 10000);
    });
    return;
  }
  try {
    const data = await fetchQuotes(ALL_SYMBOLS);
    const withSector = data.map(q => ({ ...q, sector: SECTOR_MAP[q.symbol] || null }));
    cacheSet(key, withSector, 10000);
    res.json(withSector);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});
```

**New endpoint — `/api/quote/:symbol`:**
```javascript
app.get('/api/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const key = `quote-${symbol.toUpperCase()}`;
  const cached = cacheGet(key);
  if (cached && !cached.stale) return res.json(cached.data);
  try {
    const raw = await yahooFinance.quote(symbol.toUpperCase());
    const data = { ...mapQuote(raw), sector: SECTOR_MAP[symbol.toUpperCase()] || null };
    cacheSet(key, data, 10000);
    res.json(data);
  } catch (e) {
    if (cached) return res.json(cached.data);
    res.status(404).json({ error: 'Symbol not found' });
  }
});
```

**New endpoint — `/api/sectors`:**
```javascript
app.get('/api/sectors', async (req, res) => {
  const market = req.query.market || 'all';
  const key = `sectors-${market}`;
  const cached = cacheGet(key);
  if (cached && !cached.stale) return res.json(cached.data);

  // Get quotes for the requested market
  const quotesKey = market === 'all' ? 'quotes-all' : `quotes-${market}`;
  const quotesCache = cacheGet(quotesKey);
  if (!quotesCache) return res.json([]);

  const quotes = quotesCache.data;
  const sectorMap = {};
  for (const q of quotes) {
    const sector = SECTOR_MAP[q.symbol];
    if (!sector) continue;
    if (!sectorMap[sector]) sectorMap[sector] = { total: 0, count: 0 };
    sectorMap[sector].total += q.changePercent || 0;
    sectorMap[sector].count += 1;
  }

  const sectors = Object.entries(sectorMap)
    .map(([sector, { total, count }]) => ({
      sector,
      changePercent: +(total / count).toFixed(2),
      stockCount: count,
    }))
    .sort((a, b) => b.stockCount - a.stockCount);

  cacheSet(key, sectors, 30000);
  res.json(sectors);
});
```

- [ ] **Step 6: Also add sector data to existing `/api/quotes/:market` endpoint**

Modify the existing `/api/quotes/:market` handler to include sector data, same as the "all" endpoint. In the existing endpoint (around lines 44-66), after `fetchQuotes(symbols)`, map sector data:

```javascript
const withSector = data.map(q => ({ ...q, sector: SECTOR_MAP[q.symbol] || null }));
cacheSet(key, withSector, 10000);
```

- [ ] **Step 7: Verify server starts and new endpoints work**

Run: `cd /home/dula/projects/stock-dash && node server/index.js &`
Test: `curl http://localhost:3001/api/quote/AAPL | head -c 200`
Test: `curl http://localhost:3001/api/sectors | head -c 200`
Expected: JSON responses with quote data and sector data
Kill server after testing.

- [ ] **Step 8: Commit**

```bash
git add src/types.ts server/index.js server/symbols.js server/sectors.js
git commit -m "feat: add /api/quotes/all, /api/quote/:symbol, /api/sectors endpoints and update types"
```

---

## Task 2: Update usePolling Hook

**Files:**
- Modify: `src/hooks/usePolling.ts`

- [ ] **Step 1: Update usePolling to support 'all' market**

The hook currently fetches `/api/quotes/${market}`. When market is `'all'`, it should fetch `/api/quotes/all`. Also enforce 10s minimum polling for "All".

Replace the full content of `src/hooks/usePolling.ts`:

```typescript
import { useState, useEffect, useRef } from 'react';
import type { Quote, IndexQuote, Market, PollingSpeed } from '../types';

interface PollingState {
  quotes: Quote[];
  indices: IndexQuote[];
  loading: boolean;
  switching: boolean;
  error: boolean;
}

export function usePolling(market: Market, speed: PollingSpeed): PollingState {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [indices, setIndices] = useState<IndexQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState(false);
  const failCount = useRef(0);
  const initialLoad = useRef(true);

  // Enforce 10s minimum polling for "all" market
  const effectiveSpeed = market === 'all' ? Math.max(speed, 10000) as PollingSpeed : speed;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    let cancelled = false;

    if (!initialLoad.current) setSwitching(true);

    const quotesUrl = market === 'all' ? '/api/quotes/all' : `/api/quotes/${market}`;

    async function fetchData() {
      try {
        const [qRes, iRes] = await Promise.all([
          fetch(quotesUrl),
          fetch('/api/indices'),
        ]);
        if (cancelled) return;
        const qData = await qRes.json();
        const iData = await iRes.json();
        setQuotes(qData);
        setIndices(iData);
        failCount.current = 0;
        setError(false);
      } catch {
        failCount.current++;
        if (failCount.current >= 3) setError(true);
        if (initialLoad.current) {
          setTimeout(() => { if (!cancelled) fetchData(); }, 5000);
          return;
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSwitching(false);
          initialLoad.current = false;
        }
      }
    }

    fetchData();
    timer = setInterval(fetchData, effectiveSpeed);
    return () => { cancelled = true; clearInterval(timer); };
  }, [market, effectiveSpeed]);

  return { quotes, indices, loading, switching, error };
}
```

- [ ] **Step 2: Verify the app still compiles**

Run: `cd /home/dula/projects/stock-dash && npx tsc --noEmit 2>&1 | head -20`
Expected: No new type errors (existing ones may be present)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePolling.ts
git commit -m "feat: support 'all' market in usePolling with 10s minimum interval"
```

---

## Task 3: Create HeaderBar Component

**Files:**
- Create: `src/components/HeaderBar.tsx`
- Create: `src/components/HeaderBar.css`

- [ ] **Step 1: Create HeaderBar.css**

```css
.header-bar {
  display: flex;
  align-items: center;
  height: 46px;
  padding: 0 16px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-bar-logo {
  font-family: 'Tanker', sans-serif;
  font-size: 20px;
  color: var(--accent);
  letter-spacing: 2px;
  white-space: nowrap;
  cursor: pointer;
}

.header-bar-back {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--accent);
  cursor: pointer;
  background: none;
  border: none;
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

.header-bar-back:hover {
  background: var(--hover);
}

.header-bar-search {
  flex: 1;
  display: flex;
  justify-content: center;
  position: relative;
}

.header-bar-search input {
  width: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  outline: none;
  transition: width 0.25s ease, padding 0.25s ease;
}

.header-bar-search.expanded input {
  width: 240px;
  padding: 6px 12px;
  background: var(--hover);
  border-radius: 8px;
}

.header-bar-search-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
}

.header-bar-search-btn:hover {
  background: var(--hover);
}

.header-bar-search-results {
  position: absolute;
  top: 38px;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  overflow: hidden;
  z-index: 200;
}

.header-bar-search-results .search-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
}

.header-bar-search-results .search-item:hover {
  background: var(--hover);
}

.header-bar-search-results .search-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-bar-search-results .search-item-logo {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.header-bar-search-results .search-item-symbol {
  font-weight: 600;
}

.header-bar-search-results .search-item-name {
  color: var(--text-secondary);
  font-size: 11px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-bar-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-bar .pill-group {
  display: flex;
  gap: 2px;
  background: var(--hover);
  border-radius: 8px;
  padding: 2px;
}

.header-bar .pill {
  padding: 4px 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s ease;
}

.header-bar .pill.active {
  background: var(--accent);
  color: #fff;
}

.market-status {
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.market-status .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.market-status .status-dot.open { background: #34c759; }
.market-status .status-dot.pre { background: #ff9f0a; }
.market-status .status-dot.closed { background: #86868b; }

.theme-toggle {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  color: var(--text-secondary);
}

.theme-toggle:hover {
  background: var(--hover);
}
```

- [ ] **Step 2: Create HeaderBar.tsx**

```tsx
import { useState, useRef } from 'react';
import type { Market, Quote } from '../types';
import { getLogoUrl } from '../tickerDomains';
import './HeaderBar.css';

interface HeaderBarProps {
  market: Market;
  onMarketChange: (market: Market) => void;
  theme: string;
  onThemeToggle: () => void;
  marketStatus: string;
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
  view: string;
  onBackToDashboard: () => void;
}

const MARKETS: { value: Market; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'nasdaq', label: 'NDQ' },
  { value: 'sp500', label: 'SPX' },
  { value: 'dow', label: 'DOW' },
];

export default function HeaderBar({
  market, onMarketChange, theme, onThemeToggle,
  marketStatus, quotes, onSelectStock, view, onBackToDashboard,
}: HeaderBarProps) {
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = search
    ? quotes.filter(q => q.symbol.toLowerCase().startsWith(search.toLowerCase())).slice(0, 8)
    : [];

  const statusLabel = marketStatus === 'open' ? 'Market Open'
    : marketStatus === 'pre' ? 'Pre-Market' : 'Market Closed';

  return (
    <div className="header-bar">
      {view !== 'dashboard' && (
        <button className="header-bar-back" onClick={onBackToDashboard}>
          ← Dashboard
        </button>
      )}
      <div className="header-bar-logo" onClick={onBackToDashboard}>XTOX</div>

      <div className={`header-bar-search ${expanded ? 'expanded' : ''}`}>
        <button className="header-bar-search-btn" onClick={() => {
          setExpanded(!expanded);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}>🔍</button>
        <input
          ref={inputRef}
          value={search}
          onChange={e => { setSearch(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => { setShowResults(false); setExpanded(false); setSearch(''); }, 150)}
          placeholder="Search ticker..."
        />
        {expanded && showResults && results.length > 0 && (
          <div className="header-bar-search-results">
            {results.map(q => {
              const logo = getLogoUrl(q.symbol);
              return (
                <div key={q.symbol} className="search-item"
                  onMouseDown={() => { onSelectStock(q.symbol); setSearch(''); setExpanded(false); }}>
                  <div className="search-item-left">
                    {logo && <img className="search-item-logo" src={logo} alt=""
                      onError={e => (e.currentTarget.style.display = 'none')} />}
                    <span className="search-item-symbol">{q.symbol}</span>
                    {q.shortName && <span className="search-item-name">{q.shortName}</span>}
                  </div>
                  <span style={{ color: q.changePercent >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {q.changePercent >= 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="header-bar-controls">
        <div className="pill-group">
          {MARKETS.map(m => (
            <button key={m.value}
              className={`pill ${market === m.value ? 'active' : ''}`}
              onClick={() => onMarketChange(m.value)}>
              {m.label}
            </button>
          ))}
        </div>
        <button className="theme-toggle" onClick={onThemeToggle}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="market-status">
          <span className={`status-dot ${marketStatus}`} />
          {statusLabel}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /home/dula/projects/stock-dash && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors from HeaderBar

- [ ] **Step 4: Commit**

```bash
git add src/components/HeaderBar.tsx src/components/HeaderBar.css
git commit -m "feat: add HeaderBar component merging header and toolbar"
```

---

## Task 4: Create Dashboard Panel Components

**Files:**
- Create: `src/components/IndexStrip.tsx`
- Create: `src/components/SectorStrip.tsx`
- Create: `src/components/DashboardHeatmap.tsx`
- Create: `src/components/DashboardMovers.tsx`
- Create: `src/components/DashboardWatchlist.tsx`
- Create: `src/components/NewsStrip.tsx`

- [ ] **Step 1: Create IndexStrip.tsx**

```tsx
import { useState, useEffect } from 'react';
import type { IndexQuote } from '../types';
import Sparkline from './Sparkline';

interface IndexStripProps {
  indices: IndexQuote[];
}

export default function IndexStrip({ indices }: IndexStripProps) {
  const [charts, setCharts] = useState<Record<string, number[]>>({});

  useEffect(() => {
    const syms = ['^IXIC', '^GSPC', '^DJI'];
    syms.forEach(s =>
      fetch(`/api/chart/${encodeURIComponent(s)}`)
        .then(r => r.json())
        .then(data => setCharts(prev => ({ ...prev, [s]: data.map((p: { close: number }) => p.close) })))
        .catch(() => {})
    );
  }, []);

  const indexSymMap: Record<string, string> = { '^IXIC': 'NASDAQ', '^GSPC': 'S&P 500', '^DJI': 'DOW' };
  const chartSymMap: Record<string, string> = { 'NASDAQ': '^IXIC', 'S&P 500': '^GSPC', 'DOW': '^DJI' };

  return (
    <div className="index-strip">
      {indices.map(idx => {
        const chartKey = chartSymMap[idx.name] || '';
        const data = charts[chartKey] || [];
        const up = idx.changePercent >= 0;
        return (
          <div key={idx.symbol} className="index-strip-item">
            <span className="index-strip-name">{idx.name}</span>
            <span className="index-strip-price">{idx.price?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            <span className={`index-strip-change ${up ? 'up' : 'down'}`}>
              {up ? '+' : ''}{idx.changePercent?.toFixed(2)}%
            </span>
            {data.length > 1 && (
              <Sparkline data={data} width={48} height={16}
                color={up ? 'var(--green)' : 'var(--red)'} />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create SectorStrip.tsx**

```tsx
import { useState, useEffect } from 'react';
import type { SectorPerformance, Market } from '../types';

interface SectorStripProps {
  market: Market;
}

export default function SectorStrip({ market }: SectorStripProps) {
  const [sectors, setSectors] = useState<SectorPerformance[]>([]);

  useEffect(() => {
    fetch(`/api/sectors?market=${market}`)
      .then(r => r.json())
      .then(setSectors)
      .catch(() => setSectors([]));
  }, [market]);

  if (sectors.length === 0) return null;

  return (
    <div className="sector-strip">
      {sectors.map(s => (
        <span key={s.sector} className="sector-strip-item">
          <span className="sector-strip-name">{s.sector}</span>
          <span className={`sector-strip-change ${s.changePercent >= 0 ? 'up' : 'down'}`}>
            {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(1)}%
          </span>
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create DashboardHeatmap.tsx**

This wraps the squarify algorithm from HeatmapView for the dashboard panel, limited to top 25 stocks with hover tooltips.

```tsx
import { useMemo, useState, useRef, useEffect } from 'react';
import type { Quote } from '../types';

interface DashboardHeatmapProps {
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
  onSeeAll: () => void;
}

interface TreeNode {
  symbol: string; shortName?: string; price: number;
  changePercent: number; marketCap: number;
  x: number; y: number; w: number; h: number;
}

function getColor(cp: number) {
  if (cp > 3) return '#22c55e';
  if (cp > 1.5) return '#4ade80';
  if (cp > 0.5) return '#86efac';
  if (cp > 0) return '#bbf7d0';
  if (cp === 0) return '#6b7280';
  if (cp > -0.5) return '#fecaca';
  if (cp > -1.5) return '#f87171';
  if (cp > -3) return '#ef4444';
  return '#dc2626';
}

function squarify(items: { symbol: string; shortName?: string; price: number; changePercent: number; value: number }[], x: number, y: number, w: number, h: number): TreeNode[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ symbol: items[0].symbol, shortName: items[0].shortName, price: items[0].price, changePercent: items[0].changePercent, marketCap: items[0].value, x, y, w, h }];
  }
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return [];
  const horizontal = w >= h;
  let rowItems: typeof items = [];
  let rest = [...items];
  let bestRatio = Infinity;

  for (let i = 1; i <= items.length; i++) {
    const row = items.slice(0, i);
    const rowTotal = row.reduce((s, it) => s + it.value, 0);
    const rowFrac = rowTotal / total;
    const rowSize = horizontal ? w * rowFrac : h * rowFrac;
    const worstRatio = row.reduce((worst, it) => {
      const frac = it.value / rowTotal;
      const cellSize = horizontal ? h * frac : w * frac;
      const ratio = Math.max(rowSize / cellSize, cellSize / rowSize);
      return Math.max(worst, ratio);
    }, 0);
    if (worstRatio <= bestRatio) {
      bestRatio = worstRatio;
      rowItems = row;
      rest = items.slice(i);
    } else break;
  }

  const rowTotal = rowItems.reduce((s, i) => s + i.value, 0);
  const rowFrac = rowTotal / total;
  const nodes: TreeNode[] = [];
  let offset = 0;

  if (horizontal) {
    const rowW = w * rowFrac;
    for (const it of rowItems) {
      const frac = it.value / rowTotal;
      const cellH = h * frac;
      nodes.push({ symbol: it.symbol, shortName: it.shortName, price: it.price, changePercent: it.changePercent, marketCap: it.value, x, y: y + offset, w: rowW, h: cellH });
      offset += cellH;
    }
    nodes.push(...squarify(rest, x + rowW, y, w - rowW, h));
  } else {
    const rowH = h * rowFrac;
    for (const it of rowItems) {
      const frac = it.value / rowTotal;
      const cellW = w * frac;
      nodes.push({ symbol: it.symbol, shortName: it.shortName, price: it.price, changePercent: it.changePercent, marketCap: it.value, x: x + offset, y, w: cellW, h: rowH });
      offset += cellW;
    }
    nodes.push(...squarify(rest, x, y + rowH, w, h - rowH));
  }
  return nodes;
}

export default function DashboardHeatmap({ quotes, onSelectStock, onSeeAll }: DashboardHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 400 });
  const [hover, setHover] = useState<TreeNode | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const nodes = useMemo(() => {
    const sorted = quotes
      .filter(q => q.marketCap && q.marketCap > 0)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, 25);
    const items = sorted.map(q => ({
      symbol: q.symbol, shortName: q.shortName, price: q.price,
      changePercent: q.changePercent, value: q.marketCap || 0,
    }));
    return squarify(items, 0, 0, dims.w, dims.h);
  }, [quotes, dims]);

  return (
    <div className="dashboard-heatmap">
      <div className="panel-header">
        <span className="panel-title">MARKET HEATMAP</span>
        <button className="panel-see-all" onClick={onSeeAll}>See all →</button>
      </div>
      <div className="dashboard-heatmap-container" ref={containerRef}
        onMouseLeave={() => setHover(null)}>
        <svg width={dims.w} height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}>
          {nodes.map(n => {
            const showText = n.w > 40 && n.h > 30;
            return (
              <g key={n.symbol} onClick={() => onSelectStock(n.symbol)}
                onMouseEnter={(e) => { setHover(n); setMouse({ x: e.clientX, y: e.clientY }); }}
                onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
                style={{ cursor: 'pointer' }}>
                <rect x={n.x + 1} y={n.y + 1} width={Math.max(0, n.w - 2)} height={Math.max(0, n.h - 2)}
                  fill={getColor(n.changePercent)} rx={3} />
                {showText && (
                  <>
                    <text x={n.x + n.w / 2} y={n.y + n.h / 2 - 4} textAnchor="middle"
                      fill="#fff" fontSize={n.w > 80 ? 12 : 10} fontWeight="600">{n.symbol}</text>
                    <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 10} textAnchor="middle"
                      fill="#fff" fontSize={n.w > 80 ? 10 : 8} opacity={0.85}>
                      {n.changePercent >= 0 ? '+' : ''}{n.changePercent.toFixed(1)}%
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
        {hover && (
          <div className="heatmap-tooltip" style={{ left: mouse.x + 12, top: mouse.y - 40, position: 'fixed' }}>
            <div className="heatmap-tooltip-symbol">{hover.symbol}</div>
            {hover.shortName && <div className="heatmap-tooltip-name">{hover.shortName}</div>}
            <div>${hover.price?.toFixed(2)}</div>
            <div style={{ color: hover.changePercent >= 0 ? '#34c759' : '#ff3b30' }}>
              {hover.changePercent >= 0 ? '+' : ''}{hover.changePercent.toFixed(2)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create DashboardWatchlist.tsx**

```tsx
import { useState, useEffect, useRef } from 'react';
import type { Quote } from '../types';
import { getLogoUrl } from '../tickerDomains';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Sparkline from './Sparkline';

interface DashboardWatchlistProps {
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
  onSeeAll: () => void;
}

export default function DashboardWatchlist({ quotes, onSelectStock, onSeeAll }: DashboardWatchlistProps) {
  const [tickers, setTickers] = useLocalStorage<string[]>('xtox-watchlist', []);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [extraQuotes, setExtraQuotes] = useState<Record<string, Quote>>({});
  const [charts, setCharts] = useState<Record<string, number[]>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

  // Fetch quotes for tickers not in current market
  useEffect(() => {
    const missing = tickers.filter(t => !quoteMap.has(t));
    missing.forEach(sym => {
      if (extraQuotes[sym]) return;
      fetch(`/api/quote/${sym}`)
        .then(r => r.json())
        .then(data => setExtraQuotes(prev => ({ ...prev, [sym]: data })))
        .catch(() => {});
    });
  }, [tickers, quotes]);

  // Fetch sparkline charts
  useEffect(() => {
    tickers.forEach(sym => {
      if (charts[sym]) return;
      fetch(`/api/chart/${sym}`)
        .then(r => r.json())
        .then(data => setCharts(prev => ({ ...prev, [sym]: data.map((p: { close: number }) => p.close) })))
        .catch(() => {});
    });
  }, [tickers]);

  const getQuote = (sym: string): Quote | undefined => quoteMap.get(sym) || extraQuotes[sym];

  const searchResults = search
    ? quotes.filter(q => q.symbol.toLowerCase().startsWith(search.toLowerCase()) && !tickers.includes(q.symbol)).slice(0, 6)
    : [];

  const addTicker = (sym: string) => {
    if (!tickers.includes(sym)) setTickers([...tickers, sym]);
    setSearch('');
    setShowDropdown(false);
  };

  const removeTicker = (sym: string) => setTickers(tickers.filter(t => t !== sym));

  return (
    <div className="dashboard-watchlist">
      <div className="panel-header">
        <span className="panel-title">WATCHLIST {tickers.length > 0 && `(${tickers.length})`}</span>
        <div className="panel-header-actions">
          <button className="panel-see-all" onClick={onSeeAll}>See all →</button>
        </div>
      </div>
      <div className="watchlist-add" style={{ position: 'relative' }}>
        <input ref={inputRef} value={search} placeholder="+ Add ticker..."
          onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          className="watchlist-add-input" />
        {showDropdown && searchResults.length > 0 && (
          <div className="watchlist-dropdown">
            {searchResults.map(q => (
              <div key={q.symbol} className="watchlist-dropdown-item"
                onMouseDown={() => addTicker(q.symbol)}>
                {q.symbol} {q.shortName && <span className="text-secondary">— {q.shortName}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="dashboard-watchlist-list">
        {tickers.length === 0 && (
          <div className="watchlist-empty">Add tickers to start your watchlist</div>
        )}
        {tickers.slice(0, 8).map(sym => {
          const q = getQuote(sym);
          const logo = getLogoUrl(sym);
          const data = charts[sym] || [];
          const up = (q?.changePercent || 0) >= 0;
          return (
            <div key={sym} className="watchlist-row" onClick={() => onSelectStock(sym)}>
              <div className="watchlist-row-left">
                {logo && <img src={logo} alt="" className="watchlist-row-logo"
                  onError={e => (e.currentTarget.style.display = 'none')} />}
                <span className="watchlist-row-symbol">{sym}</span>
              </div>
              <div className="watchlist-row-right">
                {data.length > 1 && <Sparkline data={data} width={40} height={16} color={up ? 'var(--green)' : 'var(--red)'} />}
                <span className={`watchlist-row-change ${up ? 'up' : 'down'}`}>
                  {q ? `${up ? '+' : ''}${q.changePercent?.toFixed(1)}%` : '—'}
                </span>
              </div>
              <button className="watchlist-row-remove" onClick={e => { e.stopPropagation(); removeTicker(sym); }}>×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create DashboardMovers.tsx**

```tsx
import { useMemo } from 'react';
import type { Quote } from '../types';

interface DashboardMoversProps {
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
  onSeeAll: () => void;
}

export default function DashboardMovers({ quotes, onSelectStock, onSeeAll }: DashboardMoversProps) {
  const { gainers, losers } = useMemo(() => {
    const sorted = [...quotes].sort((a, b) => b.changePercent - a.changePercent);
    return {
      gainers: sorted.slice(0, 5),
      losers: sorted.slice(-5).reverse(),
    };
  }, [quotes]);

  return (
    <div className="dashboard-movers">
      <div className="panel-header">
        <span className="panel-title">TOP MOVERS</span>
        <button className="panel-see-all" onClick={onSeeAll}>See all →</button>
      </div>
      <div className="movers-section">
        <div className="movers-label">GAINERS</div>
        {gainers.map(q => (
          <div key={q.symbol} className="movers-row" onClick={() => onSelectStock(q.symbol)}>
            <span className="movers-symbol">{q.symbol}</span>
            <span className="movers-change up">+{q.changePercent.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <div className="movers-section">
        <div className="movers-label">LOSERS</div>
        {losers.map(q => (
          <div key={q.symbol} className="movers-row" onClick={() => onSelectStock(q.symbol)}>
            <span className="movers-symbol">{q.symbol}</span>
            <span className="movers-change down">{q.changePercent.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create NewsStrip.tsx**

```tsx
import { useState, useEffect } from 'react';
import type { NewsItem, Market } from '../types';

interface NewsStripProps {
  market: Market;
  onSeeAll: () => void;
}

export default function NewsStrip({ market, onSeeAll }: NewsStripProps) {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    const m = market === 'all' ? 'nasdaq' : market;
    fetch(`/api/news/${m}`)
      .then(r => r.json())
      .then(data => setNews(data.slice(0, 5)))
      .catch(() => setNews([]));
  }, [market]);

  if (news.length === 0) return null;

  return (
    <div className="news-strip">
      <span className="panel-title" style={{ whiteSpace: 'nowrap' }}>NEWS</span>
      <div className="news-strip-items">
        {news.map((n, i) => (
          <span key={i}>
            <a href={n.link} target="_blank" rel="noopener noreferrer" className="news-strip-link">
              {n.title}
            </a>
            {i < news.length - 1 && <span className="news-strip-divider">|</span>}
          </span>
        ))}
      </div>
      <button className="panel-see-all" onClick={onSeeAll} style={{ whiteSpace: 'nowrap' }}>See all →</button>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/IndexStrip.tsx src/components/SectorStrip.tsx src/components/DashboardHeatmap.tsx src/components/DashboardWatchlist.tsx src/components/DashboardMovers.tsx src/components/NewsStrip.tsx
git commit -m "feat: add dashboard panel components (index, sector, heatmap, watchlist, movers, news)"
```

---

## Task 5: Create Dashboard Layout and CSS

**Files:**
- Create: `src/components/Dashboard.tsx`
- Create: `src/components/Dashboard.css`

- [ ] **Step 1: Create Dashboard.css**

```css
/* Dashboard Layout */
.dashboard {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 46px);
  overflow: hidden;
}

/* Index Strip */
.index-strip {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 16px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
}

.index-strip-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.index-strip-name {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
}

.index-strip-price {
  font-size: 13px;
  font-weight: 600;
}

.index-strip-change {
  font-size: 11px;
  font-weight: 500;
}

.index-strip-change.up { color: var(--green); }
.index-strip-change.down { color: var(--red); }

/* Sector Strip */
.sector-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 16px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  scrollbar-width: none;
}

.sector-strip::-webkit-scrollbar { display: none; }

.sector-strip-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  font-size: 11px;
}

.sector-strip-name { color: var(--text-secondary); }
.sector-strip-change.up { color: var(--green); }
.sector-strip-change.down { color: var(--red); }

/* Main Content Area */
.dashboard-main {
  display: grid;
  grid-template-columns: 1fr 300px;
  flex: 1;
  overflow: hidden;
}

/* Panel Shared Styles */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.panel-title {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.panel-see-all {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}

.panel-see-all:hover {
  background: var(--hover);
}

.panel-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Dashboard Heatmap */
.dashboard-heatmap {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dashboard-heatmap-container {
  flex: 1;
  min-height: 0;
  position: relative;
}

.dashboard-heatmap-container svg {
  display: block;
}

.heatmap-tooltip {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  pointer-events: none;
  z-index: 1000;
}

.heatmap-tooltip-symbol {
  font-weight: 700;
  font-size: 14px;
}

.heatmap-tooltip-name {
  color: var(--text-secondary);
  font-size: 11px;
}

/* Sidebar */
.dashboard-sidebar {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border);
  overflow: hidden;
}

/* Dashboard Watchlist */
.dashboard-watchlist {
  padding: 8px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}

.watchlist-add-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font-size: 12px;
  outline: none;
}

.watchlist-add-input:focus {
  border-color: var(--accent);
}

.watchlist-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 50;
  max-height: 180px;
  overflow-y: auto;
}

.watchlist-dropdown-item {
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}

.watchlist-dropdown-item:hover {
  background: var(--hover);
}

.dashboard-watchlist-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
}

.watchlist-empty {
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
  padding: 16px 0;
}

.watchlist-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  position: relative;
  font-size: 12px;
}

.watchlist-row:hover {
  background: var(--hover);
}

.watchlist-row-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.watchlist-row-logo {
  width: 18px;
  height: 18px;
  border-radius: 4px;
}

.watchlist-row-symbol {
  font-weight: 600;
  font-size: 12px;
}

.watchlist-row-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.watchlist-row-change {
  font-size: 11px;
  font-weight: 500;
  min-width: 44px;
  text-align: right;
}

.watchlist-row-change.up { color: var(--green); }
.watchlist-row-change.down { color: var(--red); }

.watchlist-row-remove {
  position: absolute;
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 12px;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.watchlist-row:hover .watchlist-row-remove {
  display: flex;
}

.text-secondary { color: var(--text-secondary); }

/* Dashboard Movers */
.dashboard-movers {
  padding: 8px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.movers-section {
  margin-bottom: 4px;
}

.movers-label {
  font-size: 9px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.movers-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 12px;
  cursor: pointer;
}

.movers-row:hover {
  background: var(--hover);
}

.movers-symbol {
  font-weight: 500;
}

.movers-change {
  font-weight: 600;
}

.movers-change.up { color: var(--green); }
.movers-change.down { color: var(--red); }

/* News Strip */
.news-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--card);
  border-top: 1px solid var(--border);
  font-size: 12px;
  overflow: hidden;
}

.news-strip-items {
  display: flex;
  gap: 8px;
  overflow: hidden;
  white-space: nowrap;
  flex: 1;
}

.news-strip-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 11px;
}

.news-strip-link:hover {
  color: var(--text);
}

.news-strip-divider {
  color: var(--border);
  margin: 0 4px;
}

/* Responsive */
@media (max-width: 1200px) {
  .dashboard-main {
    grid-template-columns: 1fr;
  }
  .dashboard-sidebar {
    flex-direction: row;
    border-left: none;
    border-top: 1px solid var(--border);
  }
  .dashboard-watchlist {
    border-bottom: none;
    border-right: 1px solid var(--border);
  }
}

@media (max-width: 768px) {
  .dashboard-main {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
  .dashboard-sidebar {
    flex-direction: column;
  }
  .dashboard-watchlist {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  .index-strip {
    gap: 12px;
    overflow-x: auto;
  }
}
```

- [ ] **Step 2: Create Dashboard.tsx**

```tsx
import type { Quote, IndexQuote, Market } from '../types';
import IndexStrip from './IndexStrip';
import SectorStrip from './SectorStrip';
import DashboardHeatmap from './DashboardHeatmap';
import DashboardWatchlist from './DashboardWatchlist';
import DashboardMovers from './DashboardMovers';
import NewsStrip from './NewsStrip';
import './Dashboard.css';

interface DashboardProps {
  quotes: Quote[];
  indices: IndexQuote[];
  market: Market;
  onSelectStock: (symbol: string) => void;
  onNavigate: (view: string) => void;
}

export default function Dashboard({ quotes, indices, market, onSelectStock, onNavigate }: DashboardProps) {
  return (
    <div className="dashboard">
      <IndexStrip indices={indices} />
      <SectorStrip market={market} />
      <div className="dashboard-main">
        <DashboardHeatmap
          quotes={quotes}
          onSelectStock={onSelectStock}
          onSeeAll={() => onNavigate('heatmap')}
        />
        <div className="dashboard-sidebar">
          <DashboardWatchlist
            quotes={quotes}
            onSelectStock={onSelectStock}
            onSeeAll={() => onNavigate('watchlist')}
          />
          <DashboardMovers
            quotes={quotes}
            onSelectStock={onSelectStock}
            onSeeAll={() => onNavigate('movers')}
          />
        </div>
      </div>
      <NewsStrip market={market} onSeeAll={() => onNavigate('news')} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard.tsx src/components/Dashboard.css
git commit -m "feat: add Dashboard layout component with full CSS"
```

---

## Task 6: Create Expansion Views (NewsView, WatchlistView)

**Files:**
- Create: `src/components/NewsView.tsx`
- Create: `src/components/NewsView.css`
- Create: `src/components/WatchlistView.tsx`
- Create: `src/components/WatchlistView.css`

- [ ] **Step 1: Create NewsView.tsx and NewsView.css**

```tsx
import { useState, useEffect } from 'react';
import type { NewsItem, Market } from '../types';
import './NewsView.css';

interface NewsViewProps {
  market: Market;
}

export default function NewsView({ market }: NewsViewProps) {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    const m = market === 'all' ? 'nasdaq' : market;
    fetch(`/api/news/${m}`)
      .then(r => r.json())
      .then(setNews)
      .catch(() => setNews([]));
  }, [market]);

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <div className="news-view">
      <h2 className="news-view-title">Market News</h2>
      <div className="news-view-grid">
        {news.map((n, i) => (
          <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="news-card">
            {n.thumbnail && <img src={n.thumbnail} alt="" className="news-card-img" />}
            <div className="news-card-body">
              <div className="news-card-title">{n.title}</div>
              <div className="news-card-meta">{n.publisher} · {timeAgo(n.providerPublishTime)}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
```

```css
/* NewsView.css */
.news-view { padding: 24px; max-width: 900px; margin: 0 auto; }
.news-view-title { font-size: 20px; font-weight: 700; margin-bottom: 16px; }
.news-view-grid { display: flex; flex-direction: column; gap: 12px; }
.news-card { display: flex; gap: 12px; padding: 12px; background: var(--card); border-radius: 10px; text-decoration: none; color: var(--text); border: 1px solid var(--border); }
.news-card:hover { border-color: var(--accent); }
.news-card-img { width: 100px; height: 70px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
.news-card-body { flex: 1; }
.news-card-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.news-card-meta { font-size: 12px; color: var(--text-secondary); }
```

- [ ] **Step 2: Create WatchlistView.tsx and WatchlistView.css**

```tsx
import { useState, useEffect } from 'react';
import type { Quote } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getLogoUrl } from '../tickerDomains';
import Sparkline from './Sparkline';
import './WatchlistView.css';

interface WatchlistViewProps {
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
}

export default function WatchlistView({ quotes, onSelectStock }: WatchlistViewProps) {
  const [tickers] = useLocalStorage<string[]>('xtox-watchlist', []);
  const [extraQuotes, setExtraQuotes] = useState<Record<string, Quote>>({});
  const [charts, setCharts] = useState<Record<string, number[]>>({});

  const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

  useEffect(() => {
    tickers.forEach(sym => {
      if (!quoteMap.has(sym) && !extraQuotes[sym]) {
        fetch(`/api/quote/${sym}`)
          .then(r => r.json())
          .then(data => setExtraQuotes(prev => ({ ...prev, [sym]: data })))
          .catch(() => {});
      }
      if (!charts[sym]) {
        fetch(`/api/chart/${sym}`)
          .then(r => r.json())
          .then(data => setCharts(prev => ({ ...prev, [sym]: data.map((p: { close: number }) => p.close) })))
          .catch(() => {});
      }
    });
  }, [tickers]);

  const getQuote = (sym: string) => quoteMap.get(sym) || extraQuotes[sym];

  return (
    <div className="watchlist-view">
      <h2 className="watchlist-view-title">Watchlist</h2>
      {tickers.length === 0 && <p className="text-secondary">Your watchlist is empty. Add tickers from the dashboard.</p>}
      <div className="watchlist-view-grid">
        {tickers.map(sym => {
          const q = getQuote(sym);
          const logo = getLogoUrl(sym);
          const data = charts[sym] || [];
          const up = (q?.changePercent || 0) >= 0;
          return (
            <div key={sym} className="watchlist-view-card" onClick={() => onSelectStock(sym)}>
              <div className="watchlist-view-card-header">
                {logo && <img src={logo} alt="" className="watchlist-view-logo"
                  onError={e => (e.currentTarget.style.display = 'none')} />}
                <div>
                  <div className="watchlist-view-symbol">{sym}</div>
                  {q?.shortName && <div className="watchlist-view-name">{q.shortName}</div>}
                </div>
              </div>
              <div className="watchlist-view-card-body">
                {data.length > 1 && <Sparkline data={data} width={120} height={32} color={up ? 'var(--green)' : 'var(--red)'} />}
                <div className="watchlist-view-price">{q ? `$${q.price.toFixed(2)}` : '—'}</div>
                <div className={`watchlist-view-change ${up ? 'up' : 'down'}`}>
                  {q ? `${up ? '+' : ''}${q.changePercent?.toFixed(2)}%` : '—'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

```css
/* WatchlistView.css */
.watchlist-view { padding: 24px; max-width: 1000px; margin: 0 auto; }
.watchlist-view-title { font-size: 20px; font-weight: 700; margin-bottom: 16px; }
.watchlist-view-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.watchlist-view-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 12px; cursor: pointer; }
.watchlist-view-card:hover { border-color: var(--accent); }
.watchlist-view-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.watchlist-view-logo { width: 24px; height: 24px; border-radius: 6px; }
.watchlist-view-symbol { font-weight: 700; font-size: 14px; }
.watchlist-view-name { font-size: 11px; color: var(--text-secondary); }
.watchlist-view-card-body { text-align: center; }
.watchlist-view-price { font-size: 18px; font-weight: 600; margin-top: 4px; }
.watchlist-view-change { font-size: 13px; font-weight: 500; }
.watchlist-view-change.up { color: var(--green); }
.watchlist-view-change.down { color: var(--red); }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/NewsView.tsx src/components/NewsView.css src/components/WatchlistView.tsx src/components/WatchlistView.css
git commit -m "feat: add NewsView and WatchlistView full-page expansion views"
```

---

## Task 7: Wire Everything in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Rewrite App.tsx**

Replace the full content of `src/App.tsx` with the new navigation model. This removes the old Header, Toolbar, SummaryView imports and wires in the new Dashboard, HeaderBar, and expansion views.

```tsx
import { useState } from 'react';
import type { Market, View } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { usePolling } from './hooks/usePolling';
import HeaderBar from './components/HeaderBar';
import Dashboard from './components/Dashboard';
import StockDetail from './components/StockDetail';
import HeatmapView from './components/HeatmapView';
import TopMoversView from './components/TopMoversView';
import GridView from './components/GridView';
import WatchlistView from './components/WatchlistView';
import NewsView from './components/NewsView';
import './App.css';

function Skeleton() {
  return (
    <div className="skeleton-wrap">
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line w60" />
          <div className="skeleton-line w40" />
          <div className="skeleton-line w80" />
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useLocalStorage('xtox-theme', 'dark');
  const [market, setMarket] = useLocalStorage<Market>('xtox-market', 'all');
  const [view, setView] = useLocalStorage<View>('xtox-view', 'dashboard');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const { quotes, indices, loading, error } = usePolling(market, 10000);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  }

  function getMarketStatus() {
    const now = new Date();
    const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const h = et.getHours() + et.getMinutes() / 60;
    const day = et.getDay();
    if (day === 0 || day === 6) return 'closed';
    if (h >= 9.5 && h < 16) return 'open';
    if (h >= 4 && h < 9.5) return 'pre';
    return 'closed';
  }

  const marketStatus = getMarketStatus();

  function handleSelectStock(symbol: string) {
    setSelectedStock(symbol);
  }

  function handleBackToDashboard() {
    setSelectedStock(null);
    setView('dashboard');
  }

  function handleNavigate(v: string) {
    setView(v as View);
  }

  if (selectedStock) {
    return (
      <div className="app" data-theme={theme}>
        <HeaderBar
          market={market} onMarketChange={setMarket}
          theme={theme} onThemeToggle={toggleTheme}
          marketStatus={marketStatus} quotes={quotes}
          onSelectStock={handleSelectStock}
          view="detail" onBackToDashboard={handleBackToDashboard}
        />
        <StockDetail symbol={selectedStock} onBack={() => setSelectedStock(null)} />
      </div>
    );
  }

  return (
    <div className="app" data-theme={theme}>
      <HeaderBar
        market={market} onMarketChange={setMarket}
        theme={theme} onThemeToggle={toggleTheme}
        marketStatus={marketStatus} quotes={quotes}
        onSelectStock={handleSelectStock}
        view={view} onBackToDashboard={handleBackToDashboard}
      />
      {error && <div className="error-banner">Connection issues — showing cached data</div>}
      {loading ? <Skeleton /> : (
        <>
          {view === 'dashboard' && (
            <Dashboard
              quotes={quotes} indices={indices} market={market}
              onSelectStock={handleSelectStock} onNavigate={handleNavigate}
            />
          )}
          {view === 'heatmap' && <HeatmapView quotes={quotes} onSelectStock={handleSelectStock} />}
          {view === 'movers' && <TopMoversView quotes={quotes} onSelectStock={handleSelectStock} />}
          {view === 'grid' && <GridView quotes={quotes} onSelectStock={handleSelectStock} />}
          {view === 'watchlist' && <WatchlistView quotes={quotes} onSelectStock={handleSelectStock} />}
          {view === 'news' && <NewsView market={market} />}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the app compiles and renders**

Run: `cd /home/dula/projects/stock-dash && npx tsc --noEmit 2>&1 | head -30`
Then: `npm run dev` and open in browser to verify the dashboard loads.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire dashboard hub with new navigation model and HeaderBar"
```

---

## Task 8: Clean Up Deprecated Components

**Files:**
- Delete: `src/components/Header.tsx`, `src/components/Header.css`
- Delete: `src/components/Toolbar.tsx`, `src/components/Toolbar.css`
- Delete: `src/components/SummaryView.tsx`, `src/components/SummaryView.css`
- Delete: `src/components/Watchlist.tsx`, `src/components/Watchlist.css`

- [ ] **Step 1: Verify no imports reference old components**

Run: `grep -r "from.*Header'" src/ --include='*.tsx' --include='*.ts'`
Run: `grep -r "from.*Toolbar'" src/ --include='*.tsx' --include='*.ts'`
Run: `grep -r "from.*SummaryView'" src/ --include='*.tsx' --include='*.ts'`
Run: `grep -r "from.*Watchlist'" src/ --include='*.tsx' --include='*.ts'` (should only show DashboardWatchlist and WatchlistView)

Expected: No imports reference the old components.

- [ ] **Step 2: Delete deprecated files**

```bash
rm src/components/Header.tsx src/components/Header.css
rm src/components/Toolbar.tsx src/components/Toolbar.css
rm src/components/SummaryView.tsx src/components/SummaryView.css
rm src/components/Watchlist.tsx src/components/Watchlist.css
```

- [ ] **Step 3: Verify app still compiles and runs**

Run: `cd /home/dula/projects/stock-dash && npx tsc --noEmit 2>&1 | head -20`
Run: `npm run dev` and verify dashboard still works.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove deprecated Header, Toolbar, SummaryView, Watchlist components"
```

---

## Task 9: Fix HeatmapView (Full View Improvements)

**Files:**
- Modify: `src/components/HeatmapView.tsx`

- [ ] **Step 1: Fix text overlap and add responsive sizing**

The existing HeatmapView (173 lines) uses a fixed 1000x600 viewBox and has text overlap on small cells. Apply three fixes:

1. Use ResizeObserver for responsive sizing (same as DashboardHeatmap)
2. Hide text on cells below size threshold
3. Add hover tooltip

Read the current HeatmapView.tsx, then apply the same patterns used in DashboardHeatmap.tsx: add a container ref with ResizeObserver, update the SVG viewBox to use measured dimensions, add the size threshold check for text visibility (`n.w > 40 && n.h > 30`), and add the hover tooltip markup.

- [ ] **Step 2: Verify heatmap renders correctly at different sizes**

Run: `npm run dev`, navigate to the full heatmap via "See all →", resize the browser window.
Expected: Heatmap resizes, small cells hide text, tooltip shows on hover.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeatmapView.tsx
git commit -m "fix: responsive heatmap sizing, text overlap, and hover tooltips"
```

---

## Task 10: End-to-End Verification

- [ ] **Step 1: Start the server and dev environment**

Run: `cd /home/dula/projects/stock-dash && npm run dev`

- [ ] **Step 2: Verify all dashboard panels load**

Open the app in browser. Check:
- [ ] Index strip shows S&P 500, NASDAQ, DOW with sparklines
- [ ] Sector strip shows sectors with color-coded % changes
- [ ] Heatmap renders top 25 stocks with proper colors
- [ ] Heatmap hover shows tooltip with symbol, name, price, change
- [ ] Watchlist panel shows tickers (or empty state)
- [ ] Top Movers shows 5 gainers + 5 losers
- [ ] News strip shows headlines at bottom
- [ ] Market status indicator works

- [ ] **Step 3: Verify market switcher**

- [ ] Click "NDQ" → heatmap/movers filter to NASDAQ-100
- [ ] Click "SPX" → filters to S&P 500
- [ ] Click "DOW" → filters to DOW 30
- [ ] Click "All" → shows all ~150 stocks

- [ ] **Step 4: Verify navigation**

- [ ] Click stock in heatmap → StockDetail page loads
- [ ] "← Dashboard" button returns to dashboard
- [ ] "See all →" on heatmap → full HeatmapView
- [ ] "See all →" on movers → full TopMoversView
- [ ] "See all →" on watchlist → WatchlistView
- [ ] "See all →" on news → NewsView
- [ ] Back button works from all expanded views

- [ ] **Step 5: Verify search**

- [ ] Click search icon → input expands
- [ ] Type "AA" → shows AAPL and other matches
- [ ] Click result → navigates to StockDetail

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "feat: complete Phase 0 dense dashboard redesign"
```
