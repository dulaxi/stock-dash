import { useState, useEffect, useRef } from 'react';
import type { Quote } from '../types';
import { getLogoUrl } from '../tickerDomains';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Sparkline } from './Sparkline';

interface DashboardWatchlistProps {
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
  onSeeAll: () => void;
}

export default function DashboardWatchlist({ quotes, onSelectStock, onSeeAll }: DashboardWatchlistProps) {
  const [tickers, setTickers] = useLocalStorage<string[]>('xtox-watchlist', []);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [extraQuotes, setExtraQuotes] = useState<Record<string, Quote>>({});
  const [charts, setCharts] = useState<Record<string, number[]>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

  // Fetch quotes for tickers not in current market
  useEffect(() => {
    const missing = tickers.filter(t => !quoteMap.has(t));
    missing.forEach(sym => {
      if (extraQuotes[sym]) return;
      fetch(`/api/quote/${sym}`)
        .then(r => r.json())
        .then(data => setExtraQuotes(prev => ({ ...prev, [sym]: data })))
        .catch(() => {});
    });
  }, [tickers, quotes]);

  // Fetch sparkline charts
  useEffect(() => {
    tickers.forEach(sym => {
      if (charts[sym]) return;
      fetch(`/api/chart/${sym}`)
        .then(r => r.json())
        .then(data => setCharts(prev => ({ ...prev, [sym]: data.map((p: { close: number }) => p.close) })))
        .catch(() => {});
    });
  }, [tickers]);

  const getQuote = (sym: string): Quote | undefined => quoteMap.get(sym) || extraQuotes[sym];

  const searchResults = search
    ? quotes.filter(q => q.symbol.toLowerCase().startsWith(search.toLowerCase()) && !tickers.includes(q.symbol)).slice(0, 6)
    : [];

  const addTicker = (sym: string) => {
    if (!tickers.includes(sym)) setTickers([...tickers, sym]);
    setSearch('');
    setShowDropdown(false);
  };

  const removeTicker = (sym: string) => setTickers(tickers.filter(t => t !== sym));

  return (
    <div className="dashboard-watchlist">
      <div className="panel-header">
        <span className="panel-title">WATCHLIST {tickers.length > 0 && `(${tickers.length})`}</span>
        <div className="panel-header-actions">
          <button className="panel-see-all" onClick={onSeeAll}>See all &rarr;</button>
        </div>
      </div>
      <div className="watchlist-add" style={{ position: 'relative' }}>
        <input ref={inputRef} value={search} placeholder="+ Add ticker..."
          onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          className="watchlist-add-input" />
        {showDropdown && searchResults.length > 0 && (
          <div className="watchlist-dropdown">
            {searchResults.map(q => (
              <div key={q.symbol} className="watchlist-dropdown-item"
                onMouseDown={() => addTicker(q.symbol)}>
                {q.symbol} {(q as Record<string, unknown>).shortName && <span className="text-secondary">&mdash; {(q as Record<string, unknown>).shortName as string}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="dashboard-watchlist-list">
        {tickers.length === 0 && (
          <div className="watchlist-empty">Add tickers to start your watchlist</div>
        )}
        {tickers.slice(0, 8).map(sym => {
          const q = getQuote(sym);
          const logo = getLogoUrl(sym);
          const data = charts[sym] || [];
          const up = (q?.changePercent || 0) >= 0;
          return (
            <div key={sym} className="watchlist-row" onClick={() => onSelectStock(sym)}>
              <div className="watchlist-row-left">
                {logo && <img src={logo} alt="" className="watchlist-row-logo"
                  onError={e => (e.currentTarget.style.display = 'none')} />}
                <span className="watchlist-row-symbol">{sym}</span>
              </div>
              <div className="watchlist-row-right">
                {data.length > 1 && <Sparkline data={data} width={40} height={16} color={up ? 'var(--green)' : 'var(--red)'} />}
                <span className={`watchlist-row-change ${up ? 'up' : 'down'}`}>
                  {q ? `${up ? '+' : ''}${q.changePercent?.toFixed(1)}%` : '\u2014'}
                </span>
              </div>
              <button className="watchlist-row-remove" onClick={e => { e.stopPropagation(); removeTicker(sym); }}>&times;</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
