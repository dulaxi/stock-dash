import { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { usePolling } from './hooks/usePolling';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { SummaryView } from './components/SummaryView';
import { TopMoversView } from './components/TopMoversView';
import { GridView } from './components/GridView';
import { HeatmapView } from './components/HeatmapView';
import { StockDetail } from './components/StockDetail';
import type { Market, View, PollingSpeed } from './types';
import './App.css';

function Skeleton() {
  return (
    <div>
      <div className="skeleton-cards">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
      <div style={{ padding: '0 32px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton skeleton-cell w-md" />
            <div className="skeleton skeleton-cell w-md" />
            <div className="skeleton skeleton-cell w-sm" />
            <div className="skeleton skeleton-cell w-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useLocalStorage('xtox-theme', 'dark');
  const [market, setMarket] = useLocalStorage<Market>('xtox-market', 'nasdaq');
  const [view, setView] = useLocalStorage<View>('xtox-view', 'summary');
  const [pollingSpeed, setPollingSpeed] = useLocalStorage<PollingSpeed>('xtox-speed', 5000);
  const [viewKey, setViewKey] = useState(0);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const { quotes, indices, loading, switching, error } = usePolling(market, pollingSpeed);

  useEffect(() => {
    setViewKey(k => k + 1);
  }, [view]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
  };

  // Market status based on US Eastern Time
  const getMarketStatus = (): string => {
    const now = new Date();
    const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const h = et.getHours();
    const m = et.getMinutes();
    const day = et.getDay();
    if (day === 0 || day === 6) return 'closed';
    const mins = h * 60 + m;
    if (mins >= 570 && mins < 960) return 'open'; // 9:30 AM - 4:00 PM
    if (mins >= 240 && mins < 570) return 'pre'; // 4:00 AM - 9:30 AM
    return 'closed';
  };

  const marketStatus = getMarketStatus();

  const headerProps = {
    theme,
    onThemeToggle: toggleTheme,
    pollingSpeed,
    onPollingSpeedChange: setPollingSpeed,
    marketStatus,
  };

  if (selectedStock) {
    return (
      <div className="app">
        <Header {...headerProps} />
        <StockDetail symbol={selectedStock} onBack={() => setSelectedStock(null)} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header {...headerProps} />
      <Toolbar
        market={market}
        onMarketChange={setMarket}
        view={view}
        onViewChange={setView}
        quotes={quotes}
        onSelectStock={setSelectedStock}
      />

      <main className={`content${switching ? ' switching' : ''}`}>
        {error && <div className="error-banner">Connection lost. Retrying...</div>}
        {loading ? (
          <Skeleton />
        ) : quotes.length === 0 ? (
          <div className="state-msg">No data available</div>
        ) : (
          <div key={viewKey} className="view-enter">
            {view === 'summary' && <SummaryView quotes={quotes} indices={indices} market={market} onSelectStock={setSelectedStock} />}
            {view === 'movers' && <TopMoversView quotes={quotes} onSelectStock={setSelectedStock} />}
            {view === 'grid' && <GridView quotes={quotes} onSelectStock={setSelectedStock} />}
            {view === 'heatmap' && <HeatmapView quotes={quotes} onSelectStock={setSelectedStock} />}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
