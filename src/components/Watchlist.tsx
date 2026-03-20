import { useState, useEffect, useRef } from 'react';
import type { Quote } from '../types';
import { Sparkline } from './Sparkline';
import { getLogoUrl } from '../tickerDomains';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { FlashDiv } from './FlashCell';
import { X } from '@phosphor-icons/react';
import './Watchlist.css';

interface WatchlistProps {
  quotes: Quote[];
}

export function Watchlist({ quotes }: WatchlistProps) {
  const [tickers, setTickers] = useLocalStorage<string[]>('xtox-watchlist', []);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [watchQuotes, setWatchQuotes] = useState<Record<string, Quote>>({});
  const [watchCharts, setWatchCharts] = useState<Record<string, number[]>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Build a lookup from current market quotes
  const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

  // Fetch quotes for tickers not in current market
  useEffect(() => {
    const missing = tickers.filter(t => !quoteMap.has(t));
    if (missing.length === 0) return;

    Promise.all(
      missing.map(t =>
        fetch(`/api/quotes/dow`) // fallback — individual fetch would be better
          .then(r => r.json())
          .then((data: Quote[]) => data.find(q => q.symbol === t))
          .catch(() => null)
      )
    ).then(results => {
      const extra: Record<string, Quote> = {};
      results.forEach(q => { if (q) extra[q.symbol] = q; });
      setWatchQuotes(extra);
    });
  }, [tickers]);

  // Fetch sparkline charts for watchlist tickers
  useEffect(() => {
    if (tickers.length === 0) return;
    Promise.all(
      tickers.map(t =>
        fetch(`/api/chart/${encodeURIComponent(t)}`)
          .then(r => r.json())
          .then((data: { close: number }[]) => ({ symbol: t, data: data.map(p => p.close) }))
          .catch(() => ({ symbol: t, data: [] as number[] }))
      )
    ).then(results => {
      const map: Record<string, number[]> = {};
      results.forEach(r => { map[r.symbol] = r.data; });
      setWatchCharts(map);
    });
  }, [tickers]);

  // All known symbols for search
  const allSymbols = quotes.map(q => q.symbol);

  const filtered = search.length > 0
    ? allSymbols.filter(s =>
        s.toLowerCase().includes(search.toLowerCase()) && !tickers.includes(s)
      ).slice(0, 6)
    : [];

  const addTicker = (symbol: string) => {
    if (!tickers.includes(symbol)) {
      setTickers([...tickers, symbol]);
    }
    setSearch('');
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const removeTicker = (symbol: string) => {
    setTickers(tickers.filter(t => t !== symbol));
  };

  const clearAll = () => {
    setTickers([]);
  };

  const getQuote = (symbol: string): Quote | undefined => {
    return quoteMap.get(symbol) || watchQuotes[symbol];
  };

  return (
    <div className="watchlist">
      <h3 className="watchlist-title">Watchlist</h3>

      <div className="watchlist-search">
        <input
          ref={inputRef}
          className="watchlist-input"
          type="text"
          placeholder="Add ticker..."
          value={search}
          onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        />
        {showDropdown && filtered.length > 0 && (
          <div className="watchlist-dropdown">
            {filtered.map(s => (
              <button key={s} className="watchlist-dropdown-item" onMouseDown={() => addTicker(s)}>
                {getLogoUrl(s) && (
                  <img className="watchlist-dropdown-logo" src={getLogoUrl(s)!} alt="" />
                )}
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {tickers.length === 0 ? (
        <div className="watchlist-empty">Type a ticker above to start your watchlist</div>
      ) : (
        <>
          <div className="watchlist-cards">
            {tickers.map(t => {
              const q = getQuote(t);
              if (!q) return null;
              return (
                <div key={t} className="watchlist-card">
                  <button className="watchlist-remove" onClick={() => removeTicker(t)}><X size={10} weight="bold" /></button>
                  <div className="watchlist-card-header">
                    {getLogoUrl(t) && (
                      <img
                        className="watchlist-card-logo"
                        src={getLogoUrl(t)!}
                        alt=""
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <span className="watchlist-card-symbol">{t}</span>
                  </div>
                  <FlashDiv value={q.price} className="watchlist-card-price">${q.price?.toFixed(2)}</FlashDiv>
                  <div className={`watchlist-card-change ${q.changePercent > 0 ? 'up' : q.changePercent < 0 ? 'down' : ''}`}>
                    {q.changePercent > 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                  </div>
                  {watchCharts[t]?.length > 1 && (
                    <div className="watchlist-card-chart">
                      <Sparkline data={watchCharts[t]} width={100} height={28} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button className="watchlist-clear" onClick={clearAll}>Clear all</button>
        </>
      )}
    </div>
  );
}
