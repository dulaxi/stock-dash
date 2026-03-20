import { useState, useRef } from 'react';
import type { Market, View, Quote } from '../types';
import { getLogoUrl } from '../tickerDomains';
import { MagnifyingGlass } from '@phosphor-icons/react';
import './Toolbar.css';

interface ToolbarProps {
  market: Market;
  onMarketChange: (market: Market) => void;
  view: View;
  onViewChange: (view: View) => void;
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
}

const MARKETS: { value: Market; label: string }[] = [
  { value: 'nasdaq', label: 'NASDAQ-100' },
  { value: 'sp500', label: 'S&P 500' },
  { value: 'dow', label: 'DOW 30' },
];

const VIEWS: { value: View; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'movers', label: 'Top Movers' },
  { value: 'grid', label: 'Grid' },
  { value: 'heatmap', label: 'Heatmap' },
];

export function Toolbar({ market, onMarketChange, view, onViewChange, quotes, onSelectStock }: ToolbarProps) {
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = search.length > 0
    ? quotes.filter(q => q.symbol.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  const handleSelect = (symbol: string) => {
    onSelectStock(symbol);
    setSearch('');
    setShowResults(false);
    setExpanded(false);
    inputRef.current?.blur();
  };

  return (
    <div className="toolbar">
      <div className="pill-group">
        {MARKETS.map(m => (
          <button
            key={m.value}
            className={`pill ${market === m.value ? 'active' : ''}`}
            onClick={() => onMarketChange(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className={`toolbar-search-wrap ${expanded ? 'expanded' : ''}`}>
        {!expanded && (
          <button className="search-icon-btn" onClick={() => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 50); }} aria-label="Search">
            <MagnifyingGlass size={16} weight="bold" />
          </button>
        )}
        {expanded && (
          <input
            ref={inputRef}
            className="toolbar-search"
            type="text"
            placeholder="Search ticker..."
            value={search}
            onChange={e => { setSearch(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            onBlur={() => { setTimeout(() => { setShowResults(false); if (!search) setExpanded(false); }, 150); }}
          />
        )}
        {showResults && results.length > 0 && (
          <div className="toolbar-search-dropdown">
            {results.map(q => (
              <button key={q.symbol} className="toolbar-search-result" onMouseDown={() => handleSelect(q.symbol)}>
                {getLogoUrl(q.symbol) && (
                  <img className="toolbar-search-logo" src={getLogoUrl(q.symbol)!} alt="" />
                )}
                <span className="toolbar-search-symbol">{q.symbol}</span>
                <span className="toolbar-search-price">${q.price?.toFixed(2)}</span>
                <span className={`toolbar-search-change ${q.changePercent > 0 ? 'up' : q.changePercent < 0 ? 'down' : ''}`}>
                  {q.changePercent > 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pill-group">
        {VIEWS.map(v => (
          <button
            key={v.value}
            className={`pill ${view === v.value ? 'active' : ''}`}
            onClick={() => onViewChange(v.value)}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
