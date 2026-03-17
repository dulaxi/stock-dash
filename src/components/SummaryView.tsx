import type { Quote, IndexQuote } from '../types';
import './SummaryView.css';

interface SummaryViewProps {
  quotes: Quote[];
  indices: IndexQuote[];
}

export function SummaryView({ quotes, indices }: SummaryViewProps) {
  const top50 = quotes.slice(0, 50);

  return (
    <div className="summary-view">
      <div className="index-cards">
        {indices.map(idx => (
          <div key={idx.symbol} className="index-card">
            <div className="index-name">{idx.name}</div>
            <div className="index-price">{idx.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className={`index-change ${idx.changePercent > 0 ? 'up' : idx.changePercent < 0 ? 'down' : ''}`}>
              {idx.changePercent > 0 ? '+' : ''}{idx.change?.toFixed(2)} ({idx.changePercent > 0 ? '+' : ''}{idx.changePercent?.toFixed(2)}%)
            </div>
          </div>
        ))}
      </div>

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
