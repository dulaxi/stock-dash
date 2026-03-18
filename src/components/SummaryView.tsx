import { useState, useEffect } from 'react';
import type { Quote, IndexQuote, Market, NewsItem } from '../types';
import { Sparkline } from './Sparkline';
import { Watchlist } from './Watchlist';
import { getLogoUrl } from '../tickerDomains';
import './SummaryView.css';

interface SummaryViewProps {
  quotes: Quote[];
  indices: IndexQuote[];
  market: Market;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function SummaryView({ quotes, indices, market }: SummaryViewProps) {
  const top50 = quotes.slice(0, 50);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [charts, setCharts] = useState<Record<string, number[]>>({});

  useEffect(() => {
    fetch(`/api/news/${market}`)
      .then(r => r.json())
      .then(setNews)
      .catch(() => {});
  }, [market]);

  useEffect(() => {
    const symbols = ['^IXIC', '^GSPC', '^DJI'];
    Promise.all(
      symbols.map(s =>
        fetch(`/api/chart/${encodeURIComponent(s)}`)
          .then(r => r.json())
          .then(data => ({ symbol: s, data: data.map((p: { close: number }) => p.close) }))
          .catch(() => ({ symbol: s, data: [] }))
      )
    ).then(results => {
      const map: Record<string, number[]> = {};
      results.forEach(r => { map[r.symbol] = r.data; });
      setCharts(map);
    });
  }, []);

  return (
    <div className="summary-view">
      <svg className="svg-filters" aria-hidden="true">
        <filter id="duotone">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="discrete" tableValues="0.043 0.043 0.043 0.043 0.043 0.667 0.667 0.667 0.667 0.667" />
            <feFuncG type="discrete" tableValues="0.188 0.188 0.188 0.188 0.188 0.792 0.792 0.792 0.792 0.792" />
            <feFuncB type="discrete" tableValues="0.384 0.384 0.384 0.384 0.384 0.925 0.925 0.925 0.925 0.925" />
          </feComponentTransfer>
        </filter>
      </svg>
      <div className="index-cards">
        {indices.map(idx => (
          <div key={idx.symbol} className="index-card">
            <div className="index-name">{idx.name}</div>
            <div className="index-price">{idx.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className={`index-change ${idx.changePercent > 0 ? 'up' : idx.changePercent < 0 ? 'down' : ''}`}>
              {idx.changePercent > 0 ? '+' : ''}{idx.change?.toFixed(2)} ({idx.changePercent > 0 ? '+' : ''}{idx.changePercent?.toFixed(2)}%)
            </div>
            {charts[idx.symbol]?.length > 1 && (
              <div className="index-chart">
                <Sparkline data={charts[idx.symbol]} width={140} height={36} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="summary-columns">
        <div className="summary-left">
          <table className="summary-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th className="num">Price</th>
                <th className="num">Change</th>
                <th className="num">%</th>
              </tr>
            </thead>
            <tbody>
              {top50.map(q => (
                <tr key={q.symbol}>
                  <td className="symbol">
                {getLogoUrl(q.symbol) && (
                  <img
                    className="ticker-logo"
                    src={getLogoUrl(q.symbol)!}
                    alt=""
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                {q.symbol}
              </td>
                  <td className="num">${q.price?.toFixed(2)}</td>
                  <td className={`num ${q.change > 0 ? 'up' : q.change < 0 ? 'down' : ''}`}>
                    {q.change > 0 ? '+' : ''}{q.change?.toFixed(2)}
                  </td>
                  <td className={`num ${q.changePercent > 0 ? 'up' : q.changePercent < 0 ? 'down' : ''}`}>
                    {q.changePercent > 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="news-column">
          <Watchlist quotes={quotes} />
          <h3 className="news-title">Market News</h3>
          <div className="news-list">
            {news.map((n, i) => (
              <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="news-card">
                {n.thumbnail && (
                  <div className="news-thumb-wrap">
                    <img className="news-thumb" src={n.thumbnail} alt="" />
                  </div>
                )}
                <div className="news-body">
                  <div className="news-headline">{n.title}</div>
                  <div className="news-meta">
                    <span>{n.publisher}</span>
                    <span>{timeAgo(n.providerPublishTime)}</span>
                  </div>
                </div>
              </a>
            ))}
            {news.length === 0 && <div className="news-empty">Loading news...</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}
