# Stock Screener Design

## Overview

Replace the inaccessible Grid view with a Stock Screener — a filterable, sortable stock table with preset and custom filters. This is the core feature that fills the "smart screener" gap identified in market research as the #1 conversion trigger for finance apps.

**Target user:** Investor who wants to quickly find stocks matching specific criteria without paying Finviz Elite ($25/mo).

**Core principle:** Presets teach, filters empower. Clicking a preset shows which filters it sets, teaching users how to build custom screens.

## Architecture

### Navigation

The screener lives inside the HeatmapView as a toggle, sharing the same full-page slot:

```typescript
export type View = 'dashboard' | 'heatmap' | 'movers' | 'screener' | 'watchlist' | 'news';
```

**Navigation paths to screener:**
- Dashboard heatmap "See all →" → full HeatmapView (unchanged). User toggles to Screener from there.
- Direct: App.tsx renders ScreenerView when `view === 'screener'`. HeatmapView renders when `view === 'heatmap'`. Both views have a shared `( Heatmap | Screener )` toggle at the top that switches between them by calling `onNavigate('heatmap')` or `onNavigate('screener')`.
- The `'grid'` value is removed from the View type entirely.

**localStorage migration:** If a returning user has `'grid'` stored in localStorage for `xtox-view`, App.tsx should treat any unrecognized view value as `'dashboard'` (the default). This is handled by adding a validation check after reading from localStorage.

### Data Flow

All filtering is client-side. The screener receives `quotes: Quote[]` from App.tsx (same polled data as every other view). No new API endpoints needed.

```
App.tsx (usePolling → quotes[])
  └→ ScreenerView receives quotes[]
       └→ Applies filters client-side
            └→ Renders filtered + sorted subset
```

### Filter State

```typescript
interface ScreenerFilters {
  sectors: string[];           // empty = all sectors
  marketCapMin: number | null; // null = no minimum
  marketCapMax: number | null; // null = no maximum
  peMin: number | null;
  peMax: number | null;
  changePercentMin: number | null;
  changePercentMax: number | null;
  volumeMin: number | null;
  near52wLow: boolean;         // true = price within 10% of 52W low
}

type PresetName = 'all' | 'value' | 'momentum' | 'megacap' | 'smallcap' | 'near52wlow';
```

**Handling undefined/optional fields:** Stocks with `undefined` values for a filtered field are **excluded** from results when that filter is active. For example, if the P/E filter is set to `< 15`, stocks without a `trailingPE` value are not shown. When no filter is active for a field, stocks with undefined values for that field are included normally.

## Layout

