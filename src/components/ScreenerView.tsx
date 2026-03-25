import { useState, useMemo } from 'react';
import type { Quote } from '../types';
import type { ScreenerFilters } from './ScreenerFilters';
import ScreenerFiltersBar, { EMPTY_FILTERS } from './ScreenerFilters';
import { useLogos } from '../hooks/useLogos';
import { SortAscending, SortDescending } from '@phosphor-icons/react';
import { FlashCell } from './FlashCell';
import MetricTooltip from './MetricTooltip';
import './ScreenerView.css';

interface ScreenerViewProps {
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
  onNavigate: (view: string) => void;
}

type SortKey = keyof Quote;
type SortDir = 'asc' | 'desc';

const PRESETS: Record<string, ScreenerFilters> = {
  all: { ...EMPTY_FILTERS },
  value: { ...EMPTY_FILTERS, peMin: 1, peMax: 15, marketCapMin: 10e9 },
  momentum: { ...EMPTY_FILTERS, changePercentMin: 2, volumeMin: 1e6 },
  megacap: { ...EMPTY_FILTERS, marketCapMin: 500e9 },
  smallcap: { ...EMPTY_FILTERS, marketCapMax: 10e9 },
  near52wlow: { ...EMPTY_FILTERS, near52wLow: true },
};

const PRESET_LABELS: Record<string, string> = {
  all: 'All',
  value: 'Value',
  momentum: 'Momentum',
  megacap: 'Mega Cap',
  smallcap: 'Small Cap',
  near52wlow: 'Near 52W Low',
};

function fmt(n?: number): string {
  if (n == null) return '—';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  return n.toLocaleString();
}

function applyFilters(quotes: Quote[], filters: ScreenerFilters): Quote[] {
  return quotes.filter(q => {
    if (filters.sectors.length > 0 && (!q.sector || !filters.sectors.includes(q.sector))) return false;
    if (filters.marketCapMin != null && (q.marketCap == null || q.marketCap < filters.marketCapMin)) return false;
    if (filters.marketCapMax != null && (q.marketCap == null || q.marketCap > filters.marketCapMax)) return false;
    if (filters.peMin != null && (q.trailingPE == null || q.trailingPE < filters.peMin)) return false;
    if (filters.peMax != null && (q.trailingPE == null || q.trailingPE > filters.peMax)) return false;
    if (filters.changePercentMin != null && q.changePercent < filters.changePercentMin) return false;
    if (filters.changePercentMax != null && q.changePercent > filters.changePercentMax) return false;
    if (filters.volumeMin != null && (q.volume == null || q.volume < filters.volumeMin)) return false;
    if (filters.near52wLow && q.fiftyTwoWeekLow != null && q.price > q.fiftyTwoWeekLow * 1.1) return false;
    return true;
  });
}

function filtersMatchPreset(filters: ScreenerFilters, preset: ScreenerFilters): boolean {
  return (
    JSON.stringify(filters.sectors) === JSON.stringify(preset.sectors) &&
    filters.marketCapMin === preset.marketCapMin &&
    filters.marketCapMax === preset.marketCapMax &&
    filters.peMin === preset.peMin &&
    filters.peMax === preset.peMax &&
    filters.changePercentMin === preset.changePercentMin &&
    filters.changePercentMax === preset.changePercentMax &&
    filters.volumeMin === preset.volumeMin &&
    filters.near52wLow === preset.near52wLow
  );
}

