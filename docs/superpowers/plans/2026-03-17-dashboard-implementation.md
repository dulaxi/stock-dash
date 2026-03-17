# XTOX Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clean, login-free stock dashboard with three views (Summary, Top Movers, Grid), three markets (NASDAQ-100, S&P 500, DOW 30), dark/light theme, and configurable polling.

**Architecture:** Single-page React app with an Express backend proxy to Yahoo Finance. Backend owns symbol lists, sorting, and caching. Frontend polls one market at a time and renders three swappable views from the same data. State managed with React hooks — no external state library needed.

**Tech Stack:** React + TypeScript + Vite (frontend), Express + yahoo-finance2 (backend), plain CSS with CSS variables (styling), Tanker + Satoshi fonts (typography).

**Spec:** `docs/superpowers/specs/2026-03-17-dashboard-design.md`

---

## File Structure

### Backend
- **`server/symbols.js`** — Hardcoded symbol lists for all three markets. Single source of truth.
- **`server/cache.js`** — Generic in-memory cache with TTL and stale-on-error fallback.
- **`server/index.js`** — Express server with 4 endpoints: `/api/quotes/:market`, `/api/indices`. Uses yahoo-finance2 to fetch data, cache module for TTL, symbols module for lists.

### Frontend
- **`src/main.tsx`** — Entry point (exists, no changes needed).
- **`src/App.tsx`** — Root component. Holds all state (market, view, theme, polling speed, quotes, indices). Renders Header, Toolbar, and active view.
- **`src/App.css`** — Root layout styles only.
- **`src/index.css`** — Global reset, CSS variables for dark/light themes, font imports. Replace `prefers-color-scheme` with a `[data-theme]` attribute approach.
- **`src/components/Header.tsx`** — XTOX logo, theme toggle, polling speed dropdown.
- **`src/components/Header.css`** — Header styles.
- **`src/components/Toolbar.tsx`** — Market selector pills + view selector pills.
- **`src/components/Toolbar.css`** — Toolbar/pill styles.
- **`src/components/SummaryView.tsx`** — Index cards row + truncated stock table (top 50).
- **`src/components/SummaryView.css`** — Index card and summary table styles.
- **`src/components/TopMoversView.tsx`** — Gainers and losers card grids (top 10 each, sorted by changePercent).
- **`src/components/TopMoversView.css`** — Mover card styles.
- **`src/components/GridView.tsx`** — Dense sortable table with all stocks.
- **`src/components/GridView.css`** — Dense grid styles.
- **`src/hooks/usePolling.ts`** — Custom hook: fetches quotes + indices at the selected interval, handles market switching, error counting, loading/error states.
- **`src/hooks/useLocalStorage.ts`** — Generic localStorage hook for persisting theme and polling speed.
- **`src/types.ts`** — Shared TypeScript interfaces: `Quote`, `IndexQuote`, `Market`, `View`, `PollingSpeed`.

### Deleted
- **`server.js`** — Replaced by `server/index.js`.

---

## Task 1: Backend — Symbol Lists

**Files:**
- Create: `server/symbols.js`

- [ ] **Step 1: Create the symbols module with all three market lists**

