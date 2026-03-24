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
});

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const mockQuotes: Quote[] = [
  { symbol: 'AAPL', price: 248.96, change: 1.2, changePercent: 0.48, volume: 34000000, marketCap: 3600000000000, shortName: 'Apple Inc', sector: 'Technology' },
  { symbol: 'TSLA', price: 172.5, change: 8.4, changePercent: 5.12, volume: 52000000, marketCap: 540000000000, shortName: 'Tesla Inc', sector: 'Consumer Cyclical' },
  { symbol: 'MSFT', price: 415.1, change: 3.2, changePercent: 0.78, volume: 21000000, marketCap: 3100000000000, shortName: 'Microsoft Corp', sector: 'Technology' },
  { symbol: 'AMZN', price: 185.3, change: -2.1, changePercent: -1.12, volume: 43000000, marketCap: 1900000000000, shortName: 'Amazon.com Inc', sector: 'Consumer Cyclical' },
  { symbol: 'NVDA', price: 880.0, change: 22.5, changePercent: 2.62, volume: 61000000, marketCap: 2200000000000, shortName: 'NVIDIA Corp', sector: 'Technology' },
  { symbol: 'META', price: 505.6, change: -8.3, changePercent: -1.62, volume: 15000000, marketCap: 1300000000000, shortName: 'Meta Platforms', sector: 'Communication Services' },
  { symbol: 'GOOG', price: 155.7, change: -3.4, changePercent: -2.14, volume: 27000000, marketCap: 1950000000000, shortName: 'Alphabet Inc', sector: 'Communication Services' },
  { symbol: 'NFLX', price: 612.0, change: -15.0, changePercent: -2.39, volume: 9500000, marketCap: 270000000000, shortName: 'Netflix Inc', sector: 'Communication Services' },
  { symbol: 'AMD', price: 165.2, change: -7.8, changePercent: -4.51, volume: 38000000, marketCap: 267000000000, shortName: 'AMD Inc', sector: 'Technology' },
  { symbol: 'INTC', price: 44.3, change: -4.2, changePercent: -8.66, volume: 46000000, marketCap: 188000000000, shortName: 'Intel Corp', sector: 'Technology' },
];

const mockIndices: IndexQuote[] = [
  { symbol: '^IXIC', name: 'NASDAQ', price: 16340.87, change: 78.81, changePercent: 0.48 },
  { symbol: '^GSPC', name: 'S&P 500', price: 5234.18, change: -12.36, changePercent: -0.24 },
  { symbol: '^DJI', name: 'DOW', price: 39127.14, change: 120.04, changePercent: 0.31 },
];

const mockNews: NewsItem[] = [
  { title: 'Tech stocks rally on AI optimism', publisher: 'Reuters', link: 'https://example.com/1', providerPublishTime: '2026-03-24T14:00:00Z', thumbnail: null },
  { title: 'Fed holds rates steady', publisher: 'Bloomberg', link: 'https://example.com/2', providerPublishTime: '2026-03-24T13:00:00Z', thumbnail: null },
  { title: 'NVDA beats earnings expectations', publisher: 'CNBC', link: 'https://example.com/3', providerPublishTime: '2026-03-24T12:00:00Z', thumbnail: null },
];

