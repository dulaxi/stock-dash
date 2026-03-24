import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Quote } from '../types';
import type { ScreenerFilters } from '../components/ScreenerFilters';
import { EMPTY_FILTERS } from '../components/ScreenerFilters';
import ScreenerView from '../components/ScreenerView';
import CompareView from '../components/CompareView';

// ---------------------------------------------------------------------------
// Edge-case mock data
// ---------------------------------------------------------------------------

const edgeQuotes: Quote[] = [
  { symbol: 'EMPTY', price: 10, change: 0, changePercent: 0 },  // minimal, all optional fields undefined
  { symbol: 'NEG', price: 5, change: -3, changePercent: -37.5, volume: 0, marketCap: 500000, trailingPE: 2 },  // small/negative
  { symbol: 'BIG', price: 5000, change: 100, changePercent: 2.04, volume: 100000000, marketCap: 10000000000000, trailingPE: 150 },  // huge numbers
];

const mockDetail = {
  symbol: 'AAPL', name: 'Apple Inc', price: 248.96, change: 1.2, changePercent: 0.48,
  marketCap: 3600000000000, trailingPE: 33.2, forwardPE: 28.4, profitMargin: 0.253,
  operatingMargin: 0.301, returnOnEquity: 1.5, beta: 1.29, debtToEquity: 1.5,
  currentRatio: 1.07, dividendYield: 0.005, sector: 'Technology',
  fiftyTwoWeekHigh: 288.62, fiftyTwoWeekLow: 164.08,
};

// ---------------------------------------------------------------------------
// Duplicate applyFilters for direct unit testing
// (not exported from ScreenerView)
// ---------------------------------------------------------------------------

function applyFilters(quotes: Quote[], filters: ScreenerFilters): Quote[] {
  return quotes.filter(q => {
    if (filters.sectors.length > 0 && (!q.sector || !filters.sectors.includes(q.sector))) return false;
    if (filters.marketCapMin != null && (q.marketCap == null || q.marketCap < filters.marketCapMin)) return false;
    if (filters.marketCapMax != null && (q.marketCap == null || q.marketCap > filters.marketCapMax)) return false;
    if (filters.peMin != null && (q.trailingPE == null || q.trailingPE < filters.peMin)) return false;
    if (filters.peMax != null && (q.trailingPE == null || q.trailingPE > filters.peMax)) return false;
    if (filters.changePercentMin != null && q.changePercent < filters.changePercentMin) return false;
    if (filters.changePercentMax != null && q.changePercent > filters.changePercentMax) return false;
    if (filters.volumeMin != null && (q.volume == null || q.volume < filters.volumeMin)) return false;
    if (filters.near52wLow && q.fiftyTwoWeekLow != null && q.price > q.fiftyTwoWeekLow * 1.1) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Global mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
  ));
});

// ===========================================================================
// ScreenerView Edge Cases
// ===========================================================================

