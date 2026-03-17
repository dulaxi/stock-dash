import { useState } from 'react';
import type { Quote } from '../types';
import './GridView.css';

interface GridViewProps {
  quotes: Quote[];
}

type SortKey = 'symbol' | 'price' | 'change' | 'changePercent';
type SortDir = 'asc' | 'desc';

export function GridView({ quotes }: GridViewProps) {
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
          </tr>
        </thead>
        <tbody>
          {sorted.map(q => (
            <tr key={q.symbol}>
              <td className="symbol">{q.symbol}</td>
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
  );
}