export default function ScreenerView({ quotes, onSelectStock, onNavigate }: ScreenerViewProps) {
  const [filters, setFilters] = useState<ScreenerFilters>({ ...EMPTY_FILTERS });
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const logoSymbols = useMemo(() => quotes.map(q => q.symbol), [quotes]);
  const logos = useLogos(logoSymbols);

  const availableSectors = useMemo(() => {
    const sectors = new Set<string>();
    quotes.forEach(q => { if (q.sector) sectors.add(q.sector); });
    return Array.from(sectors).sort();
  }, [quotes]);

  const filtered = useMemo(() => applyFilters(quotes, filters), [quotes, filters]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const arrow = (key: SortKey) =>
    sortKey === key
      ? sortDir === 'asc'
        ? <SortAscending size={12} weight="bold" style={{ marginLeft: 2, verticalAlign: 'middle' }} />
        : <SortDescending size={12} weight="bold" style={{ marginLeft: 2, verticalAlign: 'middle' }} />
      : null;

  const activePreset = Object.keys(PRESETS).find(k => filtersMatchPreset(filters, PRESETS[k])) ?? null;

  return (
    <div className="screener-view">
      <div className="screener-controls">
        <div className="pill-group">
          <button className="pill" onClick={() => onNavigate('heatmap')}>Heatmap</button>
          <button className="pill active">Screener</button>
        </div>
        <div className="pill-group">
          {Object.keys(PRESETS).map(key => (
            <button
              key={key}
              className={`pill${activePreset === key ? ' active' : ''}`}
              onClick={() => setFilters({ ...PRESETS[key] })}
            >
              {PRESET_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <ScreenerFiltersBar
        filters={filters}
        onChange={setFilters}
        availableSectors={availableSectors}
      />

      <div className="screener-result-count">
        {filtered.length} of {quotes.length} stocks
      </div>

      <div className="screener-table-wrap">
        <table className="screener-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('symbol')}>Symbol{arrow('symbol')}</th>
              <th className="num" onClick={() => handleSort('price')}><MetricTooltip metricKey="price">Price</MetricTooltip>{arrow('price')}</th>
              <th className="num" onClick={() => handleSort('change')}><MetricTooltip metricKey="change">Change</MetricTooltip>{arrow('change')}</th>
              <th className="num" onClick={() => handleSort('changePercent')}><MetricTooltip metricKey="changePercent">Change%</MetricTooltip>{arrow('changePercent')}</th>
              <th className="num" onClick={() => handleSort('volume')}><MetricTooltip metricKey="volume">Volume</MetricTooltip>{arrow('volume')}</th>
              <th className="num" onClick={() => handleSort('marketCap')}><MetricTooltip metricKey="marketCap">Mkt Cap</MetricTooltip>{arrow('marketCap')}</th>
              <th className="num" onClick={() => handleSort('trailingPE')}><MetricTooltip metricKey="pe">P/E</MetricTooltip>{arrow('trailingPE')}</th>
              <th onClick={() => handleSort('sector')}><MetricTooltip metricKey="sector">Sector</MetricTooltip>{arrow('sector')}</th>
              <th className="num col-52w" onClick={() => handleSort('fiftyTwoWeekHigh')}><MetricTooltip metricKey="fiftyTwoWeekHigh">52W High</MetricTooltip>{arrow('fiftyTwoWeekHigh')}</th>
              <th className="num col-52w" onClick={() => handleSort('fiftyTwoWeekLow')}><MetricTooltip metricKey="fiftyTwoWeekLow">52W Low</MetricTooltip>{arrow('fiftyTwoWeekLow')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(q => (
              <tr key={q.symbol} className="clickable-row" onClick={() => onSelectStock(q.symbol)}>
                <td className="symbol">
                  {logos[q.symbol] && (
                    <img
                      className="ticker-logo"
                      src={logos[q.symbol]}
                      alt=""
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  {q.symbol}
                </td>
                <FlashCell value={q.price} className="num">${q.price?.toFixed(2)}</FlashCell>
                <td className={`num ${q.change > 0 ? 'up' : q.change < 0 ? 'down' : ''}`}>
                  {q.change > 0 ? '+' : ''}{q.change?.toFixed(2)}
                </td>
                <td className={`num ${q.changePercent > 0 ? 'up' : q.changePercent < 0 ? 'down' : ''}`}>
                  {q.changePercent > 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                </td>
                <td className="num">{fmt(q.volume)}</td>
                <td className="num">{fmt(q.marketCap)}</td>
                <td className="num">{q.trailingPE?.toFixed(1) ?? '—'}</td>
                <td>{q.sector ?? '—'}</td>
                <td className="num col-52w">${q.fiftyTwoWeekHigh?.toFixed(2) ?? '—'}</td>
                <td className="num col-52w">${q.fiftyTwoWeekLow?.toFixed(2) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