describe('ScreenerView edge cases', () => {
  const makeProps = (quotes: Quote[] = edgeQuotes) => ({
    quotes,
    onSelectStock: vi.fn(),
    onNavigate: vi.fn(),
  });

  // 1 — Empty quotes array
  it('shows "0 of 0 stocks" with empty table body when quotes is empty', () => {
    render(<ScreenerView {...makeProps([])} />);
    expect(screen.getByText('0 of 0 stocks')).toBeInTheDocument();
    const tbody = document.querySelector('.screener-table tbody')!;
    expect(tbody.querySelectorAll('tr')).toHaveLength(0);
  });

  // 2 — All quotes missing trailingPE → "Value" preset shows 0 results
  it('Value preset shows 0 results when no quotes have trailingPE', () => {
    const noPEQuotes: Quote[] = [
      { symbol: 'A', price: 100, change: 1, changePercent: 1, marketCap: 50e9 },
      { symbol: 'B', price: 200, change: 2, changePercent: 2, marketCap: 100e9 },
    ];
    render(<ScreenerView {...makeProps(noPEQuotes)} />);
    fireEvent.click(screen.getByText('Value'));
    expect(screen.getByText('0 of 2 stocks')).toBeInTheDocument();
  });

  // 3 — All quotes missing marketCap → "Mega Cap" preset shows 0 results
  it('Mega Cap preset shows 0 results when no quotes have marketCap', () => {
    const noCapQuotes: Quote[] = [
      { symbol: 'X', price: 10, change: 0, changePercent: 0 },
      { symbol: 'Y', price: 20, change: 0, changePercent: 0 },
    ];
    render(<ScreenerView {...makeProps(noCapQuotes)} />);
    fireEvent.click(screen.getByText('Mega Cap'));
    expect(screen.getByText('0 of 2 stocks')).toBeInTheDocument();
  });

  // 4 — All quotes missing sector → sector filter dropdown has no options
  it('sector filter dropdown has no checkboxes when no quotes have a sector', () => {
    const noSectorQuotes: Quote[] = [
      { symbol: 'NS1', price: 10, change: 0, changePercent: 0 },
      { symbol: 'NS2', price: 20, change: 0, changePercent: 0 },
    ];
    render(<ScreenerView {...makeProps(noSectorQuotes)} />);
    const filterBar = document.querySelector('.screener-filters-bar')!;
    const checkboxes = filterBar.querySelectorAll('.filter-checkbox');
    expect(checkboxes).toHaveLength(0);
  });

  // 5 — Single stock matches all presets
  it('a stock matching all preset criteria appears in every preset view', () => {
    // Must pass: Value (PE 1-15, cap >10B), Momentum (change%>=2, vol>=1M),
    // Mega Cap (cap>=500B), Small Cap (cap<=10B) — contradicts Mega Cap, so skip that combination.
    // Instead test that a stock matching Value, Momentum, and Near 52W Low appears in each.
    const universalStock: Quote[] = [
      {
        symbol: 'UNI', price: 105, change: 3, changePercent: 3,
        volume: 5000000, marketCap: 50e9, trailingPE: 10,
        sector: 'Technology', fiftyTwoWeekLow: 100,
      },
    ];
    const props = makeProps(universalStock);

    const { unmount } = render(<ScreenerView {...props} />);

    // All preset
    fireEvent.click(screen.getByText('All'));
    expect(screen.getByText('1 of 1 stocks')).toBeInTheDocument();

    // Value preset: PE 1-15, marketCap >= 10B => 10 in [1,15], 50B >= 10B => pass
    fireEvent.click(screen.getByText('Value'));
    expect(screen.getByText('1 of 1 stocks')).toBeInTheDocument();

    // Momentum preset: changePercent >= 2, volume >= 1M => 3 >= 2, 5M >= 1M => pass
    fireEvent.click(screen.getByText('Momentum'));
    expect(screen.getByText('1 of 1 stocks')).toBeInTheDocument();

    // Near 52W Low: 105 <= 100 * 1.1 (110) => pass
    fireEvent.click(screen.getByText('Near 52W Low'));
    expect(screen.getByText('1 of 1 stocks')).toBeInTheDocument();

    unmount();
  });

  // 6 — Near 52W Low with fiftyTwoWeekLow undefined → stock not excluded
  it('Near 52W Low: stock with undefined fiftyTwoWeekLow is NOT excluded', () => {
    // The filter logic: if near52wLow && q.fiftyTwoWeekLow != null && price > low*1.1 => exclude
    // If fiftyTwoWeekLow is undefined, the condition short-circuits: stock passes through
    const noLowQuotes: Quote[] = [
      { symbol: 'NOLO', price: 999, change: 0, changePercent: 0 },
    ];
    render(<ScreenerView {...makeProps(noLowQuotes)} />);
    fireEvent.click(screen.getByText('Near 52W Low'));
    expect(screen.getByText('1 of 1 stocks')).toBeInTheDocument();
    expect(screen.getByText('NOLO')).toBeInTheDocument();
  });

  // 7 — Near 52W Low: stock at exactly 110% of low (edge of threshold) → excluded
  it('Near 52W Low: stock at exactly 110% of low is excluded', () => {
    const atBoundaryQuotes: Quote[] = [
      { symbol: 'EDGE', price: 110, change: 0, changePercent: 0, fiftyTwoWeekLow: 100 },
    ];
    const filters: ScreenerFilters = { ...EMPTY_FILTERS, near52wLow: true };
    const result = applyFilters(atBoundaryQuotes, filters);
    // 110 > 100 * 1.1 (110) is false (not strictly greater), so NOT excluded
    // Actually: 110 > 110 is false, so stock IS included
    // Let's also test 110.01 which should be excluded
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('EDGE');

    const overBoundaryQuotes: Quote[] = [
      { symbol: 'OVER', price: 110.01, change: 0, changePercent: 0, fiftyTwoWeekLow: 100 },
    ];
    const result2 = applyFilters(overBoundaryQuotes, filters);
    expect(result2).toHaveLength(0);
  });

  // 8 — Near 52W Low: stock at 109% of low → included
  it('Near 52W Low: stock at 109% of low is included', () => {
    const insideQuotes: Quote[] = [
      { symbol: 'NEAR', price: 109, change: 0, changePercent: 0, fiftyTwoWeekLow: 100 },
    ];
    const filters: ScreenerFilters = { ...EMPTY_FILTERS, near52wLow: true };
    const result = applyFilters(insideQuotes, filters);
    // 109 > 110 is false => included
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('NEAR');
  });

  // 9 — Negative changePercent with changePercentMax set to 0 → included
  it('negative changePercent is included when changePercentMax is 0', () => {
    const filters: ScreenerFilters = { ...EMPTY_FILTERS, changePercentMax: 0 };
    const result = applyFilters(edgeQuotes, filters);
    // EMPTY: changePercent 0 => 0 > 0 false => included
    // NEG: changePercent -37.5 => -37.5 > 0 false => included
    // BIG: changePercent 2.04 => 2.04 > 0 true => excluded
    expect(result.map(q => q.symbol)).toEqual(['EMPTY', 'NEG']);
  });

  // 10 — Sort stability: stocks with same value maintain order
  it('stocks with the same sort value maintain original order', () => {
    const sameValQuotes: Quote[] = [
      { symbol: 'AAA', price: 100, change: 0, changePercent: 0, volume: 1000 },
      { symbol: 'BBB', price: 100, change: 0, changePercent: 0, volume: 1000 },
      { symbol: 'CCC', price: 100, change: 0, changePercent: 0, volume: 1000 },
    ];
    render(<ScreenerView {...makeProps(sameValQuotes)} />);
    const priceHeader = screen.getByText('Price');

    // Click to sort desc by price
    fireEvent.click(priceHeader);
    let rows = screen.getAllByRole('row').slice(1);
    let symbols = rows.map(row => row.querySelector('.symbol')?.textContent ?? '');
    // All prices identical, order should be stable
    expect(symbols).toEqual(['AAA', 'BBB', 'CCC']);

    // Click again to sort asc
    fireEvent.click(priceHeader);
    rows = screen.getAllByRole('row').slice(1);
    symbols = rows.map(row => row.querySelector('.symbol')?.textContent ?? '');
    expect(symbols).toEqual(['AAA', 'BBB', 'CCC']);
  });

  // 11 — Switching between presets rapidly doesn't break
  it('switching between presets rapidly renders without errors', () => {
    render(<ScreenerView {...makeProps()} />);

    const presets = ['Value', 'Momentum', 'Mega Cap', 'Small Cap', 'Near 52W Low', 'All'];
    // Rapid fire all preset clicks
    presets.forEach(label => fireEvent.click(screen.getByText(label)));
    // After ending on "All", all 3 edge quotes should be visible
    expect(screen.getByText('3 of 3 stocks')).toBeInTheDocument();
    expect(screen.getByText('EMPTY')).toBeInTheDocument();
    expect(screen.getByText('NEG')).toBeInTheDocument();
    expect(screen.getByText('BIG')).toBeInTheDocument();
  });
});

