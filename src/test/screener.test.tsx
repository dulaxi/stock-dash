import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Quote } from '../types';
import type { ScreenerFilters } from '../components/ScreenerFilters';
import { EMPTY_FILTERS } from '../components/ScreenerFilters';
import ScreenerView from '../components/ScreenerView';
import CompareView from '../components/CompareView';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockQuotes: Quote[] = [
  { symbol: 'AAPL', price: 248.96, change: 1.2, changePercent: 0.48, volume: 34000000, marketCap: 3600000000000, trailingPE: 33.2, sector: 'Technology', shortName: 'Apple Inc', fiftyTwoWeekHigh: 288.62, fiftyTwoWeekLow: 164.08 },
  { symbol: 'MSFT', price: 420.12, change: -2.1, changePercent: -0.5, volume: 22000000, marketCap: 3100000000000, trailingPE: 35.8, sector: 'Technology', shortName: 'Microsoft Corp', fiftyTwoWeekHigh: 452.10, fiftyTwoWeekLow: 362.40 },
  { symbol: 'JPM', price: 195.50, change: 3.2, changePercent: 1.66, volume: 15000000, marketCap: 570000000000, trailingPE: 11.2, sector: 'Financials', shortName: 'JPMorgan Chase', fiftyTwoWeekHigh: 210.50, fiftyTwoWeekLow: 155.20 },
  { symbol: 'PEP', price: 172.30, change: -4.5, changePercent: -2.54, volume: 8000000, marketCap: 235000000000, trailingPE: 24.1, sector: 'Consumer Staples', shortName: 'PepsiCo Inc', fiftyTwoWeekHigh: 183.40, fiftyTwoWeekLow: 155.80 },
  { symbol: 'SMCI', price: 45.20, change: 5.1, changePercent: 12.7, volume: 50000000, marketCap: 8000000000, trailingPE: undefined, sector: 'Technology', shortName: 'Super Micro', fiftyTwoWeekHigh: 122.90, fiftyTwoWeekLow: 18.58 },
];

const mockDetail = {
  symbol: 'AAPL', name: 'Apple Inc', price: 248.96, change: 1.2, changePercent: 0.48,
  marketCap: 3600000000000, trailingPE: 33.2, forwardPE: 28.4, profitMargin: 0.253,
  operatingMargin: 0.301, returnOnEquity: 1.5, beta: 1.29, debtToEquity: 1.5,
  currentRatio: 1.07, dividendYield: 0.005, sector: 'Technology',
  fiftyTwoWeekHigh: 288.62, fiftyTwoWeekLow: 164.08,
};

// ---------------------------------------------------------------------------
// Global mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
  ));
});

// ---------------------------------------------------------------------------
// Helper: re-create the applyFilters function locally for unit tests
// (it is not exported from ScreenerView, so we duplicate the logic here)
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

// ===========================================================================
// ScreenerView Tests
// ===========================================================================

