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
          &#8592; Dashboard
        </button>
      )}
      <div className="header-bar-logo" onClick={onBackToDashboard}>XTOX</div>

      <div className={`header-bar-search ${expanded ? 'expanded' : ''}`}>
        <button className="header-bar-search-btn" onClick={() => {
          setExpanded(!expanded);
          setTimeout(() => inputRef.current?.focus(), 100);
        }} aria-label="Search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
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
                <button key={q.symbol} className="search-item"
                  onMouseDown={() => { onSelectStock(q.symbol); setSearch(''); setExpanded(false); }}>
                  <div className="search-item-left">
                    {logo && <img className="search-item-logo" src={logo} alt=""
                      onError={e => (e.currentTarget.style.display = 'none')} />}
                    <span className="search-item-symbol">{q.symbol}</span>
                    {(q as Record<string, unknown>).shortName && (
                      <span className="search-item-name">{String((q as Record<string, unknown>).shortName)}</span>
                    )}
                  </div>
                  <span style={{ color: q.changePercent >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                    {q.changePercent >= 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                  </span>
                </button>
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
        <div className="pill-group">
          <button className="pill icon-pill" onClick={onThemeToggle} aria-label="Toggle theme">
            {theme === 'dark' ? '\u2600' : '\u263E'}
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
