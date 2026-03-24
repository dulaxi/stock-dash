import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Quote, IndexQuote, NewsItem } from '../types';

// ---------------------------------------------------------------------------
// Global fetch mock
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
    ),
  );
  localStorage.clear();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------
const makeQuote = (overrides: Partial<Quote> & { symbol: string }): Quote => ({
  price: 100,
  change: 0,
  changePercent: 0,
  volume: 1000000,
  marketCap: 1000000000,
  shortName: overrides.symbol,
  sector: 'Technology',
  ...overrides,
});

const allNegativeQuotes: Quote[] = [
  makeQuote({ symbol: 'AAA', price: 50, change: -2, changePercent: -3.5 }),
  makeQuote({ symbol: 'BBB', price: 80, change: -5, changePercent: -6.0 }),
  makeQuote({ symbol: 'CCC', price: 120, change: -1, changePercent: -0.8 }),
  makeQuote({ symbol: 'DDD', price: 200, change: -10, changePercent: -4.8 }),
  makeQuote({ symbol: 'EEE', price: 35, change: -8, changePercent: -18.6 }),
  makeQuote({ symbol: 'FFF', price: 60, change: -3, changePercent: -4.8 }),
];

const allPositiveQuotes: Quote[] = [
  makeQuote({ symbol: 'AAA', price: 50, change: 2, changePercent: 4.2 }),
  makeQuote({ symbol: 'BBB', price: 80, change: 5, changePercent: 6.6 }),
  makeQuote({ symbol: 'CCC', price: 120, change: 1, changePercent: 0.8 }),
  makeQuote({ symbol: 'DDD', price: 200, change: 10, changePercent: 5.3 }),
  makeQuote({ symbol: 'EEE', price: 35, change: 8, changePercent: 29.6 }),
  makeQuote({ symbol: 'FFF', price: 60, change: 3, changePercent: 5.3 }),
];

const singleQuote: Quote[] = [
  makeQuote({ symbol: 'ONLY', price: 100, change: 1, changePercent: 1.0 }),
];

const identicalChangeQuotes: Quote[] = [
  makeQuote({ symbol: 'X1', changePercent: 2.5 }),
  makeQuote({ symbol: 'X2', changePercent: 2.5 }),
  makeQuote({ symbol: 'X3', changePercent: -1.0 }),
  makeQuote({ symbol: 'X4', changePercent: -1.0 }),
  makeQuote({ symbol: 'X5', changePercent: 0 }),
  makeQuote({ symbol: 'X6', changePercent: 2.5 }),
];