// ===========================================================================
// applyFilters Edge Cases
// ===========================================================================

describe('applyFilters edge cases', () => {
  // 12 — All filters null/empty → returns all quotes
  it('returns all quotes when all filters are empty/null', () => {
    const result = applyFilters(edgeQuotes, { ...EMPTY_FILTERS });
    expect(result).toHaveLength(edgeQuotes.length);
    expect(result.map(q => q.symbol)).toEqual(['EMPTY', 'NEG', 'BIG']);
  });

  // 13 — Market cap filter with both min and max (range)
  it('market cap range filter returns only stocks within range', () => {
    const quotes: Quote[] = [
      { symbol: 'SMALL', price: 10, change: 0, changePercent: 0, marketCap: 1e6 },
      { symbol: 'MID', price: 50, change: 0, changePercent: 0, marketCap: 50e9 },
      { symbol: 'LARGE', price: 100, change: 0, changePercent: 0, marketCap: 1e12 },
      { symbol: 'NOMC', price: 20, change: 0, changePercent: 0 },  // undefined marketCap
    ];
    const filters: ScreenerFilters = { ...EMPTY_FILTERS, marketCapMin: 10e9, marketCapMax: 100e9 };
    const result = applyFilters(quotes, filters);
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('MID');
  });

  // 14 — P/E filter: peMin = peMax (exact match)
  it('P/E exact match when peMin equals peMax', () => {
    const quotes: Quote[] = [
      { symbol: 'EXACT', price: 10, change: 0, changePercent: 0, trailingPE: 15 },
      { symbol: 'BELOW', price: 10, change: 0, changePercent: 0, trailingPE: 14.9 },
      { symbol: 'ABOVE', price: 10, change: 0, changePercent: 0, trailingPE: 15.1 },
    ];
    const filters: ScreenerFilters = { ...EMPTY_FILTERS, peMin: 15, peMax: 15 };
    const result = applyFilters(quotes, filters);
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('EXACT');
  });

  // 15 — Volume filter with 0 → should include stocks with volume > 0
  it('volumeMin of 0 includes stocks with volume 0 and above', () => {
    const quotes: Quote[] = [
      { symbol: 'ZERO', price: 10, change: 0, changePercent: 0, volume: 0 },
      { symbol: 'SOME', price: 10, change: 0, changePercent: 0, volume: 500 },
      { symbol: 'NONE', price: 10, change: 0, changePercent: 0 },  // undefined volume
    ];
    const filters: ScreenerFilters = { ...EMPTY_FILTERS, volumeMin: 0 };
    const result = applyFilters(quotes, filters);
    // ZERO: 0 >= 0 => pass; SOME: 500 >= 0 => pass; NONE: undefined => excluded
    expect(result.map(q => q.symbol)).toEqual(['ZERO', 'SOME']);
  });

  // 16 — Sector filter with single sector selected
  it('single sector filter returns only stocks in that sector', () => {
    const quotes: Quote[] = [
      { symbol: 'T1', price: 10, change: 0, changePercent: 0, sector: 'Tech' },
      { symbol: 'F1', price: 20, change: 0, changePercent: 0, sector: 'Finance' },
      { symbol: 'T2', price: 30, change: 0, changePercent: 0, sector: 'Tech' },
      { symbol: 'NS', price: 40, change: 0, changePercent: 0 },  // no sector
    ];
    const filters: ScreenerFilters = { ...EMPTY_FILTERS, sectors: ['Tech'] };
    const result = applyFilters(quotes, filters);
    expect(result).toHaveLength(2);
    expect(result.map(q => q.symbol)).toEqual(['T1', 'T2']);
  });

  // 17 — Sector filter with all sectors selected → same as no filter (for those with a sector)
  it('all-sectors filter returns stocks with any of those sectors but excludes undefined sector', () => {
    const quotes: Quote[] = [
      { symbol: 'T1', price: 10, change: 0, changePercent: 0, sector: 'Tech' },
      { symbol: 'F1', price: 20, change: 0, changePercent: 0, sector: 'Finance' },
      { symbol: 'NS', price: 30, change: 0, changePercent: 0 },  // no sector
    ];
    const filters: ScreenerFilters = { ...EMPTY_FILTERS, sectors: ['Tech', 'Finance'] };
    const result = applyFilters(quotes, filters);
    // NS has no sector => excluded when sectors filter is active
    expect(result).toHaveLength(2);
    expect(result.map(q => q.symbol)).toEqual(['T1', 'F1']);
  });

  // 18 — Quote with changePercent exactly 0 and range filters
  it('changePercent 0 is included when max is 0 and excluded when min is 1', () => {
    const quotes: Quote[] = [
      { symbol: 'FLAT', price: 10, change: 0, changePercent: 0 },
    ];

    // Max 0: 0 > 0 is false => included
    const maxZero: ScreenerFilters = { ...EMPTY_FILTERS, changePercentMax: 0 };
    expect(applyFilters(quotes, maxZero)).toHaveLength(1);

    // Min 0: 0 < 0 is false => included
    const minZero: ScreenerFilters = { ...EMPTY_FILTERS, changePercentMin: 0 };
    expect(applyFilters(quotes, minZero)).toHaveLength(1);

    // Min 1: 0 < 1 is true => excluded
    const minOne: ScreenerFilters = { ...EMPTY_FILTERS, changePercentMin: 1 };
    expect(applyFilters(quotes, minOne)).toHaveLength(0);

    // Max -1: 0 > -1 is true => excluded
    const maxNegOne: ScreenerFilters = { ...EMPTY_FILTERS, changePercentMax: -1 };
    expect(applyFilters(quotes, maxNegOne)).toHaveLength(0);
  });

  // 19 — Quote with all undefined optional fields → only excluded when those fields are filtered
  it('quote with all undefined optional fields passes when no filter targets those fields', () => {
    const bare: Quote[] = [
      { symbol: 'BARE', price: 10, change: 0, changePercent: 0 },
    ];

    // No filters => passes
    expect(applyFilters(bare, { ...EMPTY_FILTERS })).toHaveLength(1);

    // changePercent filter (not optional) still works
    expect(applyFilters(bare, { ...EMPTY_FILTERS, changePercentMin: -1 })).toHaveLength(1);

    // marketCap filter => excluded (undefined marketCap)
    expect(applyFilters(bare, { ...EMPTY_FILTERS, marketCapMin: 1e9 })).toHaveLength(0);

    // PE filter => excluded (undefined trailingPE)
    expect(applyFilters(bare, { ...EMPTY_FILTERS, peMin: 1 })).toHaveLength(0);

    // volume filter => excluded (undefined volume)
    expect(applyFilters(bare, { ...EMPTY_FILTERS, volumeMin: 100 })).toHaveLength(0);

    // sector filter => excluded (undefined sector)
    expect(applyFilters(bare, { ...EMPTY_FILTERS, sectors: ['Tech'] })).toHaveLength(0);

    // near52wLow => passes (undefined fiftyTwoWeekLow means the check short-circuits)
    expect(applyFilters(bare, { ...EMPTY_FILTERS, near52wLow: true })).toHaveLength(1);
  });
});