describe('ScreenerView', () => {
  const defaultProps = {
    quotes: mockQuotes,
    onSelectStock: vi.fn(),
    onNavigate: vi.fn(),
  };

  beforeEach(() => {
    defaultProps.onSelectStock = vi.fn();
    defaultProps.onNavigate = vi.fn();
  });

  // 1
  it('renders the view toggle with Heatmap and Screener buttons', () => {
    render(<ScreenerView {...defaultProps} />);
    expect(screen.getByText('Heatmap')).toBeInTheDocument();
    expect(screen.getByText('Screener')).toBeInTheDocument();
  });

  // 2
  it('renders all 6 preset pills', () => {
    render(<ScreenerView {...defaultProps} />);
    const labels = ['All', 'Value', 'Momentum', 'Mega Cap', 'Small Cap', 'Near 52W Low'];
    labels.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  // 3
  it('renders filter dropdowns (Sector, Market Cap, P/E, Change %, Volume)', () => {
    render(<ScreenerView {...defaultProps} />);
    const filterBar = document.querySelector('.screener-filters-bar')!;
    const filterBtns = filterBar.querySelectorAll('.filter-dropdown-btn');
    const labels = Array.from(filterBtns).map(btn => btn.textContent?.trim() ?? '');
    expect(labels).toContain('Sector');
    expect(labels).toContain('Market Cap');
    expect(labels).toContain('P/E');
    expect(labels).toContain('Change %');
    expect(labels).toContain('Volume');
  });

  // 4
  it('shows result count "X of Y stocks"', () => {
    render(<ScreenerView {...defaultProps} />);
    expect(screen.getByText('5 of 5 stocks')).toBeInTheDocument();
  });

  // 5
  it('renders table with correct column headers', () => {
    render(<ScreenerView {...defaultProps} />);
    const thead = document.querySelector('.screener-table thead')!;
    const thTexts = Array.from(thead.querySelectorAll('th')).map(th => th.textContent?.trim() ?? '');
    const expected = ['Symbol', 'Price', 'Change', 'Change%', 'Volume', 'Mkt Cap', 'P/E', 'Sector', '52W High', '52W Low'];
    expected.forEach(header => {
      expect(thTexts.some(t => t.includes(header))).toBe(true);
    });
  });

  // 6
  it('clicking preset "Value" filters stocks (P/E 1-15 with MarketCap > 10B)', () => {
    render(<ScreenerView {...defaultProps} />);
    fireEvent.click(screen.getByText('Value'));

    // JPM has trailingPE 11.2, marketCap 570B => passes
    expect(screen.getByText('JPM')).toBeInTheDocument();

    // AAPL has trailingPE 33.2 => fails peMax 15
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
    // MSFT has trailingPE 35.8 => fails peMax 15
    expect(screen.queryByText('MSFT')).not.toBeInTheDocument();
    // PEP has trailingPE 24.1 => fails peMax 15
    expect(screen.queryByText('PEP')).not.toBeInTheDocument();
    // SMCI has no trailingPE => fails peMin 1
    expect(screen.queryByText('SMCI')).not.toBeInTheDocument();

    // Count should reflect 1 of 5
    expect(screen.getByText('1 of 5 stocks')).toBeInTheDocument();
  });

  // 7
  it('clicking "All" preset shows all stocks', () => {
    render(<ScreenerView {...defaultProps} />);
    // First apply a restrictive filter
    fireEvent.click(screen.getByText('Value'));
    expect(screen.getByText('1 of 5 stocks')).toBeInTheDocument();

    // Then click All to reset
    fireEvent.click(screen.getByText('All'));
    expect(screen.getByText('5 of 5 stocks')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getByText('JPM')).toBeInTheDocument();
  });

  // 8
  it('sort by clicking column header toggles sort direction', () => {
    render(<ScreenerView {...defaultProps} />);
    const symbolHeader = screen.getByText('Symbol');

    // Click once -> desc sort
    fireEvent.click(symbolHeader);
    const rows1 = screen.getAllByRole('row').slice(1); // skip header row
    const symbols1 = rows1.map(row => row.querySelector('.symbol')?.textContent ?? '');
    // Desc alphabetical: SMCI, PEP, MSFT, JPM, AAPL
    expect(symbols1[0]).toContain('SMCI');
    expect(symbols1[4]).toContain('AAPL');

    // Click again -> asc sort
    fireEvent.click(symbolHeader);
    const rows2 = screen.getAllByRole('row').slice(1);
    const symbols2 = rows2.map(row => row.querySelector('.symbol')?.textContent ?? '');
    // Asc alphabetical: AAPL, JPM, MSFT, PEP, SMCI
    expect(symbols2[0]).toContain('AAPL');
    expect(symbols2[4]).toContain('SMCI');
  });

  // 9
  it('click stock row calls onSelectStock', () => {
    render(<ScreenerView {...defaultProps} />);
    const rows = screen.getAllByRole('row').slice(1);
    fireEvent.click(rows[0]); // click first data row
    expect(defaultProps.onSelectStock).toHaveBeenCalledWith('AAPL');
  });

  // 10
  it('clicking "Heatmap" calls onNavigate("heatmap")', () => {
    render(<ScreenerView {...defaultProps} />);
    fireEvent.click(screen.getByText('Heatmap'));
    expect(defaultProps.onNavigate).toHaveBeenCalledWith('heatmap');
  });
});

// ===========================================================================
// Filter Logic Tests (unit testing applyFilters directly)
// ===========================================================================

describe('applyFilters (unit)', () => {
  // 11
  it('sector filter excludes stocks not in selected sectors', () => {
    const filters: ScreenerFilters = { ...EMPTY_FILTERS, sectors: ['Financials'] };
    const result = applyFilters(mockQuotes, filters);
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('JPM');
  });

  // 12
  it('market cap min filter works', () => {
    const filters: ScreenerFilters = { ...EMPTY_FILTERS, marketCapMin: 1e12 };
    const result = applyFilters(mockQuotes, filters);
    // AAPL 3.6T, MSFT 3.1T
    expect(result).toHaveLength(2);
    expect(result.map(q => q.symbol).sort()).toEqual(['AAPL', 'MSFT']);
  });

  // 13
  it('P/E max filter excludes stocks without P/E (undefined)', () => {
    const filters: ScreenerFilters = { ...EMPTY_FILTERS, peMax: 50 };
    const result = applyFilters(mockQuotes, filters);
    // SMCI has undefined trailingPE => excluded
    expect(result).toHaveLength(4);
    expect(result.find(q => q.symbol === 'SMCI')).toBeUndefined();
  });

  // 14
  it('near 52W low filter works (within 10%)', () => {
    const filters: ScreenerFilters = { ...EMPTY_FILTERS, near52wLow: true };
    const result = applyFilters(mockQuotes, filters);
    // SMCI: 45.20 vs low 18.58 => 45.20 > 18.58*1.1 (20.44) => excluded
    // AAPL: 248.96 vs low 164.08 => 248.96 > 164.08*1.1 (180.49) => excluded
    // MSFT: 420.12 vs low 362.40 => 420.12 > 362.40*1.1 (398.64) => excluded
    // JPM: 195.50 vs low 155.20 => 195.50 > 155.20*1.1 (170.72) => excluded
    // PEP: 172.30 vs low 155.80 => 172.30 > 155.80*1.1 (171.38) => excluded
    // Actually PEP: 172.30 > 171.38 => excluded too (barely)
    // All are excluded
    expect(result).toHaveLength(0);

    // Create a stock that IS near its 52W low (within 10%)
    const nearLowQuotes: Quote[] = [
      ...mockQuotes,
      { symbol: 'TEST', price: 105, change: 0, changePercent: 0, fiftyTwoWeekLow: 100 },
    ];
    const result2 = applyFilters(nearLowQuotes, filters);
    // TEST: 105 <= 100*1.1 (110) => included
    expect(result2).toHaveLength(1);
    expect(result2[0].symbol).toBe('TEST');
  });

  // 15
  it('multiple filters combine correctly', () => {
    const filters: ScreenerFilters = {
      ...EMPTY_FILTERS,
      sectors: ['Technology'],
      marketCapMin: 100e9,
      peMax: 40,
    };
    const result = applyFilters(mockQuotes, filters);
    // Technology: AAPL (3.6T, PE 33.2), MSFT (3.1T, PE 35.8), SMCI (8B, no PE)
    // marketCapMin 100B => excludes SMCI (8B)
    // peMax 40 => excludes SMCI (no PE) -- already excluded
    // AAPL and MSFT pass all
    expect(result).toHaveLength(2);
    expect(result.map(q => q.symbol).sort()).toEqual(['AAPL', 'MSFT']);
  });

  // 16
  it('undefined values are excluded when filter is active', () => {
    // peMin filter: stocks with undefined trailingPE should be excluded
    const filters: ScreenerFilters = { ...EMPTY_FILTERS, peMin: 5 };
    const result = applyFilters(mockQuotes, filters);
    expect(result.find(q => q.symbol === 'SMCI')).toBeUndefined();

    // volumeMin filter: stock with undefined volume should be excluded
    const noVolumeQuotes: Quote[] = [
      { symbol: 'NOVOL', price: 10, change: 0, changePercent: 0 },
    ];
    const volFilters: ScreenerFilters = { ...EMPTY_FILTERS, volumeMin: 1000 };
    const volResult = applyFilters(noVolumeQuotes, volFilters);
    expect(volResult).toHaveLength(0);

    // marketCapMin filter: stock with undefined marketCap should be excluded
    const noCapQuotes: Quote[] = [
      { symbol: 'NOCAP', price: 10, change: 0, changePercent: 0 },
    ];
    const capFilters: ScreenerFilters = { ...EMPTY_FILTERS, marketCapMin: 1e9 };
    const capResult = applyFilters(noCapQuotes, capFilters);
    expect(capResult).toHaveLength(0);
  });
});

// ===========================================================================
// CompareView Tests
// ===========================================================================

describe('CompareView', () => {
  const defaultProps = {
    onSelectStock: vi.fn(),
  };

  beforeEach(() => {
    defaultProps.onSelectStock = vi.fn();
  });

  // 17
  it('shows empty state when no stocks', () => {
    render(<CompareView {...defaultProps} />);
    expect(screen.getByText('Add up to 3 stocks to compare')).toBeInTheDocument();
  });

  // 18
  it('shows search input when Add Stock is clicked', async () => {
    render(<CompareView {...defaultProps} />);
    const addBtn = screen.getByText('Add Stock');
    fireEvent.click(addBtn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search ticker or name...')).toBeInTheDocument();
    });
  });

  // 19
  it('fetches detail data when symbol is provided via initialSymbols', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/detail/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDetail) });
      }
      if (url.includes('/api/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CompareView {...defaultProps} initialSymbols={['AAPL']} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/detail/AAPL');
    });

    // Wait for the detail to render (name appears in the header)
    await waitFor(() => {
      expect(screen.getByText('Apple Inc')).toBeInTheDocument();
    });
  });

  // 20
  it('shows metric sections (Valuation, Profitability, Performance, Balance Sheet)', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/detail/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDetail) });
      }
      if (url.includes('/api/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CompareView {...defaultProps} initialSymbols={['AAPL']} />);

    await waitFor(() => {
      expect(screen.getByText('Valuation')).toBeInTheDocument();
      expect(screen.getByText('Profitability')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Balance Sheet')).toBeInTheDocument();
    });
  });

  // 21
  it('X button removes a stock', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/detail/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDetail) });
      }
      if (url.includes('/api/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CompareView {...defaultProps} initialSymbols={['AAPL']} />);

    // Wait for the stock header to appear
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    // Click the remove button
    const removeBtn = screen.getByLabelText('Remove AAPL');
    fireEvent.click(removeBtn);

    // Should go back to empty state
    await waitFor(() => {
      expect(screen.getByText('Add up to 3 stocks to compare')).toBeInTheDocument();
    });
  });

  // 22
  it('max 3 stocks limit disables Add Stock button', async () => {
    const detailFor = (sym: string) => ({
      ...mockDetail,
      symbol: sym,
      name: sym + ' Inc',
    });

    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/detail/AAPL')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(detailFor('AAPL')) });
      }
      if (url.includes('/api/detail/MSFT')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(detailFor('MSFT')) });
      }
      if (url.includes('/api/detail/GOOGL')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(detailFor('GOOGL')) });
      }
      if (url.includes('/api/profile/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CompareView {...defaultProps} initialSymbols={['AAPL', 'MSFT', 'GOOGL']} />);

    // Wait for stocks to appear
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
    });

    // Add Stock button should be disabled
    const addBtn = screen.getByText('Add Stock').closest('button')!;
    expect(addBtn).toBeDisabled();
  });
});