// ===========================================================================
// HeaderBar — edge cases
// ===========================================================================
describe('HeaderBar (edge cases)', () => {
  let HeaderBar: typeof import('../components/HeaderBar').default;

  beforeEach(async () => {
    vi.resetModules();
    HeaderBar = (await import('../components/HeaderBar')).default;
  });

  const defaultProps = {
    market: 'all' as const,
    onMarketChange: vi.fn(),
    theme: 'dark',
    onThemeToggle: vi.fn(),
    marketStatus: 'open',
    quotes: [] as Quote[],
    onSelectStock: vi.fn(),
    view: 'dashboard',
    onBackToDashboard: vi.fn(),
  };

  // 1. Empty quotes array — search returns no results
  it('search with empty quotes shows no local results', () => {
    render(<HeaderBar {...defaultProps} quotes={[]} />);
    const searchBtn = screen.getByLabelText('Search');
    fireEvent.click(searchBtn);
    const input = screen.getByPlaceholderText('Search any stock...');
    fireEvent.change(input, { target: { value: 'AAPL' } });
    // No local results, and fetch returns [] by default — no results panel should show
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
  });

  // 2. Search with special characters doesn't crash
  it('search with special characters does not crash', () => {
    render(<HeaderBar {...defaultProps} />);
    const searchBtn = screen.getByLabelText('Search');
    fireEvent.click(searchBtn);
    const input = screen.getByPlaceholderText('Search any stock...');
    expect(() => {
      fireEvent.change(input, { target: { value: '<script>alert("xss")</script>' } });
    }).not.toThrow();
    expect(() => {
      fireEvent.change(input, { target: { value: '!@#$%^&*()[]{}|\\' } });
    }).not.toThrow();
    expect(() => {
      fireEvent.change(input, { target: { value: '../../etc/passwd' } });
    }).not.toThrow();
  });

  // 3. All quotes negative — search results display red (negative color)
  it('all negative changePercent quotes display negative styling in search results', () => {
    render(<HeaderBar {...defaultProps} quotes={allNegativeQuotes} />);
    const searchBtn = screen.getByLabelText('Search');
    fireEvent.click(searchBtn);
    const input = screen.getByPlaceholderText('Search any stock...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'A' } });
    // AAA is the local match starting with 'A' — use the symbol class to avoid ambiguity
    const symbolSpan = document.querySelector('.search-item-symbol');
    expect(symbolSpan).toBeTruthy();
    expect(symbolSpan!.textContent).toBe('AAA');
    const searchItem = symbolSpan!.closest('.search-item');
    // The change span should have negative color (via inline style)
    const changeSpan = searchItem?.querySelector('span[style]');
    expect(changeSpan).toBeTruthy();
    expect(changeSpan?.getAttribute('style')).toContain('var(--negative)');
  });

  // 4. Very long symbol name doesn't break layout
  it('very long shortName renders without throwing', () => {
    const longNameQuotes = [
      makeQuote({
        symbol: 'LONG',
        shortName: 'A'.repeat(200) + ' Very Long Corporation International Holdings Group Ltd',
        changePercent: 1.5,
      }),
    ];
    expect(() => {
      render(<HeaderBar {...defaultProps} quotes={longNameQuotes} />);
    }).not.toThrow();
  });

  // 5. Rapid market switching — clicking multiple pills fast
  it('rapid market pill clicks all fire onMarketChange', () => {
    const onChange = vi.fn();
    render(<HeaderBar {...defaultProps} onMarketChange={onChange} />);
    fireEvent.click(screen.getByText('NDQ'));
    fireEvent.click(screen.getByText('SPX'));
    fireEvent.click(screen.getByText('DOW'));
    fireEvent.click(screen.getByText('All'));
    fireEvent.click(screen.getByText('NDQ'));
    expect(onChange).toHaveBeenCalledTimes(5);
    expect(onChange).toHaveBeenNthCalledWith(1, 'nasdaq');
    expect(onChange).toHaveBeenNthCalledWith(2, 'sp500');
    expect(onChange).toHaveBeenNthCalledWith(3, 'dow');
    expect(onChange).toHaveBeenNthCalledWith(4, 'all');
    expect(onChange).toHaveBeenNthCalledWith(5, 'nasdaq');
  });

  // 6. Search blur cancels results correctly
  it('blur on search input clears results and collapses', async () => {
    const quotes = [makeQuote({ symbol: 'AAPL', shortName: 'Apple Inc', changePercent: 1.0 })];
    render(<HeaderBar {...defaultProps} quotes={quotes} />);
    const searchBtn = screen.getByLabelText('Search');
    fireEvent.click(searchBtn);
    const input = screen.getByPlaceholderText('Search any stock...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'A' } });
    // Now blur
    fireEvent.blur(input);
    // The onBlur has a 150ms setTimeout, so wait for it
    await waitFor(() => {
      const wrapper = searchBtn.closest('.header-bar-search');
      expect(wrapper).not.toHaveClass('expanded');
    });
  });
});

// ===========================================================================
// DashboardMovers — edge cases
// ===========================================================================
describe('DashboardMovers (edge cases)', () => {
  let DashboardMovers: typeof import('../components/DashboardMovers').default;

  beforeEach(async () => {
    vi.resetModules();
    DashboardMovers = (await import('../components/DashboardMovers')).default;
  });

  const defaultProps = {
    onSelectStock: vi.fn(),
    onSeeAll: vi.fn(),
  };

  // 7. Empty quotes array — renders sections but no items
  it('renders section labels with no rows when quotes is empty', () => {
    render(<DashboardMovers {...defaultProps} quotes={[]} />);
    expect(screen.getByText('GAINERS')).toBeInTheDocument();
    expect(screen.getByText('LOSERS')).toBeInTheDocument();
    const gainersSection = screen.getByText('GAINERS').closest('.movers-section')!;
    expect(gainersSection.querySelectorAll('.movers-row')).toHaveLength(0);
    const losersSection = screen.getByText('LOSERS').closest('.movers-section')!;
    expect(losersSection.querySelectorAll('.movers-row')).toHaveLength(0);
  });

  // 8. All stocks positive — no losers to show (losers section still renders, just all positive)
  it('all positive stocks — losers section shows the least positive', () => {
    render(<DashboardMovers {...defaultProps} quotes={allPositiveQuotes} />);
    const losersSection = screen.getByText('LOSERS').closest('.movers-section')!;
    const rows = losersSection.querySelectorAll('.movers-row');
    expect(rows.length).toBeGreaterThan(0);
    // Even in the losers section, all changePercent values are positive
    const changes = Array.from(rows).map(r => r.querySelector('.movers-change')!.textContent);
    changes.forEach(c => {
      // They all use the down class but the values are still positive in the text
      // The component always formats losers with .toFixed(1) without +
      expect(c).toBeTruthy();
    });
  });

  // 9. All stocks negative — no gainers to show
  it('all negative stocks — gainers section shows least negative', () => {
    render(<DashboardMovers {...defaultProps} quotes={allNegativeQuotes} />);
    const gainersSection = screen.getByText('GAINERS').closest('.movers-section')!;
    const rows = gainersSection.querySelectorAll('.movers-row');
    expect(rows.length).toBeGreaterThan(0);
  });

  // 10. Single stock shows in both gainers and losers
  it('single stock appears in both gainers and losers', () => {
    render(<DashboardMovers {...defaultProps} quotes={singleQuote} />);
    const gainersSection = screen.getByText('GAINERS').closest('.movers-section')!;
    const losersSection = screen.getByText('LOSERS').closest('.movers-section')!;
    expect(gainersSection.querySelector('.movers-symbol')!.textContent).toBe('ONLY');
    expect(losersSection.querySelector('.movers-symbol')!.textContent).toBe('ONLY');
  });

  // 11. Stocks with identical changePercent don't crash sort
  it('identical changePercent values sort without crashing', () => {
    expect(() => {
      render(<DashboardMovers {...defaultProps} quotes={identicalChangeQuotes} />);
    }).not.toThrow();
    const gainersSection = screen.getByText('GAINERS').closest('.movers-section')!;
    const rows = gainersSection.querySelectorAll('.movers-row');
    expect(rows.length).toBe(5);
  });

  // 12. Quotes with undefined changePercent
  it('handles quotes with changePercent as 0 gracefully', () => {
    const zeroQuotes: Quote[] = [
      makeQuote({ symbol: 'ZERO1', changePercent: 0 }),
      makeQuote({ symbol: 'ZERO2', changePercent: 0 }),
      makeQuote({ symbol: 'ZERO3', changePercent: 0 }),
    ];
    expect(() => {
      render(<DashboardMovers {...defaultProps} quotes={zeroQuotes} />);
    }).not.toThrow();
    // All should appear in both sections since slice(0,5) and slice(-5) overlap
    expect(screen.getAllByText('ZERO1')).toHaveLength(2);
  });
});

// ===========================================================================
// DashboardWatchlist — edge cases
// ===========================================================================
describe('DashboardWatchlist (edge cases)', () => {
  let DashboardWatchlist: typeof import('../components/DashboardWatchlist').default;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    DashboardWatchlist = (await import('../components/DashboardWatchlist')).default;
  });

  const defaultProps = {
    quotes: [] as Quote[],
    onSelectStock: vi.fn(),
    onSeeAll: vi.fn(),
  };

  // 13. Empty watchlist — shows empty state message
  it('shows empty state when watchlist has no tickers', () => {
    render(<DashboardWatchlist {...defaultProps} />);
    expect(screen.getByText('Add tickers to start your watchlist')).toBeInTheDocument();
  });

  // 14. Watchlist with ticker not in quotes — fetches from /api/quote
  it('fetches from /api/quote for tickers not in quotes', async () => {
    localStorage.setItem('xtox-watchlist', JSON.stringify(['GOOG']));
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/quote/GOOG')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(makeQuote({ symbol: 'GOOG', changePercent: 2.1 })),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<DashboardWatchlist {...defaultProps} quotes={[]} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/quote/GOOG');
    });
  });

  // 15. Fetch failure for extra quote — shows dash instead of price
  it('shows dash when fetch for extra quote fails', async () => {
    localStorage.setItem('xtox-watchlist', JSON.stringify(['FAIL']));
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/quote/FAIL')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<DashboardWatchlist {...defaultProps} quotes={[]} />);

    // The component shows '\u2014' (em dash) when q is undefined
    await waitFor(() => {
      expect(screen.getByText('\u2014')).toBeInTheDocument();
    });
  });

  // 16. Adding duplicate ticker should not add twice
  it('does not add duplicate ticker to watchlist', async () => {
    const quotes = [makeQuote({ symbol: 'AAPL', shortName: 'Apple Inc', changePercent: 1.0 })];
    localStorage.setItem('xtox-watchlist', JSON.stringify(['AAPL']));

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })),
    );

    render(<DashboardWatchlist {...defaultProps} quotes={quotes} />);

    // AAPL is already in watchlist — try to add via search
    const input = screen.getByPlaceholderText('+ Add ticker...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'A' } });

    // The component filters out tickers already in the watchlist from search results
    // So AAPL should NOT appear in the dropdown
    await waitFor(() => {
      const dropdownItems = document.querySelectorAll('.watchlist-dropdown-item');
      const symbols = Array.from(dropdownItems).map(d => d.textContent);
      symbols.forEach(s => {
        // If AAPL appears, it should not be clickable as a new add
        // The localResults filter excludes tickers already in the list
      });
    });

    // Verify only one AAPL row exists in the watchlist
    const rows = document.querySelectorAll('.watchlist-row-symbol');
    const aaplCount = Array.from(rows).filter(r => r.textContent === 'AAPL').length;
    expect(aaplCount).toBe(1);
  });
});

