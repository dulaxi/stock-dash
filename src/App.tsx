import { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { usePolling } from './hooks/usePolling';
import HeaderBar from './components/HeaderBar';
import Dashboard from './components/Dashboard';
import { StockDetail } from './components/StockDetail';
import { HeatmapView } from './components/HeatmapView';
import { TopMoversView } from './components/TopMoversView';
import { GridView } from './components/GridView';
import WatchlistView from './components/WatchlistView';
import NewsView from './components/NewsView';
import type { Market, View } from './types';
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
  const [market, setMarket] = useLocalStorage<Market>('xtox-market', 'all');
  const [view, setView] = useLocalStorage<View>('xtox-view', 'dashboard');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const { quotes, indices, loading, error } = usePolling(market, 10000);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
  };

  const getMarketStatus = (): string => {
    const now = new Date();
    const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const h = et.getHours();
    const m = et.getMinutes();
    const day = et.getDay();
    if (day === 0 || day === 6) return 'closed';
    const mins = h * 60 + m;
    if (mins >= 570 && mins < 960) return 'open';
    if (mins >= 240 && mins < 570) return 'pre';
    return 'closed';
  };

  const marketStatus = getMarketStatus();

  const handleBackToDashboard = () => {
    setSelectedStock(null);
    setView('dashboard');
  };

  const handleNavigate = (v: string) => {
    setView(v as View);
  };

  const headerProps = {
    market,
    onMarketChange: setMarket,
    theme,
    onThemeToggle: toggleTheme,
    marketStatus,
    quotes,
    onSelectStock: setSelectedStock,
    onBackToDashboard: handleBackToDashboard,
  };

  if (selectedStock) {
    return (
      <div className="app">
        <HeaderBar {...headerProps} view="detail" />
        <StockDetail symbol={selectedStock} onBack={() => setSelectedStock(null)} />
      </div>
    );
  }

  return (
    <div className="app">
      <HeaderBar {...headerProps} view={view} />
      {error && <div className="error-banner">Connection lost. Retrying...</div>}
      {loading ? (
        <Skeleton />
      ) : (
        <>
          {view === 'dashboard' && (
            <Dashboard
              quotes={quotes}
              indices={indices}
              market={market}
              onSelectStock={setSelectedStock}
              onNavigate={handleNavigate}
            />
          )}
          {view === 'heatmap' && <HeatmapView quotes={quotes} onSelectStock={setSelectedStock} />}
          {view === 'movers' && <TopMoversView quotes={quotes} onSelectStock={setSelectedStock} />}
          {view === 'grid' && <GridView quotes={quotes} onSelectStock={setSelectedStock} />}
          {view === 'watchlist' && <WatchlistView quotes={quotes} onSelectStock={setSelectedStock} />}
          {view === 'news' && <NewsView market={market} />}
        </>
      )}
    </div>
  );
}

export default App;
