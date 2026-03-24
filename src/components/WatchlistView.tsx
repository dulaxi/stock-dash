import { useState, useEffect, useMemo, useRef } from 'react';
import type { Quote } from '../types';
import { getLogoUrl } from '../tickerDomains';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Sparkline } from './Sparkline';
import './WatchlistView.css';

interface WatchlistViewProps {
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
}

// Mini squarify for watchlist heatmap
interface HeatNode {
  symbol: string;
  changePercent: number;
  value: number;
  x: number; y: number; w: number; h: number;
}

function squarify(items: { symbol: string; changePercent: number; value: number }[], x: number, y: number, w: number, h: number): HeatNode[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return [];

  const nodes: HeatNode[] = [];
  let remaining = [...items];
  let cx = x, cy = y, cw = w, ch = h;

  while (remaining.length > 0) {
    const isWide = cw >= ch;
    const side = isWide ? ch : cw;
    const totalRemaining = remaining.reduce((s, i) => s + i.value, 0);
    let row: typeof remaining = [];
    let rowSum = 0;
    let bestRatio = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      row.push(remaining[i]);
      rowSum += remaining[i].value;
      const rowWidth = (rowSum / totalRemaining) * (isWide ? cw : ch);
      let worstRatio = 0;
      for (const item of row) {
        const itemHeight = (item.value / rowSum) * side;
        const ratio = Math.max(rowWidth / itemHeight, itemHeight / rowWidth);
        worstRatio = Math.max(worstRatio, ratio);
      }
      if (worstRatio > bestRatio && row.length > 1) {
        row.pop();
        rowSum -= remaining[i].value;
        break;
      }
      bestRatio = worstRatio;
    }

    const rowWidth = (rowSum / totalRemaining) * (isWide ? cw : ch);
    let offset = 0;
    for (const item of row) {
      const frac = item.value / rowSum;
      const itemSize = frac * side;
      if (isWide) {
        nodes.push({ ...item, x: cx, y: cy + offset, w: rowWidth, h: itemSize });
      } else {
        nodes.push({ ...item, x: cx + offset, y: cy, w: itemSize, h: rowWidth });
      }
      offset += itemSize;
    }
    if (isWide) { cx += rowWidth; cw -= rowWidth; }
    else { cy += rowWidth; ch -= rowWidth; }
    remaining = remaining.slice(row.length);
  }
  return nodes;
}

function getColor(pct: number): string {
  if (pct > 3) return '#22c55e';
  if (pct > 1.5) return '#4ade80';
  if (pct > 0.5) return '#86efac';
  if (pct > 0) return '#bbf7d0';
  if (pct === 0) return '#6b7280';
  if (pct > -0.5) return '#fecaca';
  if (pct > -1.5) return '#f87171';
  if (pct > -3) return '#ef4444';
  return '#dc2626';
}

export default function WatchlistView({ quotes, onSelectStock }: WatchlistViewProps) {
  const [tickers] = useLocalStorage<string[]>('xtox-watchlist', []);
  const [extraQuotes, setExtraQuotes] = useState<Record<string, Quote>>({});
  const [charts, setCharts] = useState<Record<string, number[]>>({});
  const [logos, setLogos] = useState<Record<string, string>>({});
  const heatmapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 180 });

  const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

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

  useEffect(() => {
    tickers.forEach(sym => {
      if (charts[sym]) return;
      fetch(`/api/chart/${sym}`)
        .then(r => r.json())
        .then(data => setCharts(prev => ({ ...prev, [sym]: data.map((p: { close: number }) => p.close) })))
        .catch(() => {});
    });
  }, [tickers]);

  useEffect(() => {
    const el = heatmapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      if (width > 0) setDims({ w: width, h: 180 });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Fetch Finnhub logos for all tickers (higher quality than Google favicon)
  useEffect(() => {
    tickers.forEach(sym => {
      if (logos[sym]) return;
      fetch(`/api/profile/${sym}`)
        .then(r => r.json())
        .then(data => { if (data.logo) setLogos(prev => ({ ...prev, [sym]: data.logo })); })
        .catch(() => {});
    });
  }, [tickers]);

  const getQuote = (sym: string): Quote | undefined => quoteMap.get(sym) || extraQuotes[sym];

  const heatNodes = useMemo(() => {
    const items = tickers
      .map(sym => {
        const q = getQuote(sym);
        return {
          symbol: sym,
          changePercent: q?.changePercent || 0,
          value: q?.marketCap || q?.price || 1, // market cap preferred, price fallback, equal weight last
        };
      })
      .sort((a, b) => b.value - a.value);
    return squarify(items, 0, 0, dims.w, dims.h);
  }, [tickers, quotes, extraQuotes, dims]);

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

      {tickers.length >= 2 && (
        <div className="watchlist-heatmap" ref={heatmapRef}>
          <svg width={dims.w} height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}>
            {heatNodes.map(n => {
              const gap = 2;
              const cw = Math.max(0, n.w - gap * 2);
              const ch = Math.max(0, n.h - gap * 2);
              const showSymbol = cw > 30 && ch > 20;
              const showPercent = cw > 50 && ch > 35;
              const fontSize = cw > 100 ? 14 : cw > 60 ? 12 : 10;
              return (
                <g key={n.symbol} onClick={() => onSelectStock(n.symbol)} style={{ cursor: 'pointer' }}>
                  <rect x={n.x + gap} y={n.y + gap} width={cw} height={ch}
                    rx={4} fill={getColor(n.changePercent)} stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
                  {showSymbol && (
                    <text x={n.x + n.w / 2} y={n.y + n.h / 2 - (showPercent ? 6 : 0)}
                      textAnchor="middle" dominantBaseline="central"
                      fill="#fff" fontSize={fontSize} fontWeight="700">{n.symbol}</text>
                  )}
                  {showPercent && (
                    <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 9}
                      textAnchor="middle" dominantBaseline="central"
                      fill="rgba(255,255,255,0.85)" fontSize={fontSize - 2} fontWeight="500">
                      {n.changePercent >= 0 ? '+' : ''}{n.changePercent.toFixed(2)}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <div className="watchlist-view-grid">
        {tickers.map(sym => {
          const q = getQuote(sym);
          const logo = logos[sym] || getLogoUrl(sym) || null;
          const data = charts[sym] || [];
          const up = (q?.changePercent || 0) >= 0;

          return (
            <div key={sym} className="watchlist-view-card" onClick={() => onSelectStock(sym)}>
              <div className="watchlist-view-card-header">
                {logo && (
                  <img className="watchlist-view-card-logo" src={logo} alt=""
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