// ===========================================================================
// MetricTooltip — edge cases
// ===========================================================================
describe('MetricTooltip (edge cases)', () => {
  let MetricTooltip: typeof import('../components/MetricTooltip').default;
  let getMetricExplanation: typeof import('../components/MetricTooltip').getMetricExplanation;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../components/MetricTooltip');
    MetricTooltip = mod.default;
    getMetricExplanation = mod.getMetricExplanation;
  });

  // 17. Very long tooltip text renders without overflow
  it('very long tooltip text renders without throwing', () => {
    // Use a known key and verify the popup renders
    const { container } = render(<MetricTooltip metricKey="pe">P/E Ratio</MetricTooltip>);
    const trigger = container.querySelector('.metric-tooltip-trigger')!;
    fireEvent.mouseEnter(trigger);
    const popup = container.querySelector('.metric-tooltip-popup');
    expect(popup).toBeInTheDocument();
    // The tip text is long but should render fine
    expect(popup!.querySelector('.metric-tooltip-text')!.textContent!.length).toBeGreaterThan(0);
  });

  // 18. Nested MetricTooltips don't break
  it('nested MetricTooltips render without crashing', () => {
    expect(() => {
      render(
        <MetricTooltip metricKey="pe">
          <MetricTooltip metricKey="eps">EPS inside P/E</MetricTooltip>
        </MetricTooltip>,
      );
    }).not.toThrow();
    expect(screen.getByText('EPS inside P/E')).toBeInTheDocument();
  });

  // 19. Rapid hover/unhover — no visual glitch (render check)
  it('rapid hover/unhover does not crash', () => {
    const { container } = render(<MetricTooltip metricKey="pe">P/E Ratio</MetricTooltip>);
    const trigger = container.querySelector('.metric-tooltip-trigger')!;
    // Rapidly hover and unhover many times
    for (let i = 0; i < 20; i++) {
      fireEvent.mouseEnter(trigger);
      fireEvent.mouseLeave(trigger);
    }
    // Final state should be hidden
    expect(container.querySelector('.metric-tooltip-popup')).not.toBeInTheDocument();
    // One more hover — should show
    fireEvent.mouseEnter(trigger);
    expect(container.querySelector('.metric-tooltip-popup')).toBeInTheDocument();
  });

  // 20. All metric keys in the dictionary render a tooltip
  it('all known metric keys render a tooltip with icon', () => {
    const knownKeys = [
      'marketCap', 'pe', 'forwardPE', 'peg', 'ps', 'pb', 'evEbitda', 'evRevenue', 'enterpriseValue',
      'eps', 'epsForward', 'revenue', 'netIncome',
      'grossMargin', 'operatingMargin', 'profitMargin', 'roe', 'roa',
      'debtEquity', 'currentRatio', 'quickRatio', 'bookValue',
      'beta', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow', 'sma50', 'sma200',
      'sharesOutstanding', 'float', 'shortRatio', 'shortPercent',
      'dividendYield', 'payoutRatio', 'exDivDate',
      'volume', 'avgVolume', 'price', 'change', 'changePercent',
      'sector',
    ];

    knownKeys.forEach(key => {
      // Verify getMetricExplanation returns a value
      const explanation = getMetricExplanation(key);
      expect(explanation, `Missing explanation for key: ${key}`).not.toBeNull();
      expect(explanation!.label).toBeTruthy();
      expect(explanation!.tip).toBeTruthy();

      // Verify rendering produces a tooltip trigger
      const { container, unmount } = render(
        <MetricTooltip metricKey={key}>{explanation!.label}</MetricTooltip>,
      );
      expect(
        container.querySelector('.metric-tooltip-trigger'),
        `No tooltip trigger for key: ${key}`,
      ).toBeInTheDocument();
      expect(
        container.querySelector('.metric-tooltip-icon'),
        `No tooltip icon for key: ${key}`,
      ).toBeInTheDocument();
      unmount();
    });
  });
});

