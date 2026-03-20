import FilterDropdown from './FilterDropdown';

export interface ScreenerFilters {
  sectors: string[];
  marketCapMin: number | null;
  marketCapMax: number | null;
  peMin: number | null;
  peMax: number | null;
  changePercentMin: number | null;
  changePercentMax: number | null;
  volumeMin: number | null;
  near52wLow: boolean;
}

export const EMPTY_FILTERS: ScreenerFilters = {
  sectors: [],
  marketCapMin: null,
  marketCapMax: null,
  peMin: null,
  peMax: null,
  changePercentMin: null,
  changePercentMax: null,
  volumeMin: null,
  near52wLow: false,
};

interface ScreenerFiltersBarProps {
  filters: ScreenerFilters;
  onChange: (filters: ScreenerFilters) => void;
  availableSectors: string[];
}

function isFiltersActive(filters: ScreenerFilters): boolean {
  return (
    filters.sectors.length > 0 ||
    filters.marketCapMin !== null ||
    filters.marketCapMax !== null ||
    filters.peMin !== null ||
    filters.peMax !== null ||
    filters.changePercentMin !== null ||
    filters.changePercentMax !== null ||
    filters.volumeMin !== null ||
    filters.near52wLow
  );
}

function parseNum(value: string): number | null {
  if (value === '') return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

export default function ScreenerFiltersBar({ filters, onChange, availableSectors }: ScreenerFiltersBarProps) {
  const sectorActive = filters.sectors.length > 0;
  const marketCapActive = filters.marketCapMin !== null || filters.marketCapMax !== null;
  const peActive = filters.peMin !== null || filters.peMax !== null;
  const changeActive = filters.changePercentMin !== null || filters.changePercentMax !== null;
  const volumeActive = filters.volumeMin !== null;

  function toggleSector(sector: string) {
    const next = filters.sectors.includes(sector)
      ? filters.sectors.filter(s => s !== sector)
      : [...filters.sectors, sector];
    onChange({ ...filters, sectors: next });
  }

  function selectAllSectors() {
    onChange({ ...filters, sectors: [...availableSectors] });
  }

  function clearSectors() {
    onChange({ ...filters, sectors: [] });
  }

  function setMarketCap(min: number | null, max: number | null) {
    onChange({ ...filters, marketCapMin: min, marketCapMax: max });
  }

  function setPE(min: number | null, max: number | null) {
    onChange({ ...filters, peMin: min, peMax: max });
  }

  function setChange(min: number | null, max: number | null) {
    onChange({ ...filters, changePercentMin: min, changePercentMax: max });
  }

  function setVolume(min: number | null) {
    onChange({ ...filters, volumeMin: min });
  }

  return (
    <div className="screener-filters-bar">
      {/* Sector */}
      <FilterDropdown label="Sector" active={sectorActive}>
        <div className="filter-section">
          <div className="filter-preset-row">
            <button className="filter-preset-btn" onClick={selectAllSectors}>All</button>
            <button className="filter-preset-btn" onClick={clearSectors}>Clear</button>
          </div>
          <div className="filter-checkbox-list">
            {availableSectors.map(sector => (
              <label key={sector} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.sectors.includes(sector)}
                  onChange={() => toggleSector(sector)}
                />
                {sector}
              </label>
            ))}
          </div>
        </div>
      </FilterDropdown>

      {/* Market Cap */}
      <FilterDropdown label="Market Cap" active={marketCapActive}>
        <div className="filter-section">
          <div className="filter-preset-row">
            <button className="filter-preset-btn" onClick={() => setMarketCap(500e9, null)}>&gt; 500B</button>
            <button className="filter-preset-btn" onClick={() => setMarketCap(100e9, null)}>&gt; 100B</button>
            <button className="filter-preset-btn" onClick={() => setMarketCap(10e9, null)}>&gt; 10B</button>
            <button className="filter-preset-btn" onClick={() => setMarketCap(null, 10e9)}>&lt; 10B</button>
            <button className="filter-preset-btn" onClick={() => setMarketCap(null, 1e9)}>&lt; 1B</button>
          </div>
          <div className="filter-range-row">
            <label className="filter-range-label">
              Min
              <input
                type="number"
                className="filter-range-input"
                value={filters.marketCapMin ?? ''}
                onChange={e => onChange({ ...filters, marketCapMin: parseNum(e.target.value) })}
              />
            </label>
            <label className="filter-range-label">
              Max
              <input
                type="number"
                className="filter-range-input"
                value={filters.marketCapMax ?? ''}
                onChange={e => onChange({ ...filters, marketCapMax: parseNum(e.target.value) })}
              />
            </label>
          </div>
        </div>
      </FilterDropdown>

      {/* P/E */}
      <FilterDropdown label="P/E" active={peActive}>
        <div className="filter-section">
          <div className="filter-preset-row">
            <button className="filter-preset-btn" onClick={() => setPE(null, 15)}>&lt; 15 (Value)</button>
            <button className="filter-preset-btn" onClick={() => setPE(null, 25)}>&lt; 25 (Moderate)</button>
            <button className="filter-preset-btn" onClick={() => setPE(25, null)}>&gt; 25 (Growth)</button>
          </div>
          <div className="filter-range-row">
            <label className="filter-range-label">
              Min
              <input
                type="number"
                className="filter-range-input"
                value={filters.peMin ?? ''}
                onChange={e => onChange({ ...filters, peMin: parseNum(e.target.value) })}
              />
            </label>
            <label className="filter-range-label">
              Max
              <input
                type="number"
                className="filter-range-input"
                value={filters.peMax ?? ''}
                onChange={e => onChange({ ...filters, peMax: parseNum(e.target.value) })}
              />
            </label>
          </div>
        </div>
      </FilterDropdown>

      {/* Change % */}
      <FilterDropdown label="Change %" active={changeActive}>
        <div className="filter-section">
          <div className="filter-preset-row">
            <button className="filter-preset-btn" onClick={() => setChange(2, null)}>&gt; 2% (Up big)</button>
            <button className="filter-preset-btn" onClick={() => setChange(null, -2)}>&lt; -2% (Down big)</button>
          </div>
          <div className="filter-range-row">
            <label className="filter-range-label">
              Min
              <input
                type="number"
                className="filter-range-input"
                value={filters.changePercentMin ?? ''}
                onChange={e => onChange({ ...filters, changePercentMin: parseNum(e.target.value) })}
              />
            </label>
            <label className="filter-range-label">
              Max
              <input
                type="number"
                className="filter-range-input"
                value={filters.changePercentMax ?? ''}
                onChange={e => onChange({ ...filters, changePercentMax: parseNum(e.target.value) })}
              />
            </label>
          </div>
        </div>
      </FilterDropdown>

      {/* Volume */}
      <FilterDropdown label="Volume" active={volumeActive}>
        <div className="filter-section">
          <div className="filter-preset-row">
            <button className="filter-preset-btn" onClick={() => setVolume(10e6)}>&gt; 10M</button>
            <button className="filter-preset-btn" onClick={() => setVolume(1e6)}>&gt; 1M</button>
            <button className="filter-preset-btn" onClick={() => setVolume(100e3)}>&gt; 100K</button>
          </div>
        </div>
      </FilterDropdown>

      {/* Clear All */}
      {isFiltersActive(filters) && (
        <button className="filter-clear-all-btn" onClick={() => onChange({ ...EMPTY_FILTERS })}>
          Clear All
        </button>
      )}
    </div>
  );
}
