import { useState } from 'react';
import type { Quote } from '../types';
import { getLogoUrl } from '../tickerDomains';
import { FlashCell } from './FlashCell';
import './GridView.css';

interface GridViewProps {
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
}

type SortKey = keyof Quote;
type SortDir = 'asc' | 'desc';

function fmt(n?: number): string {
  if (n == null) return '—';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  return n.toLocaleString();
}

export function GridView({ quotes, onSelectStock }: GridViewProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = sortKey
    ? [...quotes].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      })
    : quotes;

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div className="grid-view">
      <table className="grid-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('symbol')}>Symbol{arrow('symbol')}</th>
            <th className="num" onClick={() => handleSort('price')}>Price{arrow('price')}</th>
            <th className="num" onClick={() => handleSort('change')}>Change{arrow('change')}</th>
            <th className="num" onClick={() => handleSort('changePercent')}>%{arrow('changePercent')}</th>
            <th className="num" onClick={() => handleSort('open')}>Open{arrow('open')}</th>
            <th className="num" onClick={() => handleSort('dayHigh')}>High{arrow('dayHigh')}</th>
            <th className="num" onClick={() => handleSort('dayLow')}>Low{arrow('dayLow')}</th>
            <th className="num" onClick={() => handleSort('volume')}>Volume{arrow('volume')}</th>
            <th className="num" onClick={() => handleSort('marketCap')}>Mkt Cap{arrow('marketCap')}</th>
            <th className="num" onClick={() => handleSort('trailingPE')}>P/E{arrow('trailingPE')}</th>
            <th className="num" onClick={() => handleSort('fiftyTwoWeekHigh')}>52W H{arrow('fiftyTwoWeekHigh')}</th>
            <th className="num" onClick={() => handleSort('fiftyTwoWeekLow')}>52W L{arrow('fiftyTwoWeekLow')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(q => (
            <tr key={q.symbol} className="clickable-row" onClick={() => onSelectStock(q.symbol)}>
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
              <FlashCell value={q.price} className="num">${q.price?.toFixed(2)}</FlashCell>
              <td className={`num ${q.change > 0 ? 'up' : q.change < 0 ? 'down' : ''}`}>
                {q.change > 0 ? '+' : ''}{q.change?.toFixed(2)}
              </td>
              <td className={`num ${q.changePercent > 0 ? 'up' : q.changePercent < 0 ? 'down' : ''}`}>
                {q.changePercent > 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
              </td>
              <td className="num">${q.open?.toFixed(2) ?? '—'}</td>
              <td className="num">${q.dayHigh?.toFixed(2) ?? '—'}</td>
              <td className="num">${q.dayLow?.toFixed(2) ?? '—'}</td>
              <td className="num">{fmt(q.volume)}</td>
              <td className="num">{fmt(q.marketCap)}</td>
              <td className="num">{q.trailingPE?.toFixed(1) ?? '—'}</td>
              <td className="num">${q.fiftyTwoWeekHigh?.toFixed(2) ?? '—'}</td>
              <td className="num">${q.fiftyTwoWeekLow?.toFixed(2) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
