import { useState, useEffect, useRef, Fragment } from 'react';
import { Plus, X, MagnifyingGlass } from '@phosphor-icons/react';
import { getLogoUrl } from '../tickerDomains';
import MetricTooltip from './MetricTooltip';
import './CompareView.css';

interface Detail {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  prevClose?: number;
  open?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  avgVolume?: number;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  peg?: number;
  priceToBook?: number;
  priceToSales?: number;
  enterpriseValue?: number;
  evToEbitda?: number;
  evToRevenue?: number;
  epsTrailing?: number;
  epsForward?: number;
  profitMargin?: number;
  operatingMargin?: number;
  grossMargin?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  bookValue?: number;
  dividendRate?: number;
  dividendYield?: number;
  payoutRatio?: number;
  beta?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyDayAvg?: number;
  twoHundredDayAvg?: number;
  sharesOutstanding?: number;
  shortRatio?: number;
  sector?: string;
  industry?: string;
}

interface CompareViewProps {
  initialSymbols?: string[];
  onSelectStock: (symbol: string) => void;
}

interface SearchResult {
  symbol: string;
  description: string;
  type: string;
  logo?: string | null;
}

// Format numbers: T/B/M abbreviation for large numbers, toFixed(2) for others
function fmt(n?: number, decimals = 2): string {
  if (n == null) return '\u2014';
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  return n.toFixed(decimals);
}

// Format percentage (value is a decimal, e.g. 0.25 -> 25.00%)
function pct(n?: number): string {
  if (n == null) return '\u2014';
  return (n * 100).toFixed(2) + '%';
}

// Metric definitions: key, label, tooltipKey, accessor, formatter, and whether lower is better
type MetricDef = {
  key: string;
  label: string;
  tooltipKey: string;
  accessor: (d: Detail) => number | undefined;
  format: (n?: number) => string;
  lowerIsBetter: boolean;
};

const METRIC_SECTIONS: { title: string; metrics: MetricDef[] }[] = [
  {
    title: 'Valuation',
    metrics: [
      { key: 'marketCap', label: 'Mkt Cap', tooltipKey: 'marketCap', accessor: d => d.marketCap, format: n => fmt(n, 2), lowerIsBetter: false },
      { key: 'pe', label: 'P/E', tooltipKey: 'pe', accessor: d => d.trailingPE, format: n => fmt(n, 1), lowerIsBetter: true },
      { key: 'forwardPE', label: 'Fwd P/E', tooltipKey: 'forwardPE', accessor: d => d.forwardPE, format: n => fmt(n, 1), lowerIsBetter: true },
      { key: 'peg', label: 'PEG', tooltipKey: 'peg', accessor: d => d.peg, format: n => fmt(n, 2), lowerIsBetter: true },
      { key: 'ps', label: 'P/S', tooltipKey: 'ps', accessor: d => d.priceToSales, format: n => fmt(n, 2), lowerIsBetter: true },
      { key: 'pb', label: 'P/B', tooltipKey: 'pb', accessor: d => d.priceToBook, format: n => fmt(n, 2), lowerIsBetter: true },
    ],
  },
  {
    title: 'Profitability',
    metrics: [
      { key: 'profitMargin', label: 'Margin', tooltipKey: 'profitMargin', accessor: d => d.profitMargin, format: pct, lowerIsBetter: false },
      { key: 'operatingMargin', label: 'Op. Marg', tooltipKey: 'operatingMargin', accessor: d => d.operatingMargin, format: pct, lowerIsBetter: false },
      { key: 'grossMargin', label: 'Gross Marg', tooltipKey: 'grossMargin', accessor: d => d.grossMargin, format: pct, lowerIsBetter: false },
      { key: 'roe', label: 'ROE', tooltipKey: 'roe', accessor: d => d.returnOnEquity, format: pct, lowerIsBetter: false },
      { key: 'roa', label: 'ROA', tooltipKey: 'roa', accessor: d => d.returnOnAssets, format: pct, lowerIsBetter: false },
      { key: 'eps', label: 'EPS', tooltipKey: 'eps', accessor: d => d.epsTrailing, format: n => fmt(n, 2), lowerIsBetter: false },
    ],
  },
  {
    title: 'Performance',
    metrics: [
      { key: 'beta', label: 'Beta', tooltipKey: 'beta', accessor: d => d.beta, format: n => fmt(n, 2), lowerIsBetter: false },
      { key: 'fiftyTwoWeekHigh', label: '52W High', tooltipKey: 'fiftyTwoWeekHigh', accessor: d => d.fiftyTwoWeekHigh, format: n => n != null ? '$' + fmt(n, 2) : '\u2014', lowerIsBetter: false },
      { key: 'fiftyTwoWeekLow', label: '52W Low', tooltipKey: 'fiftyTwoWeekLow', accessor: d => d.fiftyTwoWeekLow, format: n => n != null ? '$' + fmt(n, 2) : '\u2014', lowerIsBetter: false },
      { key: 'sma50', label: 'SMA 50', tooltipKey: 'sma50', accessor: d => d.fiftyDayAvg, format: n => n != null ? '$' + fmt(n, 2) : '\u2014', lowerIsBetter: false },
      { key: 'sma200', label: 'SMA 200', tooltipKey: 'sma200', accessor: d => d.twoHundredDayAvg, format: n => n != null ? '$' + fmt(n, 2) : '\u2014', lowerIsBetter: false },
    ],
  },
  {
    title: 'Balance Sheet',
    metrics: [
      { key: 'debtEquity', label: 'Debt/Eq', tooltipKey: 'debtEquity', accessor: d => d.debtToEquity, format: n => fmt(n, 2), lowerIsBetter: true },
      { key: 'currentRatio', label: 'Curr Rat', tooltipKey: 'currentRatio', accessor: d => d.currentRatio, format: n => fmt(n, 2), lowerIsBetter: false },
      { key: 'dividendYield', label: 'Dividend', tooltipKey: 'dividendYield', accessor: d => d.dividendYield, format: pct, lowerIsBetter: false },
      { key: 'shortRatio', label: 'Short Ratio', tooltipKey: 'shortRatio', accessor: d => d.shortRatio, format: n => fmt(n, 2), lowerIsBetter: true },
    ],
  },
];