```js
export const NASDAQ_100 = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'META', 'GOOGL', 'GOOG', 'TSLA', 'AVGO', 'COST',
  'NFLX', 'TMUS', 'ASML', 'AMD', 'PEP', 'CSCO', 'ADBE', 'LIN', 'TXN', 'INTU',
  'QCOM', 'ISRG', 'AMGN', 'CMCSA', 'BKNG', 'AMAT', 'HON', 'VRTX', 'PANW', 'ADP',
  'GILD', 'SBUX', 'MU', 'ADI', 'MDLZ', 'LRCX', 'REGN', 'INTC', 'KLAC', 'PYPL',
  'SNPS', 'CDNS', 'CRWD', 'CTAS', 'MAR', 'MRVL', 'ORLY', 'ABNB', 'NXPI', 'DASH',
  'FTNT', 'WDAY', 'CSX', 'PCAR', 'CEG', 'CHTR', 'MNST', 'MELI', 'ROP', 'AEP',
  'ODFL', 'ADSK', 'PAYX', 'KDP', 'AZN', 'FAST', 'ROST', 'DXCM', 'KHC', 'VRSK',
  'CTSH', 'EXC', 'BKR', 'EA', 'LULU', 'XEL', 'GEHC', 'IDXX', 'CCEP', 'TTWO',
  'MCHP', 'CSGP', 'ON', 'ANSS', 'ZS', 'DDOG', 'CDW', 'BIIB', 'GFS', 'ILMN',
  'TTD', 'MDB', 'TEAM', 'WBD', 'ARM', 'SMCI', 'COIN', 'HOOD', 'PLTR', 'MSTR',
];

export const SP_500 = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'META', 'TSLA', 'BRK-B', 'AVGO', 'JPM',
  'LLY', 'UNH', 'V', 'XOM', 'MA', 'COST', 'HD', 'PG', 'JNJ', 'NFLX',
  'ABBV', 'BAC', 'CRM', 'CVX', 'KO', 'MRK', 'WMT', 'AMD', 'PEP', 'CSCO',
  'TMO', 'ACN', 'LIN', 'MCD', 'ADBE', 'ABT', 'WFC', 'DHR', 'PM', 'TXN',
  'NEE', 'ISRG', 'QCOM', 'INTU', 'CMCSA', 'AMGN', 'AMAT', 'GE', 'RTX', 'VZ',
  'PFE', 'BKNG', 'HON', 'T', 'LOW', 'UNP', 'SPGI', 'CAT', 'COP', 'BA',
  'IBM', 'GS', 'BLK', 'DE', 'ADP', 'NOW', 'MS', 'GILD', 'AXP', 'SBUX',
  'MDT', 'VRTX', 'MDLZ', 'ADI', 'REGN', 'TJX', 'PANW', 'LRCX', 'SYK', 'BMY',
  'SCHW', 'CB', 'PGR', 'MMC', 'MU', 'KLAC', 'SNPS', 'CDNS', 'SO', 'DUK',
  'ZTS', 'CI', 'BDX', 'CME', 'EOG', 'FI', 'PYPL', 'SLB', 'ICE', 'MCO',
];

export const DOW_30 = [
  'AAPL', 'AMGN', 'AMZN', 'AXP', 'BA', 'CAT', 'CRM', 'CSCO', 'CVX', 'DIS',
  'DOW', 'GS', 'HD', 'HON', 'IBM', 'JNJ', 'JPM', 'KO', 'MCD', 'MMM',
  'MRK', 'MSFT', 'NKE', 'NVDA', 'PG', 'TRV', 'UNH', 'V', 'VZ', 'WMT',
];

export const INDEX_SYMBOLS = ['^IXIC', '^GSPC', '^DJI'];

export const MARKET_MAP = {
  nasdaq: NASDAQ_100,
  sp500: SP_500,
  dow: DOW_30,
};
```

Note: S&P 500 list above is a representative subset (100 of 500). The full list should be populated with all ~500 symbols. For implementation, start with this subset and expand later.

- [ ] **Step 2: Commit**

```bash
git add server/symbols.js
git commit -m "feat: add hardcoded symbol lists for all three markets"
```

---

## Task 2: Backend — Cache Module

**Files:**
- Create: `server/cache.js`

- [ ] **Step 1: Create the cache module**

```js
const store = new Map();

// Returns { data, stale } or null (miss)
export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  return { data: entry.data, stale: age >= entry.ttl };
}

export function cacheSet(key, data, ttl = 3000) {
  store.set(key, { data, timestamp: Date.now(), ttl });
}
```

- [ ] **Step 2: Commit**

```bash
git add server/cache.js
git commit -m "feat: add in-memory cache with TTL and stale fallback"
```

---

## Task 3: Backend — Express Server

**Files:**
- Create: `server/index.js`
- Delete: `server.js` (root)
- Modify: `package.json` (update dev script)

- [ ] **Step 1: Create the new server**

