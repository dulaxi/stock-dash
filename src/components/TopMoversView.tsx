import type { Quote } from '../types';
import './TopMoversView.css';

interface TopMoversViewProps {
  quotes: Quote[];
}

export function TopMoversView({ quotes }: TopMoversViewProps) {
  const gainers = quotes
    .filter(q => q.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 10);

  const losers = quotes
    .filter(q => q.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 10);

  return (
    <div className="movers-view">
      <div className="movers-section">
        <h3 className="movers-title">Gainers</h3>
        <div className="movers-grid">
          {gainers.map(q => (
            <div key={q.symbol} className="mover-card">
              <div className="mover-symbol">{q.symbol}</div>
              <div className="mover-price">${q.price?.toFixed(2)}</div>
              <div className="mover-percent up">
                +{q.changePercent?.toFixed(2)}%
              </div>
            </div>
          ))}
          {gainers.length === 0 && <div className="movers-empty">No gainers</div>}
        </div>
      </div>

      <div className="movers-section">
        <h3 className="movers-title">Losers</h3>
        <div className="movers-grid">
          {losers.map(q => (
            <div key={q.symbol} className="mover-card">
              <div className="mover-symbol">{q.symbol}</div>
              <div className="mover-price">${q.price?.toFixed(2)}</div>
              <div className="mover-percent down">
                {q.changePercent?.toFixed(2)}%
              </div>
            </div>
          ))}
          {losers.length === 0 && <div className="movers-empty">No losers</div>}
        </div>
      </div>
    </div>
  );
}
