import { useState, useEffect } from 'react';
import type { Quote } from '../types';
import { getLogoUrl } from '../tickerDomains';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Sparkline } from './Sparkline';
import './WatchlistView.css';

interface WatchlistViewProps {
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
}

export default function WatchlistView({ quotes, onSelectStock }: WatchlistViewProps) {
  const [tickers] = useLocalStorage<string[]>('xtox-watchlist', []);
  const [extraQuotes, setExtraQuotes] = useState<Record<string, Quote>>({});
  const [charts, setCharts] = useState<Record<string, number[]>>({});

  const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

  // Fetch quotes for tickers not in current market data
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

  if (tickers.length === 0) {
    return (
      <div className="watchlist-view">
        <div className="watchlist-view-empty">
          Your watchlist is empty. Add tickers from the dashboard to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="watchlist-view">
      <h3 className="watchlist-view-title">Watchlist ({tickers.length})</h3>
      <div className="watchlist-view-grid">
        {tickers.map(sym => {
          const q = getQuote(sym);
          const logo = getLogoUrl(sym);
          const data = charts[sym] || [];
          const up = (q?.changePercent || 0) >= 0;

          return (
            <div
              key={sym}
              className="watchlist-view-card"
              onClick={() => onSelectStock(sym)}
            >
              <div className="watchlist-view-card-header">
                {logo && (
                  <img
                    className="watchlist-view-card-logo"
                    src={logo}
                    alt=""
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <span className="watchlist-view-card-symbol">{sym}</span>
              </div>
              {q?.shortName && (
                <div className="watchlist-view-card-name">{q.shortName}</div>
              )}
              {data.length > 1 && (
                <div className="watchlist-view-card-chart">
                  <Sparkline data={data} width={160} height={40} />
                </div>
              )}
              <div className="watchlist-view-card-price">
                {q ? `$${q.price?.toFixed(2)}` : '\u2014'}
              </div>
              <div className={`watchlist-view-card-change ${up ? 'up' : 'down'}`}>
                {q ? `${up ? '+' : ''}${q.changePercent?.toFixed(2)}%` : '\u2014'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