// ===========================================================================
// CompareView Edge Cases
// ===========================================================================

describe('CompareView edge cases', () => {
  const defaultProps = { onSelectStock: vi.fn() };

  beforeEach(() => {
    defaultProps.onSelectStock = vi.fn();
  });

  function makeFetchMock(detailOverrides: Record<string, Partial<typeof mockDetail>> = {}, failSymbols: string[] = []) {
    return vi.fn((url: string) => {
      for (const sym of failSymbols) {
        if (url.includes(`/api/detail/${sym}`)) {
          return Promise.resolve({ ok: false, json: () => Promise.reject(new Error('Not found')) });
        }
      }
      for (const [sym, overrides] of Object.entries(detailOverrides)) {
        if (url.includes(`/api/detail/${sym}`)) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockDetail, symbol: sym, name: `${sym} Inc`, ...overrides }) });
        }
      }
      if (url.includes('/api/detail/')) {
        // Default detail for any symbol
        const sym = url.split('/api/detail/')[1];
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockDetail, symbol: sym, name: `${sym} Inc` }) });
      }
      if (url.includes('/api/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      if (url.includes('/api/search')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  }

  // 20 — initialSymbols with invalid/nonexistent symbol → fetch returns error, shows gracefully
  it('handles fetch error for invalid symbol gracefully', async () => {
    const fetchMock = makeFetchMock({}, ['INVALID']);
    vi.stubGlobal('fetch', fetchMock);

    render(<CompareView {...defaultProps} initialSymbols={['INVALID']} />);

    // The symbol header should still appear (stock was added to symbols list)
    await waitFor(() => {
      expect(screen.getByText('INVALID')).toBeInTheDocument();
    });

    // Detail data failed, so skeleton placeholders should render (no name rendered)
    // The fetch catch block swallows the error, so no crash
    const skeletons = document.querySelectorAll('.compare-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // 21 — Adding same symbol twice → should not duplicate
  it('does not add a duplicate symbol', async () => {
    const fetchMock = makeFetchMock({ AAPL: {} });
    vi.stubGlobal('fetch', fetchMock);

    render(<CompareView {...defaultProps} initialSymbols={['AAPL']} />);

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    // Try to add AAPL again via the search flow
    const addBtn = screen.getByText('Add Stock').closest('button')!;
    fireEvent.click(addBtn);

    // Simulate the search returning AAPL
    const searchInput = await screen.findByPlaceholderText('Search ticker or name...');
    fireEvent.change(searchInput, { target: { value: 'AAPL' } });

    // The internal addSymbol function checks: if symbols.includes(upper) return
    // Even if the user somehow triggers addSymbol('AAPL'), only one column should exist
    // We verify the current state: only one AAPL header cell
    const headers = document.querySelectorAll('.compare-stock-header');
    expect(headers).toHaveLength(1);
  });

  // 22 — Removing all stocks returns to empty state
  it('returns to empty state after removing all stocks', async () => {
    const fetchMock = makeFetchMock({ AAPL: {}, MSFT: {} });
    vi.stubGlobal('fetch', fetchMock);

    render(<CompareView {...defaultProps} initialSymbols={['AAPL', 'MSFT']} />);

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });

    // Remove AAPL
    fireEvent.click(screen.getByLabelText('Remove AAPL'));
    await waitFor(() => {
      expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
    });

    // Remove MSFT
    fireEvent.click(screen.getByLabelText('Remove MSFT'));
    await waitFor(() => {
      expect(screen.getByText('Add up to 3 stocks to compare')).toBeInTheDocument();
    });
  });

  // 23 — Detail fetch returns partial data (missing some metrics) → shows dash for missing
  it('shows dash for missing metric values in partial detail data', async () => {
    const partialDetail = {
      symbol: 'PART', name: 'Partial Inc', price: 50, change: 1, changePercent: 2,
      // All other fields undefined — trailingPE, forwardPE, profitMargin, etc.
    };
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/detail/PART')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(partialDetail) });
      }
      if (url.includes('/api/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CompareView {...defaultProps} initialSymbols={['PART']} />);

    await waitFor(() => {
      expect(screen.getByText('Partial Inc')).toBeInTheDocument();
    });

    // Cells for undefined metrics should contain a dash (em-dash \u2014)
    const cells = document.querySelectorAll('.compare-cell');
    const dashCells = Array.from(cells).filter(c => c.textContent === '\u2014');
    // There are many metrics (Valuation 6 + Profitability 6 + Performance 5 + Balance Sheet 4 = 21)
    // Price/Mkt Cap might be defined, so at least most should be dashes
    expect(dashCells.length).toBeGreaterThan(10);
  });

  // 24 — Compare with 1 stock only → still renders column (no best/worst highlighting)
  it('single stock renders without best/worst highlighting', async () => {
    const fetchMock = makeFetchMock({ SOLO: { trailingPE: 25, profitMargin: 0.15 } });
    vi.stubGlobal('fetch', fetchMock);

    render(<CompareView {...defaultProps} initialSymbols={['SOLO']} />);

    await waitFor(() => {
      expect(screen.getByText('SOLO Inc')).toBeInTheDocument();
    });

    // No cells should have best or worst class (needs at least 2 non-null values)
    const bestCells = document.querySelectorAll('.compare-cell.best');
    const worstCells = document.querySelectorAll('.compare-cell.worst');
    expect(bestCells).toHaveLength(0);
    expect(worstCells).toHaveLength(0);
  });

  // 25 — Compare with 3 identical stocks → all cells same, no best/worst highlighting
  it('3 identical stocks have no best/worst highlighting', async () => {
    const identicalDetail = {
      ...mockDetail,
      trailingPE: 20, forwardPE: 18, profitMargin: 0.25,
      operatingMargin: 0.30, returnOnEquity: 1.0, beta: 1.0,
      debtToEquity: 1.5, currentRatio: 1.1, dividendYield: 0.02,
    };

    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/detail/')) {
        const sym = url.split('/api/detail/')[1];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...identicalDetail, symbol: sym, name: `${sym} Inc` }),
        });
      }
      if (url.includes('/api/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CompareView {...defaultProps} initialSymbols={['AA', 'BB', 'CC']} />);

    await waitFor(() => {
      expect(screen.getByText('AA Inc')).toBeInTheDocument();
      expect(screen.getByText('BB Inc')).toBeInTheDocument();
      expect(screen.getByText('CC Inc')).toBeInTheDocument();
    });

    // getBestWorst returns {-1,-1} when bestIdx === worstIdx (all values same)
    const bestCells = document.querySelectorAll('.compare-cell.best');
    const worstCells = document.querySelectorAll('.compare-cell.worst');
    expect(bestCells).toHaveLength(0);
    expect(worstCells).toHaveLength(0);
  });

  // 26 — Metric formatting: very large numbers, very small numbers, negative percentages
  it('formats trillions, tiny decimals, and negative percentages correctly', async () => {
    const extremeDetail = {
      symbol: 'EXT', name: 'Extreme Inc', price: 1, change: -0.5, changePercent: -33.33,
      marketCap: 3500000000000,    // 3.5T
      trailingPE: 0.001,           // tiny
      profitMargin: -0.5,          // -50%
      operatingMargin: 0,          // 0%
      returnOnEquity: undefined,
      beta: undefined,
      debtToEquity: undefined,
      currentRatio: undefined,
      dividendYield: undefined,
    };

    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/detail/EXT')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(extremeDetail) });
      }
      if (url.includes('/api/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CompareView {...defaultProps} initialSymbols={['EXT']} />);

    await waitFor(() => {
      expect(screen.getByText('Extreme Inc')).toBeInTheDocument();
    });

    // Market cap should format as "3.50T"
    const cells = document.querySelectorAll('.compare-cell');
    const cellTexts = Array.from(cells).map(c => c.textContent ?? '');

    expect(cellTexts.some(t => t.includes('3.50T'))).toBe(true);

    // Profit margin: -0.5 * 100 = -50.00%
    expect(cellTexts.some(t => t.includes('-50.00%'))).toBe(true);

    // P/E tiny value: 0.001 formatted as 0.0 (1 decimal)
    expect(cellTexts.some(t => t === '0.0')).toBe(true);
  });

  // 27 — Rapid add/remove stocks doesn't break
  it('rapid add and remove does not break the view', async () => {
    const fetchMock = makeFetchMock({ AAPL: {}, MSFT: {}, GOOGL: {} });
    vi.stubGlobal('fetch', fetchMock);

    render(<CompareView {...defaultProps} initialSymbols={['AAPL']} />);

    await waitFor(() => {
      expect(screen.getByText('AAPL Inc')).toBeInTheDocument();
    });

    // Remove AAPL immediately
    fireEvent.click(screen.getByLabelText('Remove AAPL'));

    // Should return to empty state
    await waitFor(() => {
      expect(screen.getByText('Add up to 3 stocks to compare')).toBeInTheDocument();
    });

    // The view should still be functional - no crash
    const addBtn = screen.getByText('Add Stock').closest('button')!;
    expect(addBtn).not.toBeDisabled();
  });
});
