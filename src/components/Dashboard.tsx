import type { Quote, IndexQuote, Market } from '../types';
import IndexStrip from './IndexStrip';
import SectorStrip from './SectorStrip';
import DashboardHeatmap from './DashboardHeatmap';
import DashboardWatchlist from './DashboardWatchlist';
import DashboardMovers from './DashboardMovers';
import NewsStrip from './NewsStrip';
import './Dashboard.css';

interface DashboardProps {
  quotes: Quote[];
  indices: IndexQuote[];
  market: Market;
  onSelectStock: (symbol: string) => void;
  onNavigate: (view: string) => void;
}

export default function Dashboard({ quotes, indices, market, onSelectStock, onNavigate }: DashboardProps) {
  return (
    <div className="dashboard">
      <IndexStrip indices={indices} />
      <SectorStrip market={market} />
      <div className="dashboard-main">
        <DashboardHeatmap
          quotes={quotes}
          onSelectStock={onSelectStock}
          onSeeAll={() => onNavigate('heatmap')}
        />
        <div className="dashboard-sidebar">
          <DashboardWatchlist
            quotes={quotes}
            onSelectStock={onSelectStock}
            onSeeAll={() => onNavigate('watchlist')}
          />
          <DashboardMovers
            quotes={quotes}
            onSelectStock={onSelectStock}
            onSeeAll={() => onNavigate('movers')}
          />
        </div>
      </div>
      <NewsStrip market={market} onSeeAll={() => onNavigate('news')} />
    </div>
  );
}