// ===========================================================================
// HeaderBar
// ===========================================================================
describe('HeaderBar', () => {
  // Lazy-import so the global fetch mock is already in place
  let HeaderBar: typeof import('../components/HeaderBar').default;

  beforeEach(async () => {
    HeaderBar = (await import('../components/HeaderBar')).default;
  });

  const defaultProps = {
    market: 'all' as const,
    onMarketChange: vi.fn(),
    theme: 'dark',
    onThemeToggle: vi.fn(),
    marketStatus: 'open',
    quotes: mockQuotes,
    onSelectStock: vi.fn(),
    view: 'dashboard',
    onBackToDashboard: vi.fn(),
  };

  it('renders XTOX logo', () => {
    render(<HeaderBar {...defaultProps} />);
    expect(screen.getByText('XTOX')).toBeInTheDocument();
  });

  it('shows market pills (All, NDQ, SPX, DOW)', () => {
    render(<HeaderBar {...defaultProps} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('NDQ')).toBeInTheDocument();
    expect(screen.getByText('SPX')).toBeInTheDocument();
    expect(screen.getByText('DOW')).toBeInTheDocument();
  });

  it('shows market status', () => {
    render(<HeaderBar {...defaultProps} />);
    expect(screen.getByText('Market Open')).toBeInTheDocument();
  });

  it('shows Pre-Market status', () => {
    render(<HeaderBar {...defaultProps} marketStatus="pre" />);
    expect(screen.getByText('Pre-Market')).toBeInTheDocument();
  });

  it('shows Market Closed status', () => {
    render(<HeaderBar {...defaultProps} marketStatus="closed" />);
    expect(screen.getByText('Market Closed')).toBeInTheDocument();
  });

  it('search input expands on click', () => {
    render(<HeaderBar {...defaultProps} />);
    const searchBtn = screen.getByLabelText('Search');
    fireEvent.click(searchBtn);
    // After clicking, the wrapper should have the 'expanded' class
    const wrapper = searchBtn.closest('.header-bar-search');
    expect(wrapper).toHaveClass('expanded');
  });

  it('clicking logo calls onBackToDashboard', () => {
    const onBack = vi.fn();
    render(<HeaderBar {...defaultProps} onBackToDashboard={onBack} />);
    fireEvent.click(screen.getByText('XTOX'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('market pill click calls onMarketChange', () => {
    const onChange = vi.fn();
    render(<HeaderBar {...defaultProps} onMarketChange={onChange} />);
    fireEvent.click(screen.getByText('NDQ'));
    expect(onChange).toHaveBeenCalledWith('nasdaq');
  });
});

// ===========================================================================
// DashboardMovers
// ===========================================================================
describe('DashboardMovers', () => {
  let DashboardMovers: typeof import('../components/DashboardMovers').default;

  beforeEach(async () => {
    DashboardMovers = (await import('../components/DashboardMovers')).default;
  });

  const defaultProps = {
    quotes: mockQuotes,
    onSelectStock: vi.fn(),
    onSeeAll: vi.fn(),
  };

  it('renders gainers and losers sections', () => {
    render(<DashboardMovers {...defaultProps} />);
    expect(screen.getByText('GAINERS')).toBeInTheDocument();
    expect(screen.getByText('LOSERS')).toBeInTheDocument();
  });

  it('shows top 5 gainers sorted by change%', () => {
    render(<DashboardMovers {...defaultProps} />);
    // Sorted by changePercent desc: TSLA(5.12), NVDA(2.62), MSFT(0.78), AAPL(0.48), AMZN(-1.12)
    // Top 5 gainers = first 5 in sorted order
    const gainersSection = screen.getByText('GAINERS').closest('.movers-section')!;
    const rows = gainersSection.querySelectorAll('.movers-row');
    expect(rows).toHaveLength(5);

    const symbols = Array.from(rows).map(r => r.querySelector('.movers-symbol')!.textContent);
    expect(symbols[0]).toBe('TSLA');
    expect(symbols[1]).toBe('NVDA');
    expect(symbols[2]).toBe('MSFT');
    expect(symbols[3]).toBe('AAPL');
    // 5th is AMZN at -1.12% (still the 5th highest)
    expect(symbols[4]).toBe('AMZN');
  });

  it('shows top 5 losers sorted by change%', () => {
    render(<DashboardMovers {...defaultProps} />);
    // Sorted desc: losers = last 5 reversed = INTC(-8.66), AMD(-4.51), NFLX(-2.39), GOOG(-2.14), META(-1.62)
    const losersSection = screen.getByText('LOSERS').closest('.movers-section')!;
    const rows = losersSection.querySelectorAll('.movers-row');
    expect(rows).toHaveLength(5);

    const symbols = Array.from(rows).map(r => r.querySelector('.movers-symbol')!.textContent);
    expect(symbols[0]).toBe('INTC');
    expect(symbols[1]).toBe('AMD');
    expect(symbols[2]).toBe('NFLX');
    expect(symbols[3]).toBe('GOOG');
    expect(symbols[4]).toBe('META');
  });

  it('click row calls onSelectStock', () => {
    const onSelect = vi.fn();
    render(<DashboardMovers {...defaultProps} onSelectStock={onSelect} />);
    // Click the first gainer row (TSLA)
    const gainersSection = screen.getByText('GAINERS').closest('.movers-section')!;
    const firstRow = gainersSection.querySelector('.movers-row')!;
    fireEvent.click(firstRow);
    expect(onSelect).toHaveBeenCalledWith('TSLA');
  });
});

// ===========================================================================
// MetricTooltip
// ===========================================================================
describe('MetricTooltip', () => {
  let MetricTooltip: typeof import('../components/MetricTooltip').default;

  beforeEach(async () => {
    MetricTooltip = (await import('../components/MetricTooltip')).default;
  });

  it('renders children text', () => {
    render(<MetricTooltip metricKey="pe">P/E Ratio</MetricTooltip>);
    expect(screen.getByText('P/E Ratio')).toBeInTheDocument();
  });

  it('shows info icon for known metric', () => {
    const { container } = render(<MetricTooltip metricKey="pe">P/E Ratio</MetricTooltip>);
    // The Info icon from phosphor is rendered as an SVG inside the trigger span
    const icon = container.querySelector('.metric-tooltip-icon');
    expect(icon).toBeInTheDocument();
  });

  it('shows tooltip popup on hover with correct explanation', async () => {
    const { container } = render(<MetricTooltip metricKey="pe">P/E Ratio</MetricTooltip>);
    const trigger = container.querySelector('.metric-tooltip-trigger')!;
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText('P/E')).toBeInTheDocument();
    expect(screen.getByText(/Price-to-Earnings ratio/)).toBeInTheDocument();
  });

  it('returns just children for unknown metric keys', () => {
    const { container } = render(<MetricTooltip metricKey="unknownXYZ">Some Text</MetricTooltip>);
    expect(screen.getByText('Some Text')).toBeInTheDocument();
    // Should NOT have the tooltip trigger wrapper
    expect(container.querySelector('.metric-tooltip-trigger')).toBeNull();
    expect(container.querySelector('.metric-tooltip-icon')).toBeNull();
  });
});

// ===========================================================================
// FilterDropdown
// ===========================================================================
describe('FilterDropdown', () => {
  let FilterDropdown: typeof import('../components/FilterDropdown').default;

  beforeEach(async () => {
    FilterDropdown = (await import('../components/FilterDropdown')).default;
  });

  it('renders label button', () => {
    render(
      <FilterDropdown label="Sector" active={false}>
        <div>Dropdown content</div>
      </FilterDropdown>,
    );
    expect(screen.getByText('Sector')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(
      <FilterDropdown label="Sector" active={false}>
        <div>Dropdown content</div>
      </FilterDropdown>,
    );
    // Content should not be visible initially
    expect(screen.queryByText('Dropdown content')).not.toBeInTheDocument();
    // Click the button to open
    fireEvent.click(screen.getByText('Sector'));
    expect(screen.getByText('Dropdown content')).toBeInTheDocument();
  });

  it('closes on outside click', async () => {
    const { container } = render(
      <div>
        <FilterDropdown label="Sector" active={false}>
          <div>Dropdown content</div>
        </FilterDropdown>
        <div data-testid="outside">Outside</div>
      </div>,
    );
    // Open the dropdown
    fireEvent.click(screen.getByText('Sector'));
    expect(screen.getByText('Dropdown content')).toBeInTheDocument();
    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));
    await waitFor(() => {
      expect(screen.queryByText('Dropdown content')).not.toBeInTheDocument();
    });
  });

  it('shows active state when active prop is true', () => {
    render(
      <FilterDropdown label="Sector" active={true}>
        <div>Content</div>
      </FilterDropdown>,
    );
    const btn = screen.getByText('Sector').closest('button')!;
    expect(btn).toHaveClass('active');
  });
});

// ===========================================================================
// NewsStrip
// ===========================================================================
describe('NewsStrip', () => {
  let NewsStrip: typeof import('../components/NewsStrip').default;

  beforeEach(async () => {
    NewsStrip = (await import('../components/NewsStrip')).default;
  });

  it('renders "NEWS" label and headlines after fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(mockNews) }),
      ),
    );

    render(<NewsStrip market="nasdaq" onSeeAll={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('NEWS')).toBeInTheDocument();
    });

    expect(screen.getByText('Tech stocks rally on AI optimism')).toBeInTheDocument();
    expect(screen.getByText('Fed holds rates steady')).toBeInTheDocument();
    expect(screen.getByText('NVDA beats earnings expectations')).toBeInTheDocument();
  });

  it('fetches news on mount', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockNews) }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<NewsStrip market="nasdaq" onSeeAll={vi.fn()} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/news/nasdaq');
    });
  });

  it('uses "nasdaq" when market is "all"', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockNews) }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<NewsStrip market="all" onSeeAll={vi.fn()} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/news/nasdaq');
    });
  });

  it('shows headlines as links', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(mockNews) }),
      ),
    );

    render(<NewsStrip market="nasdaq" onSeeAll={vi.fn()} />);

    await waitFor(() => {
      const link = screen.getByText('Tech stocks rally on AI optimism');
      expect(link.closest('a')).toHaveAttribute('href', 'https://example.com/1');
    });
  });
});