```js
import express from 'express';
import yahooFinance from 'yahoo-finance2';
import { MARKET_MAP, INDEX_SYMBOLS } from './symbols.js';
import { cacheGet, cacheSet } from './cache.js';
const app = express();
const PORT = 3001;

async function fetchQuotes(symbols) {
  const results = await Promise.allSettled(
    symbols.map(symbol =>
      yahooFinance.quote(symbol).then(q => ({
        symbol: q.symbol,
        price: q.regularMarketPrice,
        change: q.regularMarketChange,
        changePercent: q.regularMarketChangePercent,
      }))
    )
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

// GET /api/quotes/:market (nasdaq | sp500 | dow)
app.get('/api/quotes/:market', async (req, res) => {
  const market = req.params.market;
  const symbols = MARKET_MAP[market];
  if (!symbols) return res.status(400).json({ error: 'Invalid market' });

  const cacheKey = `quotes-${market}`;
  const cached = cacheGet(cacheKey);
  if (cached && !cached.stale) return res.json(cached.data);
  if (cached?.stale) {
    // Return stale data, refresh in background
    res.json(cached.data);
    fetchQuotes(symbols).then(data => cacheSet(cacheKey, data)).catch(() => {});
    return;
  }

  try {
    const data = await fetchQuotes(symbols);
    cacheSet(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error(`Error fetching ${market}:`, error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// GET /api/indices
app.get('/api/indices', async (_req, res) => {
  const cached = cacheGet('indices');
  if (cached && !cached.stale) return res.json(cached.data);
  if (cached?.stale) {
    res.json(cached.data);
    fetchQuotes(INDEX_SYMBOLS).then(data => {
      const named = data.map(q => ({
        ...q,
        name: q.symbol === '^IXIC' ? 'NASDAQ' : q.symbol === '^GSPC' ? 'S&P 500' : 'DOW 30',
      }));
      cacheSet('indices', named);
    }).catch(() => {});
    return;
  }

  try {
    const data = await fetchQuotes(INDEX_SYMBOLS);
    const named = data.map(q => ({
      ...q,
      name: q.symbol === '^IXIC' ? 'NASDAQ' : q.symbol === '^GSPC' ? 'S&P 500' : 'DOW 30',
    }));
    cacheSet('indices', named);
    res.json(named);
  } catch (error) {
    console.error('Error fetching indices:', error);
    res.status(500).json({ error: 'Failed to fetch indices' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 2: Delete old `server.js` from project root**

```bash
rm server.js
```

- [ ] **Step 3: Update `package.json` dev script**

Change the dev script from `concurrently "node server.js" "vite"` to:
```json
"dev": "concurrently \"node server/index.js\" \"vite\""
```

- [ ] **Step 4: Test the server manually**

```bash
node server/index.js &
curl http://localhost:3001/api/quotes/dow | head -c 200
curl http://localhost:3001/api/indices | head -c 200
kill %1
```

Expected: JSON arrays with `{ symbol, price, change, changePercent }` objects.

- [ ] **Step 5: Commit**

```bash
git add server/ package.json
git add server.js  # stages the deletion
git commit -m "feat: restructure backend with market endpoints, indices, and caching"
```

---

## Task 4: Frontend — Types and Hooks

**Files:**
- Create: `src/types.ts`
- Create: `src/hooks/useLocalStorage.ts`
- Create: `src/hooks/usePolling.ts`

- [ ] **Step 1: Create shared types**

```ts
export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface IndexQuote extends Quote {
  name: string;
}

