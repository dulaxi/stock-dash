import type { PollingSpeed } from '../types';
import './Header.css';

interface HeaderProps {
  theme: string;
  onThemeToggle: () => void;
  pollingSpeed: PollingSpeed;
  onPollingSpeedChange: (speed: PollingSpeed) => void;
}

const SPEEDS: { value: PollingSpeed; label: string }[] = [
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
];

export function Header({ theme, onThemeToggle, pollingSpeed, onPollingSpeedChange }: HeaderProps) {
  const speedLabel = SPEEDS.find(s => s.value === pollingSpeed)?.label ?? '5s';

  return (
    <header className="header">
      <div className="header-logo">XTOX</div>
      <div className="header-controls">
        <span className="live-label">Live · {speedLabel}</span>
        <select
          className="speed-select"
          value={pollingSpeed}
          onChange={e => onPollingSpeedChange(Number(e.target.value) as PollingSpeed)}
        >
          {SPEEDS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button className="theme-toggle" onClick={onThemeToggle} aria-label="Toggle theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}
