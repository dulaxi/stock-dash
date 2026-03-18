import { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { usePolling } from './hooks/usePolling';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { SummaryView } from './components/SummaryView';
import { TopMoversView } from './components/TopMoversView';
import { GridView } from './components/GridView';
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

  const { quotes, indices, loading, switching, error } = usePolling(market, pollingSpeed);

  // Trigger view transition animation
  useEffect(() => {
    setViewKey(k => k + 1);
  }, [view]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
  };

  return (
    <div className="app">
      <Header
        theme={theme}
        onThemeToggle={toggleTheme}
        pollingSpeed={pollingSpeed}
        onPollingSpeedChange={setPollingSpeed}
      />
      <Toolbar
        market={market}
        onMarketChange={setMarket}
        view={view}
        onViewChange={setView}
      />

      <main className={`content${switching ? ' switching' : ''}`}>
        {error && <div className="error-banner">Connection lost. Retrying...</div>}
        {loading ? (
          <Skeleton />
        ) : quotes.length === 0 ? (
          <div className="state-msg">No data available</div>
        ) : (
          <div key={viewKey} className="view-enter">
            {view === 'summary' && <SummaryView quotes={quotes} indices={indices} market={market} />}
            {view === 'movers' && <TopMoversView quotes={quotes} />}
            {view === 'grid' && <GridView quotes={quotes} />}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