// Determine best/worst index among values (ignoring null/undefined)
function getBestWorst(values: (number | undefined)[], lowerIsBetter: boolean): { bestIdx: number; worstIdx: number } {
  let bestIdx = -1;
  let worstIdx = -1;
  let bestVal = lowerIsBetter ? Infinity : -Infinity;
  let worstVal = lowerIsBetter ? -Infinity : Infinity;

  values.forEach((v, i) => {
    if (v == null) return;
    if (lowerIsBetter) {
      if (v < bestVal) { bestVal = v; bestIdx = i; }
      if (v > worstVal) { worstVal = v; worstIdx = i; }
    } else {
      if (v > bestVal) { bestVal = v; bestIdx = i; }
      if (v < worstVal) { worstVal = v; worstIdx = i; }
    }
  });

  // Only highlight if there are at least 2 non-null values and best !== worst
  const nonNull = values.filter(v => v != null).length;
  if (nonNull < 2 || bestIdx === worstIdx) return { bestIdx: -1, worstIdx: -1 };
  return { bestIdx, worstIdx };
}

export default function CompareView({ initialSymbols, onSelectStock }: CompareViewProps) {
  const [symbols, setSymbols] = useState<string[]>(initialSymbols ?? []);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [apiResults, setApiResults] = useState<SearchResult[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch detail data for each symbol
  useEffect(() => {
    symbols.forEach(sym => {
      fetch(`/api/detail/${encodeURIComponent(sym)}`)
        .then(r => r.json())
        .then((d: Detail) => setDetails(prev => ({ ...prev, [sym]: d })))
        .catch(() => {});
    });
  }, [symbols]);

  // Fetch logos for each symbol
  useEffect(() => {
    symbols.forEach(sym => {
      // Try getLogoUrl first (Google favicon)
      const googleLogo = getLogoUrl(sym);
      if (googleLogo) {
        setLogos(prev => ({ ...prev, [sym]: googleLogo }));
      }
      // Also try Finnhub profile for higher quality logo
      fetch(`/api/profile/${encodeURIComponent(sym)}`)
        .then(r => r.json())
        .then(data => {
          if (data.logo) {
            setLogos(prev => ({ ...prev, [sym]: data.logo }));
          }
        })
        .catch(() => {});
    });
  }, [symbols]);

  // Search with debounce
  useEffect(() => {
    if (!search || search.length < 1) {
      setApiResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(search)}`)
        .then(r => r.json())
        .then((data: SearchResult[]) => setApiResults(data))
        .catch(() => setApiResults([]));
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const addSymbol = (sym: string) => {
    const upper = sym.toUpperCase();
    if (symbols.length >= 3 || symbols.includes(upper)) return;
    setSymbols(prev => [...prev, upper]);
    setShowSearch(false);
    setSearch('');
    setApiResults([]);
  };

  const removeSymbol = (sym: string) => {
    setSymbols(prev => prev.filter(s => s !== sym));
    setDetails(prev => {
      const next = { ...prev };
      delete next[sym];
      return next;
    });
    setLogos(prev => {
      const next = { ...prev };
      delete next[sym];
      return next;
    });
  };

  const filteredResults = apiResults.filter(r => !symbols.includes(r.symbol));

  return (
    <div className="compare-view">
      {/* Header */}
      <div className="compare-header">
        <h2>COMPARE STOCKS</h2>
        <div className="compare-search-wrapper">
          <button
            className="compare-add-btn"
            disabled={symbols.length >= 3}
            onClick={() => {
              setShowSearch(!showSearch);
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
          >
            <Plus size={14} weight="bold" />
            Add Stock
          </button>
          {showSearch && (
            <div className="compare-search">
              <div className="compare-search-input">
                <MagnifyingGlass size={16} weight="bold" />
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onBlur={() => setTimeout(() => { setShowSearch(false); setSearch(''); }, 150)}
                  placeholder="Search ticker or name..."
                  autoFocus
                />
              </div>
              {filteredResults.length > 0 && (
                <div className="compare-search-results">
                  {filteredResults.slice(0, 6).map(r => (
                    <button
                      key={r.symbol}
                      className="compare-search-item"
                      onMouseDown={() => addSymbol(r.symbol)}
                    >
                      {r.logo && (
                        <img
                          className="compare-search-item-logo"
                          src={r.logo}
                          alt=""
                          onError={e => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                      <span className="compare-search-item-symbol">{r.symbol}</span>
                      <span className="compare-search-item-name">{r.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {symbols.length === 0 && (
        <div className="compare-empty">
          <div className="compare-empty-icon">&#x2696;</div>
          <p>Add up to 3 stocks to compare</p>
        </div>
      )}

      {/* Comparison table */}
      {symbols.length > 0 && (
        <div className="compare-table-wrapper">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="compare-corner" />
                {symbols.map(sym => {
                  const d = details[sym];
                  const logo = logos[sym];
                  return (
                    <th key={sym} className="compare-stock-header">
                      <div className="compare-stock-header-inner">
                        <button className="compare-remove" onClick={() => removeSymbol(sym)} aria-label={`Remove ${sym}`}>
                          <X size={12} weight="bold" />
                        </button>
                        {logo && (
                          <img
                            className="compare-stock-logo"
                            src={logo}
                            alt=""
                            onError={e => (e.currentTarget.style.display = 'none')}
                          />
                        )}
                        <span
                          className="compare-stock-symbol"
                          onClick={() => onSelectStock(sym)}
                        >
                          {sym}
                        </span>
                        {d ? (
                          <>
                            <span
                              className="compare-stock-name"
                              onClick={() => onSelectStock(sym)}
                            >
                              {d.name}
                            </span>
                            <span className="compare-stock-price">${fmt(d.price, 2)}</span>
                            <span className={`compare-stock-change ${d.changePercent >= 0 ? 'positive' : 'negative'}`}>
                              {d.changePercent >= 0 ? '+' : ''}{d.changePercent?.toFixed(2)}%
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="compare-skeleton" />
                            <span className="compare-skeleton" />
                          </>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {METRIC_SECTIONS.map(section => {
                return (
                  <Fragment key={section.title}>
                    {/* Section title row */}
                    <tr className="compare-section-title">
                      <td colSpan={symbols.length + 1}>{section.title}</td>
                    </tr>
                    {/* Metric rows */}
                    {section.metrics.map(metric => {
                      const values = symbols.map(sym => {
                        const d = details[sym];
                        return d ? metric.accessor(d) : undefined;
                      });
                      const { bestIdx, worstIdx } = getBestWorst(values, metric.lowerIsBetter);

                      return (
                        <tr key={metric.key}>
                          <td className="compare-label">
                            <MetricTooltip metricKey={metric.tooltipKey}>
                              {metric.label}
                            </MetricTooltip>
                          </td>
                          {symbols.map((sym, i) => {
                            const d = details[sym];
                            let className = 'compare-cell';
                            if (i === bestIdx) className += ' best';
                            if (i === worstIdx) className += ' worst';

                            return (
                              <td key={sym} className={className}>
                                {d ? metric.format(values[i]) : <span className="compare-skeleton" />}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
