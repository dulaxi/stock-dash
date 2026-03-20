import { useMemo } from 'react';
import type { Quote } from '../types';

interface DashboardMoversProps {
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
  onSeeAll: () => void;
}

export default function DashboardMovers({ quotes, onSelectStock, onSeeAll }: DashboardMoversProps) {
  const { gainers, losers } = useMemo(() => {
    const sorted = [...quotes].sort((a, b) => b.changePercent - a.changePercent);
    return {
      gainers: sorted.slice(0, 5),
      losers: sorted.slice(-5).reverse(),
    };
  }, [quotes]);

  return (
    <div className="dashboard-movers">
      <div className="panel-header">
        <span className="panel-title">TOP MOVERS</span>
        <button className="panel-see-all" onClick={onSeeAll}>See all &rarr;</button>
      </div>
      <div className="movers-section">
        <div className="movers-label">GAINERS</div>
        {gainers.map(q => (
          <div key={q.symbol} className="movers-row" onClick={() => onSelectStock(q.symbol)}>
            <span className="movers-symbol">{q.symbol}</span>
            <span className="movers-change up">+{q.changePercent.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <div className="movers-section">
        <div className="movers-label">LOSERS</div>
        {losers.map(q => (
          <div key={q.symbol} className="movers-row" onClick={() => onSelectStock(q.symbol)}>
            <span className="movers-symbol">{q.symbol}</span>
            <span className="movers-change down">{q.changePercent.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