### Full Page Structure

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER BAR                                                    │
├──────────────────────────────────────────────────────────────┤
│ ( Heatmap | Screener )                                        │  ← View toggle (shared with HeatmapView)
├──────────────────────────────────────────────────────────────┤
│ ( All | Value | Momentum | Mega Cap | Small Cap | Near 52W Low ) │ ← Preset pills
├──────────────────────────────────────────────────────────────┤
│ Sector [▼]  Market Cap [▼]  P/E [▼]  Change% [▼]  Volume [▼]  [Clear All] │ ← Filter bar
├──────────────────────────────────────────────────────────────┤
│ 42 of 164 stocks                                              │ ← Result count
├──────────────────────────────────────────────────────────────┤
│ Symbol▼  Price  Change  %Change  Volume  Mkt Cap  P/E  Sector │ ← Sortable headers
│ AAPL     248.96  -0.98   -0.4%   34.5M   3.6T    33.2  Tech  │
│ MSFT     420.12  +1.24   +0.3%   22.1M   3.1T    35.8  Tech  │
│ ...                                                            │
└──────────────────────────────────────────────────────────────┘
```

The `( Heatmap | Screener )` toggle appears at the same position as HeatmapView's existing `( By Market Cap | By Sector )` toggle. When in Heatmap mode, the market-cap/sector toggle shows. When in Screener mode, the preset pills and filter bar show instead. The view toggle is always visible in both modes.

### Preset Definitions

| Preset | Label | Filters Applied |
|--------|-------|-----------------|
| all | All | No filters — show everything |
| value | Value | P/E: 1–15, Market Cap: >10B |
| momentum | Momentum | Change %: >2%, Volume: >1M |
| megacap | Mega Cap | Market Cap: >500B |
| smallcap | Small Cap | Market Cap: <10B |
| near52wlow | Near 52W Low | `near52wLow: true` (price within 10% of 52W low) |

### Filter Dropdowns

Each filter is a dropdown that opens on click:

**Sector:** Checkbox list of all sectors present in the data. "Select All" / "Clear" buttons at top. Styled as a multi-select dropdown.

**Market Cap:** Range selector with preset buttons:
- `> 500B` (Mega), `> 100B` (Large), `> 10B` (Mid), `< 10B` (Small), `< 1B` (Micro)
- Or custom min/max inputs

**P/E:** Min/max number inputs. Common presets: `< 15` (Value), `< 25` (Moderate), `> 25` (Growth)

**Change %:** Min/max number inputs. Common presets: `> 2%` (Up big), `< -2%` (Down big)

**Volume:** Minimum threshold. Presets: `> 10M`, `> 1M`, `> 100K`

**Clear All:** Resets all filters, selects "All" preset.

### Filter Interaction

- Clicking a preset sets all filter dropdowns to match the preset's criteria and highlights the preset pill as active
- Manually changing any filter dropdown deselects all preset pills (shows as "Custom" state)
- If manual filter changes happen to exactly match a preset, that preset highlights
- Filter changes are instant (client-side filtering, no debounce needed)
- Active filters show a count badge on the filter bar: "3 filters active"

### Sortable Table

The table columns are a curated subset designed for screening. This deliberately drops `Open`, `Day High`, and `Day Low` from the existing GridView (less useful for screening) and adds `Sector` (essential for screening).

| Column | Sortable | Format |
|--------|----------|--------|
| Symbol | Yes | Text, with company logo via existing `getLogoUrl()` from `tickerDomains.ts` |
| Price | Yes | $XXX.XX |
| Change | Yes | $X.XX (colored green/red) |
| Change % | Yes | X.XX% (colored green/red) |
| Volume | Yes | Abbreviated (34.5M) |
| Market Cap | Yes | Abbreviated (3.6T) |
| P/E | Yes | XX.X or — if undefined |
| Sector | Yes | Text or — if undefined |
| 52W High | Yes | $XXX.XX |
| 52W Low | Yes | $XXX.XX |

Sort indicators use Phosphor `SortAscending` / `SortDescending` icons.

Click any row → navigate to StockDetail (existing behavior via `onSelectStock`).

## Component Architecture

### New Components

```
src/components/
├── ScreenerView.tsx        # Full screener page (presets + filters + table)
├── ScreenerView.css        # Screener styles
├── ScreenerFilters.tsx     # Filter bar with dropdowns
├── FilterDropdown.tsx      # Reusable dropdown component for each filter
```

### Modified Components

- **HeatmapView.tsx:** Replace the existing `( By Market Cap | By Sector )` toggle with a two-level toggle. Top level: `( Heatmap | Screener )`. When Heatmap is selected, show the `( By Market Cap | By Sector )` sub-toggle below. When Screener is selected, call `onNavigate('screener')` to switch view.
- **App.tsx:** Replace `'grid'` with `'screener'` in view rendering. Remove GridView import, add ScreenerView. Add validation on localStorage read to default unrecognized view values to `'dashboard'`. Pass `onNavigate` to both HeatmapView and ScreenerView so they can toggle between each other.
- **types.ts:** Update View type to replace `'grid'` with `'screener'`.
- **Toolbar.tsx:** This is dead code (not imported by App.tsx since the dashboard redesign). No changes needed — it will be deleted in the cleanup task.

### Deprecated Components

- **GridView.tsx** — functionality absorbed into ScreenerView's table. Delete after screener is working.

## Responsive Behavior

### Desktop (>1200px)
Full layout as described. All filter dropdowns visible in one row.

### Tablet (768-1200px)
Filter dropdowns wrap to second row if needed. Table shows all columns.

### Mobile (<768px)
- Preset pills scroll horizontally
- Filter bar collapses to a "Filters" button with a count badge. Tapping opens a sheet/modal with all filter options.
- Table hides 52W High/Low columns. Remaining columns scroll horizontally.

## Performance

- All filtering is client-side on ~150 quotes. No performance concerns.
- Filter state is local to ScreenerView (no persistence needed in v1).
- Sorting logic ported from existing GridView.
- `useMemo` on filtered+sorted results keyed on `[quotes, filters, sortKey, sortDir]`.

## Out of Scope (v1)

- Saving custom screens / filter presets
- Detail-level filter fields (deferred — see project memory `project_screener_deferred.md` for full list of fields that need batch detail caching)
- Export to CSV
- Column visibility customization
- Persistent filter state across sessions
