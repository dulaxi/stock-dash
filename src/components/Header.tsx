import type { PollingSpeed } from '../types';
import './Header.css';

interface HeaderProps {
  theme: string;
  onThemeToggle: () => void;
  pollingSpeed: PollingSpeed;
  onPollingSpeedChange: (speed: PollingSpeed) => void;
  marketStatus: string;
}

const SPEEDS: { value: PollingSpeed; label: string }[] = [
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
];

export function Header({ theme, onThemeToggle, pollingSpeed, onPollingSpeedChange, marketStatus }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-logo">XTOX</div>
      <div className="header-controls">
        <span className={`market-status ${marketStatus === 'open' ? 'open' : marketStatus === 'pre' ? 'pre' : 'closed'}`}>
          {marketStatus === 'open' ? 'Market Open' : marketStatus === 'pre' ? 'Pre-Market' : 'Market Closed'}
        </span>
        <span className="live-label">Live</span>
        <div className="speed-pills">
          {SPEEDS.map(s => (
            <button
              key={s.value}
              className={`speed-pill ${pollingSpeed === s.value ? 'active' : ''}`}
              onClick={() => onPollingSpeedChange(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button className="theme-toggle" onClick={onThemeToggle} aria-label="Toggle theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}
