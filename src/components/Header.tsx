import { useState, useRef } from 'react';
import type { PollingSpeed, Quote } from '../types';
import { getLogoUrl } from '../tickerDomains';
import './Header.css';

interface HeaderProps {
  theme: string;
  onThemeToggle: () => void;
  pollingSpeed: PollingSpeed;
  onPollingSpeedChange: (speed: PollingSpeed) => void;
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
  marketStatus: string;
}

const SPEEDS: { value: PollingSpeed; label: string }[] = [
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
];

export function Header({ theme, onThemeToggle, pollingSpeed, onPollingSpeedChange, quotes, onSelectStock, marketStatus }: HeaderProps) {
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = search.length > 0
    ? quotes.filter(q => q.symbol.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  const handleSelect = (symbol: string) => {
    onSelectStock(symbol);
    setSearch('');
    setShowResults(false);
    inputRef.current?.blur();
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">XTOX</div>
        <div className="search-wrap">
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="Search ticker..."
            value={search}
            onChange={e => { setSearch(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
          />
          {showResults && results.length > 0 && (
            <div className="search-dropdown">
              {results.map(q => (
                <button key={q.symbol} className="search-result" onMouseDown={() => handleSelect(q.symbol)}>
                  {getLogoUrl(q.symbol) && (
                    <img className="search-logo" src={getLogoUrl(q.symbol)!} alt="" />
                  )}
                  <span className="search-symbol">{q.symbol}</span>
                  <span className="search-price">${q.price?.toFixed(2)}</span>
                  <span className={`search-change ${q.changePercent > 0 ? 'up' : q.changePercent < 0 ? 'down' : ''}`}>
                    {q.changePercent > 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="header-controls">
        <span className={`market-status ${marketStatus === 'open' ? 'open' : marketStatus === 'pre' ? 'pre' : 'closed'}`}>
          {marketStatus === 'open' ? 'Market Open' : marketStatus === 'pre' ? 'Pre-Market' : 'Market Closed'}
        </span>
        <span className="live-label">Live</span>
        <div className="speed-pills">
          {SPEEDS.map(s => (
            <button
              key={s.value}
              className={`speed-pill ${pollingSpeed === s.value ? 'active' : ''}`}
              onClick={() => onPollingSpeedChange(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button className="theme-toggle" onClick={onThemeToggle} aria-label="Toggle theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}
