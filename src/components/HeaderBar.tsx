import { useState, useRef, useEffect } from 'react';
import type { Market, Quote } from '../types';
import { getLogoUrl } from '../tickerDomains';
import { MagnifyingGlass, Sun, Moon } from '@phosphor-icons/react';
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

interface SearchResult {
  symbol: string;
  description: string;
  type: string;
  logo?: string | null;
}

const MARKETS: { value: Market; label: string }[] = [
  { value: 'all' as Market, label: 'All' },
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
  const [apiResults, setApiResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Local matches from loaded quotes (instant)
  const localMatches = search
    ? quotes.filter(q => q.symbol.toLowerCase().startsWith(search.toLowerCase())).slice(0, 4)
    : [];

  // Fetch from /api/search for universal results (debounced)
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

  // Merge local + API results, deduplicate, local first
  const localSymbols = new Set(localMatches.map(q => q.symbol));
  const apiFiltered = apiResults.filter(r => !localSymbols.has(r.symbol));
  const hasResults = localMatches.length > 0 || apiFiltered.length > 0;

  const statusLabel = marketStatus === 'open' ? 'Market Open'
    : marketStatus === 'pre' ? 'Pre-Market' : 'Market Closed';

  return (
    <div className="header-bar">
      <div className="header-bar-logo" onClick={onBackToDashboard}>XTOX</div>

      <div className={`header-bar-search ${expanded ? 'expanded' : ''}`}>
        <button className="header-bar-search-btn" onClick={() => {
          setExpanded(!expanded);
          setTimeout(() => inputRef.current?.focus(), 100);
        }} aria-label="Search">
          <MagnifyingGlass size={16} weight="bold" />
        </button>
        <input
          ref={inputRef}
          value={search}
          onChange={e => { setSearch(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => { setShowResults(false); setExpanded(false); setSearch(''); }, 150)}
          placeholder="Search any stock..."
        />
        {expanded && showResults && hasResults && (
          <div className="header-bar-search-results">
            {/* Local matches (with live price data) */}
            {localMatches.map(q => {
              const logo = getLogoUrl(q.symbol);
              return (
                <button key={q.symbol} className="search-item"
                  onMouseDown={() => { onSelectStock(q.symbol); setSearch(''); setExpanded(false); }}>
                  <div className="search-item-left">
                    {logo && <img className="search-item-logo" src={logo} alt=""
                      onError={e => (e.currentTarget.style.display = 'none')} />}
                    <span className="search-item-symbol">{q.symbol}</span>
                    <span className="search-item-name">{q.shortName || ''}</span>
                  </div>
                  <span style={{ color: q.changePercent >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                    {q.changePercent >= 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                  </span>
                </button>
              );
            })}
            {/* API results (universal search) */}
            {apiFiltered.map(r => (
              <button key={r.symbol} className="search-item"
                onMouseDown={() => { onSelectStock(r.symbol); setSearch(''); setExpanded(false); }}>
                <div className="search-item-left">
                  {r.logo && <img className="search-item-logo" src={r.logo} alt=""
                    onError={e => (e.currentTarget.style.display = 'none')} />}
                  <span className="search-item-symbol">{r.symbol}</span>
                  <span className="search-item-name">{r.description}</span>
                </div>
              </button>
            ))}
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
        <div className="pill-group">
          <button className="pill icon-pill" onClick={onThemeToggle} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
          </button>
          <div className="pill status-pill">
            <span className={`status-dot ${marketStatus}`} />
            {statusLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