// ===========================================================================
// IndexStrip
// ===========================================================================
describe('IndexStrip', () => {
  let IndexStrip: typeof import('../components/IndexStrip').default;

  beforeEach(async () => {
    IndexStrip = (await import('../components/IndexStrip')).default;
  });

  it('renders index names (NASDAQ, S&P 500, DOW)', () => {
    render(<IndexStrip indices={mockIndices} />);
    expect(screen.getByText('NASDAQ')).toBeInTheDocument();
    expect(screen.getByText('S&P 500')).toBeInTheDocument();
    expect(screen.getByText('DOW')).toBeInTheDocument();
  });

  it('shows prices', () => {
    render(<IndexStrip indices={mockIndices} />);
    // Prices are formatted with toLocaleString (0 decimal places)
    expect(screen.getByText('16,341')).toBeInTheDocument();
    expect(screen.getByText('5,234')).toBeInTheDocument();
    expect(screen.getByText('39,127')).toBeInTheDocument();
  });

  it('shows change percentages', () => {
    render(<IndexStrip indices={mockIndices} />);
    expect(screen.getByText('+0.48%')).toBeInTheDocument();
    expect(screen.getByText('-0.24%')).toBeInTheDocument();
    expect(screen.getByText('+0.31%')).toBeInTheDocument();
  });

  it('applies correct up/down classes', () => {
    render(<IndexStrip indices={mockIndices} />);
    const nasdaqChange = screen.getByText('+0.48%');
    expect(nasdaqChange).toHaveClass('up');
    const spChange = screen.getByText('-0.24%');
    expect(spChange).toHaveClass('down');
  });
});
