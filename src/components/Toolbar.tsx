import type { Market, View } from '../types';
import './Toolbar.css';

interface ToolbarProps {
  market: Market;
  onMarketChange: (market: Market) => void;
  view: View;
  onViewChange: (view: View) => void;
}

const MARKETS: { value: Market; label: string }[] = [
  { value: 'nasdaq', label: 'NASDAQ-100' },
  { value: 'sp500', label: 'S&P 500' },
  { value: 'dow', label: 'DOW 30' },
];

const VIEWS: { value: View; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'movers', label: 'Top Movers' },
  { value: 'grid', label: 'Grid' },
  { value: 'heatmap', label: 'Heatmap' },
];

export function Toolbar({ market, onMarketChange, view, onViewChange }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="pill-group">
        {MARKETS.map(m => (
          <button
            key={m.value}
            className={`pill ${market === m.value ? 'active' : ''}`}
            onClick={() => onMarketChange(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="pill-group">
        {VIEWS.map(v => (
          <button
            key={v.value}
            className={`pill ${view === v.value ? 'active' : ''}`}
            onClick={() => onViewChange(v.value)}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