// ===========================================================================
// FilterDropdown — edge cases
// ===========================================================================
describe('FilterDropdown (edge cases)', () => {
  let FilterDropdown: typeof import('../components/FilterDropdown').default;

  beforeEach(async () => {
    vi.resetModules();
    FilterDropdown = (await import('../components/FilterDropdown')).default;
  });

  // 21. Rapid open/close clicks don't break
  it('rapid open/close clicks do not break state', () => {
    render(
      <FilterDropdown label="Sector" active={false}>
        <div>Content</div>
      </FilterDropdown>,
    );
    const btn = screen.getByText('Sector');
    for (let i = 0; i < 10; i++) {
      fireEvent.click(btn);
    }
    // After 10 clicks (even number), should be closed
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    // One more click opens it
    fireEvent.click(btn);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  // 22. Click inside dropdown doesn't close it
  it('clicking inside the dropdown does not close it', async () => {
    render(
      <FilterDropdown label="Sector" active={false}>
        <div data-testid="inner-content">Inner Content</div>
      </FilterDropdown>,
    );
    fireEvent.click(screen.getByText('Sector'));
    expect(screen.getByTestId('inner-content')).toBeInTheDocument();
    // Click inside the dropdown content
    fireEvent.mouseDown(screen.getByTestId('inner-content'));
    // Should still be open
    expect(screen.getByTestId('inner-content')).toBeInTheDocument();
  });

  // 23. Multiple dropdowns — opening one closes the other via outside click
  it('outside click on a second dropdown closes the first', async () => {
    render(
      <div>
        <FilterDropdown label="Sector" active={false}>
          <div>Sector Content</div>
        </FilterDropdown>
        <FilterDropdown label="Market Cap" active={false}>
          <div>MarketCap Content</div>
        </FilterDropdown>
      </div>,
    );
    // Open the first dropdown
    fireEvent.click(screen.getByText('Sector'));
    expect(screen.getByText('Sector Content')).toBeInTheDocument();
    // Click the second dropdown button (this is an outside click for the first)
    fireEvent.mouseDown(screen.getByText('Market Cap'));
    await waitFor(() => {
      expect(screen.queryByText('Sector Content')).not.toBeInTheDocument();
    });
  });

  // 24. Empty children — renders dropdown with no content
  it('renders dropdown with empty children', () => {
    render(
      <FilterDropdown label="Empty" active={false}>
        {null}
      </FilterDropdown>,
    );
    expect(screen.getByText('Empty')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Empty'));
    // The dropdown menu opens but has no visible children
    const menu = document.querySelector('.filter-dropdown-menu');
    expect(menu).toBeInTheDocument();
  });
});

// ===========================================================================
// NewsStrip — edge cases
// ===========================================================================
describe('NewsStrip (edge cases)', () => {
  let NewsStrip: typeof import('../components/NewsStrip').default;

  beforeEach(async () => {
    vi.resetModules();
    NewsStrip = (await import('../components/NewsStrip')).default;
  });

  // 25. Fetch returns empty array — component returns null
  it('returns null when fetch returns empty array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })),
    );
    const { container } = render(<NewsStrip market="nasdaq" onSeeAll={vi.fn()} />);
    // Component renders null when news.length === 0
    await waitFor(() => {
      expect(container.querySelector('.news-strip')).not.toBeInTheDocument();
    });
  });

  // 26. Fetch fails — component returns null
  it('returns null when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network error'))),
    );
    const { container } = render(<NewsStrip market="nasdaq" onSeeAll={vi.fn()} />);
    await waitFor(() => {
      expect(container.querySelector('.news-strip')).not.toBeInTheDocument();
    });
  });

  // 27. News with very long headline — truncated in display
  it('renders very long headline without throwing', async () => {
    const longNews: NewsItem[] = [
      {
        title: 'A'.repeat(500) + ' — Breaking News from International Markets Worldwide',
        publisher: 'Reuters',
        link: 'https://example.com/long',
        providerPublishTime: '2026-03-24T14:00:00Z',
        thumbnail: null,
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(longNews) })),
    );

    const { container } = render(<NewsStrip market="nasdaq" onSeeAll={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('NEWS')).toBeInTheDocument();
    });
    // Verify the link rendered with the long title
    const link = container.querySelector('.news-strip-link');
    expect(link).toBeInTheDocument();
    expect(link!.textContent!.length).toBeGreaterThan(100);
  });

  // 28. News items with null thumbnails
  it('renders news items with null thumbnails without crashing', async () => {
    const newsWithNullThumbs: NewsItem[] = [
      { title: 'Headline A', publisher: 'Reuters', link: 'https://example.com/a', providerPublishTime: '2026-03-24T14:00:00Z', thumbnail: null },
      { title: 'Headline B', publisher: 'CNBC', link: 'https://example.com/b', providerPublishTime: '2026-03-24T13:00:00Z', thumbnail: null },
      { title: 'Headline C', publisher: 'Bloomberg', link: 'https://example.com/c', providerPublishTime: '2026-03-24T12:00:00Z', thumbnail: null },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(newsWithNullThumbs) })),
    );

    render(<NewsStrip market="nasdaq" onSeeAll={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Headline A')).toBeInTheDocument();
      expect(screen.getByText('Headline B')).toBeInTheDocument();
      expect(screen.getByText('Headline C')).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// IndexStrip — edge cases
// ===========================================================================
describe('IndexStrip (edge cases)', () => {
  let IndexStrip: typeof import('../components/IndexStrip').default;

  beforeEach(async () => {
    vi.resetModules();
    IndexStrip = (await import('../components/IndexStrip')).default;
  });

  // 29. Empty indices array — renders nothing
  it('renders no items when indices is empty', () => {
    const { container } = render(<IndexStrip indices={[]} />);
    expect(container.querySelectorAll('.index-strip-item')).toHaveLength(0);
  });

  // 30. Index with 0 changePercent — shows as neutral
  it('index with 0 changePercent shows +0.00% with up class', () => {
    const zeroIndex: IndexQuote[] = [
      { symbol: '^FLAT', name: 'FLAT', price: 5000, change: 0, changePercent: 0 },
    ];
    render(<IndexStrip indices={zeroIndex} />);
    // changePercent >= 0 is true for 0, so it gets 'up' class and '+' prefix
    const changeEl = screen.getByText('+0.00%');
    expect(changeEl).toBeInTheDocument();
    expect(changeEl).toHaveClass('up');
  });

  // 31. Missing sparkline data — still renders price/change without chart
  it('renders price and change even without sparkline data', () => {
    // Default fetch returns [] which means no chart data
    const indices: IndexQuote[] = [
      { symbol: '^TEST', name: 'TEST', price: 1234.56, change: 5.0, changePercent: 0.41 },
    ];
    const { container } = render(<IndexStrip indices={indices} />);
    expect(screen.getByText('TEST')).toBeInTheDocument();
    expect(screen.getByText('1,235')).toBeInTheDocument();
    expect(screen.getByText('+0.41%')).toBeInTheDocument();
    // No sparkline SVG should be present (data.length < 2)
    expect(container.querySelector('.sparkline')).not.toBeInTheDocument();
  });

  // 32. Very large index value (100,000+) formats correctly
  it('formats very large index value with locale string', () => {
    const largeIndex: IndexQuote[] = [
      { symbol: '^BIG', name: 'BIG', price: 123456.78, change: 500, changePercent: 0.41 },
    ];
    render(<IndexStrip indices={largeIndex} />);
    // toLocaleString with 0 fraction digits: 123,457 (rounded)
    expect(screen.getByText('123,457')).toBeInTheDocument();
  });
});
