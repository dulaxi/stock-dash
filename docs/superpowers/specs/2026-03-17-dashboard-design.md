# XTOX Stock Dashboard — Design Spec

## Overview

XTOX is a clean, login-free stock dashboard for quick market scanning. Users land on the page and immediately see what's moving — no accounts, no clutter. Built with React + Vite frontend and a Node.js/Express backend using Yahoo Finance data.

## Design Principles

- Quick scan tool: fast in, fast out
- Minimalist, Apple-like aesthetic
- Dark mode default
- Fonts: Tanker (logo), Satoshi (everything else)

## Layout

Single page, no routing. Top-down structure:

```
┌──────────────────────────────────────────────────────────┐
│  XTOX                              ☀/🌙  Live · 5s ▾    │
│                                                          │
│  [NASDAQ-100]  [S&P 500]  [DOW 30]                      │
│  [Summary]  [Top Movers]  [Grid]                         │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │            Active view renders here              │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

- **Top bar:** XTOX logo (left), theme toggle + polling speed dropdown (right)
- **Toolbar row 1:** Market selector — pill buttons (NASDAQ-100 / S&P 500 / DOW 30)
- **Toolbar row 2:** View selector — pill buttons (Summary / Top Movers / Grid)
- Content area below renders the active view

### Responsive behavior
- Desktop (>768px): layout as shown above
- Mobile (<=768px): toolbars stack, Top Movers gainers/losers stack vertically, tables scroll horizontally

## Views

### Summary View
- Top row: always shows all 3 major index cards (^IXIC, ^GSPC, ^DJI) regardless of selected market — gives full market context at a glance
- Below: stock table for the selected market with slim columns — Symbol, Price, Change, %
- Backend returns results pre-sorted by market cap (largest first). No marketCap field in the payload — sort order is baked in server-side
- Summary table shows top 50 stocks only (truncated for quick scan). Grid shows all.

### Top Movers View
- Two sections side by side: "Gainers" and "Losers"
- Each shows top 10 stocks sorted by `changePercent` (highest absolute value)
- Compact cards: symbol, price, % change with big green/red % number as visual anchor
- If fewer than 10 gainers or losers exist, show however many there are
- Stocks with exactly 0% change are excluded from both lists
- No table — cards only

### Grid View
- Dense table, smaller font, tighter rows
- All stocks visible (no truncation), slim columns: Symbol, Price, Change, %
- Sortable by clicking column headers (toggle asc/desc)
- Default sort: by market cap (server order)
- Maximum data density — this is the Bloomberg-lite view

## Data Per Stock

Slim payload: `symbol`, `price`, `change`, `changePercent`

## Colors

- **Positive change:** `#34c759` (green) — also prefixed with `+`
- **Negative change:** `#ff3b30` (red) — prefixed with `-`
- **Zero change:** `var(--text-secondary)` — shown as `0.00`
- The `+`/`-` prefix ensures the data is readable without color (accessibility)

## Markets

Symbol lists are hardcoded in the backend only (single source of truth):
- NASDAQ-100: ~100 symbols
- S&P 500: ~500 symbols
- DOW 30: 30 symbols

## Backend (server.js)

- **Endpoints:**
  - `GET /api/quotes/nasdaq` — NASDAQ-100 quotes, pre-sorted by market cap
  - `GET /api/quotes/sp500` — S&P 500 quotes, pre-sorted by market cap
  - `GET /api/quotes/dow` — DOW 30 quotes, pre-sorted by market cap
  - `GET /api/indices` — Returns all 3 index quotes (^IXIC, ^GSPC, ^DJI) in one call
- **Caching:** Per-endpoint in-memory cache, 3-second TTL. If cache population fails, stale cache is served. Index endpoint uses the same 3s TTL.
- **Quotes payload:** `[{ symbol, price, change, changePercent }]`
- **Index payload:** `[{ symbol, name, price, change, changePercent }]`

## Frontend Polling

- Polls the active market's quotes endpoint + the indices endpoint at user-selected interval (5s / 10s / 30s)
- Switching markets triggers immediate fetch, then resumes interval
- Switching views does not re-fetch — same data, different presentation

## States

### Loading
- Initial load: centered spinner with "Loading market data..." text
- Market switch: show previous data dimmed with a subtle loading indicator (no full-screen spinner)

### Error
- If backend is unreachable on initial load: "Unable to connect. Retrying..." with auto-retry every 5s
- If a poll fails mid-session: silently keep showing the last successful data. After 3 consecutive failures, show a subtle "Connection lost" banner at the top that auto-dismisses when data resumes
- Partial failures (some symbols fail): show whatever succeeded, skip failed symbols silently

### Empty
- If an endpoint returns zero results: "No data available" centered in the content area

## Theme

- Dark mode default
- Sun/moon icon toggle in top-right
- CSS variables swap between dark and light palettes
- Preference stored in `localStorage`

## Polling Speed Control

- Dropdown next to theme toggle: `5s | 10s | 30s`
- Stored in `localStorage`
- Shown as "Live · 5s" label

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express + yahoo-finance2
- **Fonts:** Tanker (Fontshare), Satoshi (Fontshare)
- **Styling:** Plain CSS with CSS variables (no framework)