export type Market = 'nasdaq' | 'sp500' | 'dow';
export type View = 'summary' | 'movers' | 'grid';
export type PollingSpeed = 5000 | 10000 | 30000;
```

- [ ] **Step 2: Create useLocalStorage hook**

```ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
```

- [ ] **Step 3: Create usePolling hook**

```ts
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

  useEffect(() => {
    let cancelled = false;
    // Only show full loading spinner on very first load (no data yet)
    if (quotes.length === 0) {
      setLoading(true);
    } else {
      setSwitching(true);
    }
    failCount.current = 0;
    setError(false);

    const fetchData = async () => {
      try {
        const [quotesRes, indicesRes] = await Promise.all([
          fetch(`/api/quotes/${market}`),
          fetch('/api/indices'),
        ]);

        if (!quotesRes.ok || !indicesRes.ok) throw new Error('Fetch failed');

        const [quotesData, indicesData] = await Promise.all([
          quotesRes.json(),
          indicesRes.json(),
        ]);

        if (cancelled) return;
        setQuotes(quotesData);
        setIndices(indicesData);
        setLoading(false);
        setSwitching(false);
        setError(false);
        failCount.current = 0;
        initialLoad.current = false;
      } catch {
        if (cancelled) return;
        failCount.current++;
        if (failCount.current >= 3) setError(true);
        if (initialLoad.current) {
          // Retry on initial load failure
          setTimeout(() => { if (!cancelled) fetchData(); }, 5000);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, speed);
    return () => { cancelled = true; clearInterval(interval); };
  }, [market, speed]);

  return { quotes, indices, loading, switching, error };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/hooks/
git commit -m "feat: add types and polling/localStorage hooks"
```

---

## Task 5: Frontend — Theme System

**Files:**
- Modify: `src/index.css`
- Modify: `index.html`

- [ ] **Step 1: Replace prefers-color-scheme with data-theme attribute system**

Rewrite `src/index.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Dark theme (default) */
[data-theme='dark'] {
  --bg: #000000;
  --bg-secondary: #111111;
  --text: #f5f5f7;
  --text-secondary: #86868b;
  --border: #1d1d1f;
  --accent: #2997ff;
  --positive: #34c759;
  --negative: #ff3b30;
  --pill-bg: #1d1d1f;
  --pill-active-bg: #2d2d2f;
  --pill-active-text: #f5f5f7;
}

/* Light theme */
[data-theme='light'] {
  --bg: #fafafa;
  --bg-secondary: #f2f2f7;
  --text: #1d1d1f;
  --text-secondary: #86868b;
  --border: #e5e5e7;
  --accent: #0071e3;
  --positive: #34c759;
  --negative: #ff3b30;
  --pill-bg: #e5e5e7;
  --pill-active-bg: #d1d1d6;
  --pill-active-text: #1d1d1f;
}

body {
  min-height: 100vh;
  color: var(--text);
  background: var(--bg);
}

#root {
  min-height: 100vh;
}
```

- [ ] **Step 2: Add inline script to `index.html` to set theme before paint**

Add this script before the `</head>` tag in `index.html`. **Preserve the existing Fontshare `<link>` tags for Tanker and Satoshi.**

```html
<script>
  document.documentElement.dataset.theme = localStorage.getItem('xtox-theme')
    ? JSON.parse(localStorage.getItem('xtox-theme'))
    : 'dark';
</script>
```

This prevents a flash of wrong theme on load.

- [ ] **Step 3: Commit**

```bash
git add src/index.css index.html
git commit -m "feat: implement data-theme attribute system with dark default"
```

---

## Task 6: Frontend — Header Component

**Files:**
- Create: `src/components/Header.tsx`
- Create: `src/components/Header.css`

- [ ] **Step 1: Create Header component**

```tsx
import type { PollingSpeed } from '../types';
import './Header.css';

interface HeaderProps {
  theme: string;
  onThemeToggle: () => void;
  pollingSpeed: PollingSpeed;
  onPollingSpeedChange: (speed: PollingSpeed) => void;
}

const SPEEDS: { value: PollingSpeed; label: string }[] = [
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
];

export function Header({ theme, onThemeToggle, pollingSpeed, onPollingSpeedChange }: HeaderProps) {
  const speedLabel = SPEEDS.find(s => s.value === pollingSpeed)?.label ?? '5s';

  return (
    <header className="header">
      <div className="header-logo">XTOX</div>
      <div className="header-controls">
        <span className="live-label">Live · {speedLabel}</span>
        <select
          className="speed-select"
          value={pollingSpeed}
          onChange={e => onPollingSpeedChange(Number(e.target.value) as PollingSpeed)}
        >
          {SPEEDS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button className="theme-toggle" onClick={onThemeToggle} aria-label="Toggle theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create Header styles**

```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  border-bottom: 1px solid var(--border);
}

.header-logo {
  font-family: 'Tanker', sans-serif;
  font-weight: 400;
  font-size: 24px;
  letter-spacing: -0.5px;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.live-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--positive);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.speed-select {
  font-family: inherit;
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text);
  cursor: pointer;
  outline: none;
}

.theme-toggle {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 16px;
  cursor: pointer;
  color: var(--text);
  transition: background 0.15s;
}

.theme-toggle:hover {
  background: var(--bg-secondary);
}

@media (max-width: 768px) {
  .header {
    padding: 16px 20px;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.tsx src/components/Header.css
git commit -m "feat: add Header component with theme toggle and polling speed"
```

---

## Task 7: Frontend — Toolbar Component

**Files:**
- Create: `src/components/Toolbar.tsx`
- Create: `src/components/Toolbar.css`

- [ ] **Step 1: Create Toolbar component**

```tsx
import type { Market, View } from '../types';
import './Toolbar.css';

interface ToolbarProps {
  market: Market;
  onMarketChange: (market: Market) => void;
  view: View;
  onViewChange: (view: View) => void;
}

const MARKETS: { value: Market; label: string }[] = [
  { value: 'nasdaq', label: 'NASDAQ-100' },
  { value: 'sp500', label: 'S&P 500' },
  { value: 'dow', label: 'DOW 30' },
];

const VIEWS: { value: View; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'movers', label: 'Top Movers' },
  { value: 'grid', label: 'Grid' },
];

export function Toolbar({ market, onMarketChange, view, onViewChange }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="pill-group">
        {MARKETS.map(m => (
          <button
            key={m.value}
            className={`pill ${market === m.value ? 'active' : ''}`}
            onClick={() => onMarketChange(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="pill-group">
        {VIEWS.map(v => (
          <button
            key={v.value}
            className={`pill ${view === v.value ? 'active' : ''}`}
            onClick={() => onViewChange(v.value)}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Toolbar styles**

```css
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 32px;
}

.pill-group {
  display: flex;
  gap: 6px;
}

.pill {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 980px;
  border: none;
  background: var(--pill-bg);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.pill:hover {
  background: var(--pill-active-bg);
}

.pill.active {
  background: var(--pill-active-bg);
  color: var(--pill-active-text);
}

@media (max-width: 768px) {
  .toolbar {
    padding: 12px 20px;
  }

  .pill {
    font-size: 12px;
    padding: 5px 10px;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Toolbar.tsx src/components/Toolbar.css
git commit -m "feat: add Toolbar component with market and view pill selectors"
```

---

## Task 8: Frontend — Summary View

**Files:**
- Create: `src/components/SummaryView.tsx`
- Create: `src/components/SummaryView.css`

- [ ] **Step 1: Create SummaryView component**

```tsx
import type { Quote, IndexQuote } from '../types';
import './SummaryView.css';

interface SummaryViewProps {
  quotes: Quote[];
  indices: IndexQuote[];
}

export function SummaryView({ quotes, indices }: SummaryViewProps) {
  const top50 = quotes.slice(0, 50);

  return (
    <div className="summary-view">
      <div className="index-cards">
        {indices.map(idx => (
          <div key={idx.symbol} className="index-card">
            <div className="index-name">{idx.name}</div>
            <div className="index-price">{idx.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className={`index-change ${idx.changePercent > 0 ? 'up' : idx.changePercent < 0 ? 'down' : ''}`}>
              {idx.changePercent > 0 ? '+' : ''}{idx.change?.toFixed(2)} ({idx.changePercent > 0 ? '+' : ''}{idx.changePercent?.toFixed(2)}%)
            </div>
          </div>
        ))}
      </div>

      <table className="summary-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th className="num">Price</th>
            <th className="num">Change</th>
            <th className="num">%</th>
          </tr>
        </thead>
        <tbody>
          {top50.map(q => (
            <tr key={q.symbol}>
              <td className="symbol">{q.symbol}</td>
              <td className="num">${q.price?.toFixed(2)}</td>
              <td className={`num ${q.change > 0 ? 'up' : q.change < 0 ? 'down' : ''}`}>
                {q.change > 0 ? '+' : ''}{q.change?.toFixed(2)}
              </td>
              <td className={`num ${q.changePercent > 0 ? 'up' : q.changePercent < 0 ? 'down' : ''}`}>
                {q.changePercent > 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create SummaryView styles**

```css
.summary-view {
  padding: 0 32px 32px;
}

.index-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.index-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}

.index-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.index-price {
  font-size: 24px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.index-change {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.summary-table thead {
  position: sticky;
  top: 0;
  background: var(--bg);
}

.summary-table th {
  text-align: left;
  padding: 10px 12px;
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
}

.summary-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  font-variant-numeric: tabular-nums;
}

.summary-table tbody tr {
  transition: background 0.15s;
}

.summary-table tbody tr:hover {
  background: rgba(128, 128, 128, 0.06);
}

.summary-table .symbol {
  font-weight: 600;
}

.summary-table .num,
.summary-table th.num {
  text-align: right;
}

.up { color: var(--positive); }
.down { color: var(--negative); }

@media (max-width: 768px) {
  .summary-view {
    padding: 0 20px 20px;
  }

  .index-cards {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SummaryView.tsx src/components/SummaryView.css
git commit -m "feat: add SummaryView with index cards and stock table"
```

---

## Task 9: Frontend — Top Movers View

**Files:**
- Create: `src/components/TopMoversView.tsx`
- Create: `src/components/TopMoversView.css`

- [ ] **Step 1: Create TopMoversView component**

```tsx
import type { Quote } from '../types';
import './TopMoversView.css';

interface TopMoversViewProps {
  quotes: Quote[];
}

export function TopMoversView({ quotes }: TopMoversViewProps) {
  const gainers = quotes
    .filter(q => q.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 10);

  const losers = quotes
    .filter(q => q.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 10);

  return (
    <div className="movers-view">
      <div className="movers-section">
        <h3 className="movers-title">Gainers</h3>
        <div className="movers-grid">
          {gainers.map(q => (
            <div key={q.symbol} className="mover-card">
              <div className="mover-symbol">{q.symbol}</div>
              <div className="mover-price">${q.price?.toFixed(2)}</div>
              <div className="mover-percent up">
                +{q.changePercent?.toFixed(2)}%
              </div>
            </div>
          ))}
          {gainers.length === 0 && <div className="movers-empty">No gainers</div>}
        </div>
      </div>

      <div className="movers-section">
        <h3 className="movers-title">Losers</h3>
        <div className="movers-grid">
          {losers.map(q => (
            <div key={q.symbol} className="mover-card">
              <div className="mover-symbol">{q.symbol}</div>
              <div className="mover-price">${q.price?.toFixed(2)}</div>
              <div className="mover-percent down">
                {q.changePercent?.toFixed(2)}%
              </div>
            </div>
          ))}
          {losers.length === 0 && <div className="movers-empty">No losers</div>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create TopMoversView styles**

```css
.movers-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 0 32px 32px;
}

.movers-title {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.movers-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mover-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  transition: background 0.15s;
}

.mover-card:hover {
  background: var(--pill-active-bg);
}

.mover-symbol {
  font-weight: 600;
  font-size: 14px;
  min-width: 60px;
}

.mover-price {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}

.mover-percent {
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  min-width: 80px;
  text-align: right;
}

.movers-empty {
  color: var(--text-secondary);
  font-size: 14px;
  padding: 12px;
}

@media (max-width: 768px) {
  .movers-view {
    grid-template-columns: 1fr;
    padding: 0 20px 20px;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/TopMoversView.tsx src/components/TopMoversView.css
git commit -m "feat: add TopMoversView with gainers and losers cards"
```

---

## Task 10: Frontend — Grid View

**Files:**
- Create: `src/components/GridView.tsx`
- Create: `src/components/GridView.css`

- [ ] **Step 1: Create GridView component**

```tsx
import { useState } from 'react';
import type { Quote } from '../types';
import './GridView.css';

interface GridViewProps {
  quotes: Quote[];
}

type SortKey = 'symbol' | 'price' | 'change' | 'changePercent';
type SortDir = 'asc' | 'desc';

export function GridView({ quotes }: GridViewProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = sortKey
    ? [...quotes].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      })
    : quotes;

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div className="grid-view">
      <table className="grid-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('symbol')}>Symbol{arrow('symbol')}</th>
            <th className="num" onClick={() => handleSort('price')}>Price{arrow('price')}</th>
            <th className="num" onClick={() => handleSort('change')}>Change{arrow('change')}</th>
            <th className="num" onClick={() => handleSort('changePercent')}>%{arrow('changePercent')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(q => (
            <tr key={q.symbol}>
              <td className="symbol">{q.symbol}</td>
              <td className="num">${q.price?.toFixed(2)}</td>
              <td className={`num ${q.change > 0 ? 'up' : q.change < 0 ? 'down' : ''}`}>
                {q.change > 0 ? '+' : ''}{q.change?.toFixed(2)}
              </td>
              <td className={`num ${q.changePercent > 0 ? 'up' : q.changePercent < 0 ? 'down' : ''}`}>
                {q.changePercent > 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create GridView styles**

```css
.grid-view {
  padding: 0 32px 32px;
  overflow-x: auto;
}

.grid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.grid-table thead {
  position: sticky;
  top: 0;
  background: var(--bg);
}

.grid-table th {
  text-align: left;
  padding: 6px 10px;
  font-weight: 500;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.grid-table th:hover {
  color: var(--text);
}

.grid-table td {
  padding: 5px 10px;
  border-bottom: 1px solid var(--border);
  font-variant-numeric: tabular-nums;
}

.grid-table tbody tr {
  transition: background 0.15s;
}

.grid-table tbody tr:hover {
  background: rgba(128, 128, 128, 0.06);
}

.grid-table .symbol {
  font-weight: 600;
}

.grid-table .num,
.grid-table th.num {
  text-align: right;
}

@media (max-width: 768px) {
  .grid-view {
    padding: 0 12px 20px;
  }

  .grid-table {
    min-width: 400px;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/GridView.tsx src/components/GridView.css
git commit -m "feat: add GridView with sortable dense stock table"
```

---

## Task 11: Frontend — Wire It All Together in App

**Files:**
- Modify: `src/App.tsx` (rewrite)
- Modify: `src/App.css` (rewrite)

- [ ] **Step 1: Rewrite App.tsx to compose all components**

```tsx
import { useLocalStorage } from './hooks/useLocalStorage';
import { usePolling } from './hooks/usePolling';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { SummaryView } from './components/SummaryView';
import { TopMoversView } from './components/TopMoversView';
import { GridView } from './components/GridView';
import type { Market, View, PollingSpeed } from './types';
import './App.css';

function App() {
  const [theme, setTheme] = useLocalStorage('xtox-theme', 'dark');
  const [market, setMarket] = useLocalStorage<Market>('xtox-market', 'nasdaq');
  const [view, setView] = useLocalStorage<View>('xtox-view', 'summary');
  const [pollingSpeed, setPollingSpeed] = useLocalStorage<PollingSpeed>('xtox-speed', 5000);

  const { quotes, indices, loading, switching, error } = usePolling(market, pollingSpeed);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
  };

  return (
    <div className="app">
      <Header
        theme={theme}
        onThemeToggle={toggleTheme}
        pollingSpeed={pollingSpeed}
        onPollingSpeedChange={setPollingSpeed}
      />
      <Toolbar
        market={market}
        onMarketChange={setMarket}
        view={view}
        onViewChange={setView}
      />

      <main className={`content${switching ? ' switching' : ''}`}>
        {error && <div className="error-banner">Connection lost. Retrying...</div>}
        {loading ? (
          <div className="state-msg"><div className="spinner" />Loading market data...</div>
        ) : quotes.length === 0 ? (
          <div className="state-msg">No data available</div>
        ) : (
          <>
            {view === 'summary' && <SummaryView quotes={quotes} indices={indices} />}
            {view === 'movers' && <TopMoversView quotes={quotes} />}
            {view === 'grid' && <GridView quotes={quotes} />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Rewrite App.css**

```css
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
}

.state-msg {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: var(--text-secondary);
  font-size: 15px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--text-secondary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.content.switching {
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 0.15s;
}

.error-banner {
  text-align: center;
  padding: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  background: var(--negative);
}
```

- [ ] **Step 3: Verify dev server runs**

```bash
npm run dev
```

Open http://localhost:5173 and verify:
- XTOX logo with theme toggle and polling speed in header
- Market pills (NASDAQ-100, S&P 500, DOW 30) and view pills (Summary, Top Movers, Grid)
- Summary view shows 3 index cards + stock table
- Switching views works
- Switching markets fetches new data
- Theme toggle works
- Polling speed dropdown works

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/App.css
git commit -m "feat: wire all components into App with state management"
```

---

## Task 12: Final Verification

Note: The existing `vite.config.ts` already proxies `/api` to `http://localhost:3001` — no changes needed there.

- [ ] **Step 1: Verify build succeeds**

```bash
npx vite build
```

Expected: clean build with no errors.

- [ ] **Step 2: Final commit (if any uncommitted changes)**

```bash
git add -A
git commit -m "chore: verify build and final cleanup"
```
