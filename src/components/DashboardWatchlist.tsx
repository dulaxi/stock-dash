import { useState, useEffect, useRef } from 'react';
import type { Quote } from '../types';
import { getLogoUrl } from '../tickerDomains';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Sparkline } from './Sparkline';
import { X } from '@phosphor-icons/react';

interface SearchResult {
  symbol: string;
  description: string;
  logo?: string | null;
}

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
  const [logos, setLogos] = useState<Record<string, string>>({});
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

  // Fetch Finnhub logos for tickers without local logo
  useEffect(() => {
    tickers.forEach(sym => {
      if (getLogoUrl(sym) || logos[sym]) return;
      fetch(`/api/profile/${sym}`)
        .then(r => r.json())
        .then(data => { if (data.logo) setLogos(prev => ({ ...prev, [sym]: data.logo })); })
        .catch(() => {});
    });
  }, [tickers]);

  const getQuote = (sym: string): Quote | undefined => quoteMap.get(sym) || extraQuotes[sym];
  const getLogo = (sym: string): string | null => getLogoUrl(sym) || logos[sym] || null;

  // Local matches (instant)
  const localResults = search
    ? quotes.filter(q => q.symbol.toLowerCase().startsWith(search.toLowerCase()) && !tickers.includes(q.symbol)).slice(0, 3)
    : [];

  // Finnhub search (debounced)
  const [apiResults, setApiResults] = useState<SearchResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!search || search.length < 1) { setApiResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(search)}`)
        .then(r => r.json())
        .then((data: SearchResult[]) => setApiResults(data))
        .catch(() => setApiResults([]));
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const localSymbols = new Set(localResults.map(q => q.symbol));
  const apiFiltered = apiResults.filter(r => !localSymbols.has(r.symbol) && !tickers.includes(r.symbol));
  const hasSearchResults = localResults.length > 0 || apiFiltered.length > 0;

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
        {showDropdown && hasSearchResults && (
          <div className="watchlist-dropdown">
            {localResults.map(q => (
              <div key={q.symbol} className="watchlist-dropdown-item"
                onMouseDown={() => addTicker(q.symbol)}>
                {q.symbol} {q.shortName && <span className="text-secondary">&mdash; {q.shortName}</span>}
              </div>
            ))}
            {apiFiltered.map(r => (
              <div key={r.symbol} className="watchlist-dropdown-item"
                onMouseDown={() => addTicker(r.symbol)}>
                {r.symbol} <span className="text-secondary">&mdash; {r.description}</span>
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
          const logo = getLogo(sym);
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
              <button className="watchlist-row-remove" onClick={e => { e.stopPropagation(); removeTicker(sym); }}><X size={10} weight="bold" /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
