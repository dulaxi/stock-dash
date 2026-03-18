import { useLocalStorage } from './hooks/useLocalStorage';
import { usePolling } from './hooks/usePolling';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { SummaryView } from './components/SummaryView';
import { TopMoversView } from './components/TopMoversView';
import { GridView } from './components/GridView';
import type { Market, View, PollingSpeed } from './types';
import './App.css';

function App() {
  const [theme, setTheme] = useLocalStorage('xtox-theme', 'dark');
  const [market, setMarket] = useLocalStorage<Market>('xtox-market', 'nasdaq');
  const [view, setView] = useLocalStorage<View>('xtox-view', 'summary');
  const [pollingSpeed, setPollingSpeed] = useLocalStorage<PollingSpeed>('xtox-speed', 5000);

  const { quotes, indices, loading, switching, error } = usePolling(market, pollingSpeed);

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
          <div className="state-msg"><div className="spinner" />Loading market data...</div>
        ) : quotes.length === 0 ? (
          <div className="state-msg">No data available</div>
        ) : (
          <>
            {view === 'summary' && <SummaryView quotes={quotes} indices={indices} market={market} />}
            {view === 'movers' && <TopMoversView quotes={quotes} />}
            {view === 'grid' && <GridView quotes={quotes} />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
