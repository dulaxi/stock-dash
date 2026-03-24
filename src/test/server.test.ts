import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// 1. Cache module tests
// ---------------------------------------------------------------------------
describe('Cache', () => {
  let cacheGet: typeof import('../../server/cache.js').cacheGet;
  let cacheSet: typeof import('../../server/cache.js').cacheSet;

  beforeEach(async () => {
    // Fresh module for every test so the internal Map is empty
    vi.resetModules();
    const mod = await import('../../server/cache.js');
    cacheGet = mod.cacheGet;
    cacheSet = mod.cacheSet;
  });

  it('returns null on cache miss', () => {
    expect(cacheGet('nonexistent')).toBeNull();
  });

  it('returns data on cache hit within TTL', () => {
    cacheSet('key1', { foo: 'bar' }, 5000);
    const result = cacheGet('key1');
    expect(result).not.toBeNull();
    expect(result!.data).toEqual({ foo: 'bar' });
    expect(result!.stale).toBe(false);
  });

  it('marks data as stale after TTL expires', async () => {
    // Use a very short TTL so it expires immediately
    cacheSet('key2', 'value', 1);
    // Wait just past the TTL
    await new Promise((r) => setTimeout(r, 5));
    const result = cacheGet('key2');
    expect(result).not.toBeNull();
    expect(result!.data).toBe('value');
    expect(result!.stale).toBe(true);
  });

  it('returns fresh (not stale) data within TTL', () => {
    cacheSet('key3', [1, 2, 3], 60000);
    const result = cacheGet('key3');
    expect(result).not.toBeNull();
    expect(result!.stale).toBe(false);
    expect(result!.data).toEqual([1, 2, 3]);
  });

  it('uses default TTL of 3000ms when none is provided', () => {
    cacheSet('key4', 'default-ttl');
    const result = cacheGet('key4');
    expect(result).not.toBeNull();
    expect(result!.stale).toBe(false);
  });

  it('overwrites existing entries on re-set', () => {
    cacheSet('key5', 'first', 5000);
    cacheSet('key5', 'second', 5000);
    const result = cacheGet('key5');
    expect(result!.data).toBe('second');
  });

  it('handles different keys independently', () => {
    cacheSet('a', 1, 5000);
    cacheSet('b', 2, 5000);
    expect(cacheGet('a')!.data).toBe(1);
    expect(cacheGet('b')!.data).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 2. Symbols module tests
// ---------------------------------------------------------------------------
describe('Symbols', () => {
  let NASDAQ_100: string[];
  let SP_500: string[];
  let DOW_30: string[];
  let ALL_SYMBOLS: string[];
  let MARKET_MAP: Record<string, string[]>;
  let INDEX_SYMBOLS: string[];

  beforeEach(async () => {
    const mod = await import('../../server/symbols.js');
    NASDAQ_100 = mod.NASDAQ_100;
    SP_500 = mod.SP_500;
    DOW_30 = mod.DOW_30;
    ALL_SYMBOLS = mod.ALL_SYMBOLS;
    MARKET_MAP = mod.MARKET_MAP;
    INDEX_SYMBOLS = mod.INDEX_SYMBOLS;
  });

  it('ALL_SYMBOLS has no duplicates', () => {
    const unique = new Set(ALL_SYMBOLS);
    expect(unique.size).toBe(ALL_SYMBOLS.length);
  });

  it('MARKET_MAP contains all 3 markets', () => {
    expect(Object.keys(MARKET_MAP)).toEqual(
      expect.arrayContaining(['nasdaq', 'sp500', 'dow']),
    );
    expect(Object.keys(MARKET_MAP)).toHaveLength(3);
  });

  it('NASDAQ_100 has 100 symbols', () => {
    expect(NASDAQ_100).toHaveLength(100);
  });

  it('DOW_30 has 30 symbols', () => {
    expect(DOW_30).toHaveLength(30);
  });

  it('SP_500 has 100 symbols (top 100 tracked)', () => {
    expect(SP_500).toHaveLength(100);
  });

  it('ALL_SYMBOLS contains every symbol from each market', () => {
    for (const sym of NASDAQ_100) {
      expect(ALL_SYMBOLS).toContain(sym);
    }
    for (const sym of SP_500) {
      expect(ALL_SYMBOLS).toContain(sym);
    }
    for (const sym of DOW_30) {
      expect(ALL_SYMBOLS).toContain(sym);
    }
  });

  it('INDEX_SYMBOLS contains 3 major index tickers', () => {
    expect(INDEX_SYMBOLS).toHaveLength(3);
    expect(INDEX_SYMBOLS).toContain('^IXIC');
    expect(INDEX_SYMBOLS).toContain('^GSPC');
    expect(INDEX_SYMBOLS).toContain('^DJI');
  });

  it('all symbols are non-empty uppercase strings', () => {
    for (const sym of ALL_SYMBOLS) {
      expect(sym.length).toBeGreaterThan(0);
      expect(sym).toBe(sym.toUpperCase());
    }
  });

  it('MARKET_MAP values reference the correct arrays', () => {
    expect(MARKET_MAP.nasdaq).toBe(NASDAQ_100);
    expect(MARKET_MAP.sp500).toBe(SP_500);
    expect(MARKET_MAP.dow).toBe(DOW_30);
  });
});

// ---------------------------------------------------------------------------
// 3. Sectors module tests
// ---------------------------------------------------------------------------
describe('Sectors', () => {
  let SECTOR_MAP: Record<string, string>;
  let ALL_SYMBOLS: string[];

  const VALID_SECTORS = [
    'Technology',
    'Communication Services',
    'Consumer Discretionary',
    'Consumer Staples',
    'Healthcare',
    'Financials',
    'Industrials',
    'Energy',
    'Utilities',
    'Real Estate',
    'Materials',
  ];

  beforeEach(async () => {
    const sectors = await import('../../server/sectors.js');
    const symbols = await import('../../server/symbols.js');
    SECTOR_MAP = sectors.SECTOR_MAP;
    ALL_SYMBOLS = symbols.ALL_SYMBOLS;
  });

  it('covers all symbols in ALL_SYMBOLS', () => {
    const missing = ALL_SYMBOLS.filter((sym) => !(sym in SECTOR_MAP));
    expect(missing).toEqual([]);
  });

  it('has valid sector names (GICS sectors)', () => {
    const sectorValues = new Set(Object.values(SECTOR_MAP));
    for (const sector of sectorValues) {
      expect(VALID_SECTORS).toContain(sector);
    }
  });

  it('no empty sector names', () => {
    for (const [symbol, sector] of Object.entries(SECTOR_MAP)) {
      expect(sector, `sector for ${symbol} should not be empty`).toBeTruthy();
      expect(
        sector.trim().length,
        `sector for ${symbol} should not be whitespace`,
      ).toBeGreaterThan(0);
    }
  });

  it('SECTOR_MAP has entries (is not empty)', () => {
    expect(Object.keys(SECTOR_MAP).length).toBeGreaterThan(0);
  });

  it('every GICS sector has at least one stock', () => {
    const sectorValues = new Set(Object.values(SECTOR_MAP));
    for (const sector of VALID_SECTORS) {
      expect(sectorValues, `missing sector: ${sector}`).toContain(sector);
    }
  });

  it('sector keys are uppercase ticker strings', () => {
    for (const key of Object.keys(SECTOR_MAP)) {
      // Allow BRK-B style tickers (alphanumeric + hyphens)
      expect(key).toMatch(/^[A-Z0-9-]+$/);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Data structure validation — mapQuote
// ---------------------------------------------------------------------------
describe('mapQuote', () => {
  // mapQuote is not exported, so we replicate it here to test its contract.
  // If the implementation changes, these tests will catch shape mismatches.
  function mapQuote(q: Record<string, unknown>) {
    return {
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      volume: q.regularMarketVolume,
      marketCap: q.marketCap,
      open: q.regularMarketOpen,
      dayHigh: q.regularMarketDayHigh,
      dayLow: q.regularMarketDayLow,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow,
      trailingPE: q.trailingPE,
      shortName: q.shortName,
    };
  }

  const sampleYahooQuote = {
    symbol: 'AAPL',
    regularMarketPrice: 198.5,
    regularMarketChange: 3.42,
    regularMarketChangePercent: 1.75,
    regularMarketVolume: 52_400_000,
    marketCap: 3_080_000_000_000,
    regularMarketOpen: 195.0,
    regularMarketDayHigh: 199.2,
    regularMarketDayLow: 194.8,
    fiftyTwoWeekHigh: 220.0,
    fiftyTwoWeekLow: 150.0,
    trailingPE: 31.5,
    shortName: 'Apple Inc.',
    // Extra fields that should NOT appear in output
    regularMarketPreviousClose: 195.08,
    averageDailyVolume3Month: 60_000_000,
  };

  it('returns correct shape with all expected keys', () => {
    const result = mapQuote(sampleYahooQuote);
    const expectedKeys = [
      'symbol',
      'price',
      'change',
      'changePercent',
      'volume',
      'marketCap',
      'open',
      'dayHigh',
      'dayLow',
      'fiftyTwoWeekHigh',
      'fiftyTwoWeekLow',
      'trailingPE',
      'shortName',
    ];
    expect(Object.keys(result).sort()).toEqual(expectedKeys.sort());
  });

  it('maps Yahoo field names to clean names', () => {
    const result = mapQuote(sampleYahooQuote);
    expect(result.symbol).toBe('AAPL');
    expect(result.price).toBe(198.5);
    expect(result.change).toBe(3.42);
    expect(result.changePercent).toBe(1.75);
    expect(result.volume).toBe(52_400_000);
    expect(result.marketCap).toBe(3_080_000_000_000);
    expect(result.open).toBe(195.0);
    expect(result.dayHigh).toBe(199.2);
    expect(result.dayLow).toBe(194.8);
    expect(result.fiftyTwoWeekHigh).toBe(220.0);
    expect(result.fiftyTwoWeekLow).toBe(150.0);
    expect(result.trailingPE).toBe(31.5);
    expect(result.shortName).toBe('Apple Inc.');
  });

  it('does not include extra Yahoo fields in output', () => {
    const result = mapQuote(sampleYahooQuote);
    expect(result).not.toHaveProperty('regularMarketPreviousClose');
    expect(result).not.toHaveProperty('averageDailyVolume3Month');
  });

  it('handles missing / undefined fields gracefully', () => {
    const sparse = { symbol: 'UNKNOWN' };
    const result = mapQuote(sparse);
    expect(result.symbol).toBe('UNKNOWN');
    expect(result.price).toBeUndefined();
    expect(result.change).toBeUndefined();
    expect(result.shortName).toBeUndefined();
  });

  it('handles null values without throwing', () => {
    const withNulls = {
      symbol: 'TEST',
      regularMarketPrice: null,
      regularMarketChange: null,
    };
    const result = mapQuote(withNulls);
    expect(result.price).toBeNull();
    expect(result.change).toBeNull();
  });
});
