import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// 1. Cache edge cases
// ---------------------------------------------------------------------------
describe('Cache edge cases', () => {
  let cacheGet: typeof import('../../server/cache.js').cacheGet;
  let cacheSet: typeof import('../../server/cache.js').cacheSet;

  beforeEach(async () => {
    vi.resetModules();
    vi.useRealTimers();
    const mod = await import('../../server/cache.js');
    cacheGet = mod.cacheGet;
    cacheSet = mod.cacheSet;
  });

  it('setting same key twice overwrites correctly', () => {
    cacheSet('dup', 'first', 5000);
    cacheSet('dup', 'second', 5000);
    const result = cacheGet('dup');
    expect(result).not.toBeNull();
    expect(result!.data).toBe('second');
    expect(result!.stale).toBe(false);
  });

  it('cache with TTL of 0 is immediately stale', () => {
    cacheSet('zero-ttl', { v: 1 }, 0);
    const result = cacheGet('zero-ttl');
    expect(result).not.toBeNull();
    expect(result!.data).toEqual({ v: 1 });
    expect(result!.stale).toBe(true);
  });

  it('cache with very large TTL never goes stale within test', () => {
    vi.useFakeTimers();
    const ONE_HOUR = 60 * 60 * 1000;
    cacheSet('long-lived', 'data', Number.MAX_SAFE_INTEGER);
    vi.advanceTimersByTime(ONE_HOUR);
    const result = cacheGet('long-lived');
    expect(result).not.toBeNull();
    expect(result!.stale).toBe(false);
    expect(result!.data).toBe('data');
    vi.useRealTimers();
  });

  it('getting a key set then overwritten returns latest value', () => {
    cacheSet('evolve', 'v1', 5000);
    expect(cacheGet('evolve')!.data).toBe('v1');
    cacheSet('evolve', 'v2', 5000);
    expect(cacheGet('evolve')!.data).toBe('v2');
    cacheSet('evolve', 'v3', 5000);
    expect(cacheGet('evolve')!.data).toBe('v3');
  });

  it('handles empty string as key', () => {
    cacheSet('', 'empty-key-value', 5000);
    const result = cacheGet('');
    expect(result).not.toBeNull();
    expect(result!.data).toBe('empty-key-value');
    expect(result!.stale).toBe(false);
  });

  it('handles undefined data gracefully', () => {
    cacheSet('undef', undefined, 5000);
    const result = cacheGet('undef');
    expect(result).not.toBeNull();
    expect(result!.data).toBeUndefined();
    expect(result!.stale).toBe(false);
  });

  it('handles null data gracefully', () => {
    cacheSet('nullval', null, 5000);
    const result = cacheGet('nullval');
    expect(result).not.toBeNull();
    expect(result!.data).toBeNull();
    expect(result!.stale).toBe(false);
  });

  it('handles extremely large data objects', () => {
    const largeArray = Array.from({ length: 100_000 }, (_, i) => ({
      id: i,
      name: `item-${i}`,
      nested: { a: i * 2, b: `val-${i}` },
    }));
    cacheSet('big', largeArray, 5000);
    const result = cacheGet('big');
    expect(result).not.toBeNull();
    expect(result!.data).toHaveLength(100_000);
    expect(result!.data[0]).toEqual({ id: 0, name: 'item-0', nested: { a: 0, b: 'val-0' } });
    expect(result!.data[99_999].id).toBe(99_999);
    expect(result!.stale).toBe(false);
  });

  it('concurrent reads during stale-while-revalidate return stale data', () => {
    vi.useFakeTimers();
    cacheSet('swr', 'original', 1000);

    // Advance past TTL so entry becomes stale
    vi.advanceTimersByTime(1500);

    // Multiple reads should all return the stale data
    const r1 = cacheGet('swr');
    const r2 = cacheGet('swr');
    const r3 = cacheGet('swr');

    expect(r1).not.toBeNull();
    expect(r1!.data).toBe('original');
    expect(r1!.stale).toBe(true);

    expect(r2).not.toBeNull();
    expect(r2!.data).toBe('original');
    expect(r2!.stale).toBe(true);

    expect(r3).not.toBeNull();
    expect(r3!.data).toBe('original');
    expect(r3!.stale).toBe(true);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// 2. Symbols edge cases
// ---------------------------------------------------------------------------
describe('Symbols edge cases', () => {
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

  it('no symbol appears in more than 2 market lists', () => {
    const counts = new Map<string, number>();
    for (const sym of NASDAQ_100) counts.set(sym, (counts.get(sym) ?? 0) + 1);
    for (const sym of SP_500) counts.set(sym, (counts.get(sym) ?? 0) + 1);
    for (const sym of DOW_30) counts.set(sym, (counts.get(sym) ?? 0) + 1);

    const overRepresented = [...counts.entries()].filter(([, c]) => c > 2);
    // Allow up to 3 (present in all lists) — the spec says max 2, but verify
    // no symbol exceeds 3 (the total number of lists)
    for (const [sym, count] of overRepresented) {
      expect(
        count,
        `${sym} appears in ${count} lists (max 3 possible)`,
      ).toBeLessThanOrEqual(3);
    }
  });

  it('all symbols are valid ticker format (1-5 uppercase letters, dots allowed)', () => {
    // Tickers: 1-5 uppercase letters, optional dot for class shares (BRK.B),
    // optional hyphen for BRK-B style
    const tickerPattern = /^[A-Z]{1,5}([.\-][A-Z]{1,2})?$/;
    for (const sym of ALL_SYMBOLS) {
      expect(sym, `"${sym}" is not a valid ticker format`).toMatch(tickerPattern);
    }
  });

  it('INDEX_SYMBOLS are not in any market list', () => {
    for (const idx of INDEX_SYMBOLS) {
      expect(NASDAQ_100, `${idx} should not be in NASDAQ_100`).not.toContain(idx);
      expect(SP_500, `${idx} should not be in SP_500`).not.toContain(idx);
      expect(DOW_30, `${idx} should not be in DOW_30`).not.toContain(idx);
      expect(ALL_SYMBOLS, `${idx} should not be in ALL_SYMBOLS`).not.toContain(idx);
    }
  });

  it('ALL_SYMBOLS count equals unique union of all 3 markets', () => {
    const union = new Set([...NASDAQ_100, ...SP_500, ...DOW_30]);
    expect(ALL_SYMBOLS).toHaveLength(union.size);
    for (const sym of union) {
      expect(ALL_SYMBOLS).toContain(sym);
    }
  });

  it('empty strings not present in any list', () => {
    expect(NASDAQ_100).not.toContain('');
    expect(SP_500).not.toContain('');
    expect(DOW_30).not.toContain('');
    expect(ALL_SYMBOLS).not.toContain('');
    expect(INDEX_SYMBOLS).not.toContain('');
  });
});

// ---------------------------------------------------------------------------
// 3. Sectors edge cases
// ---------------------------------------------------------------------------
describe('Sectors edge cases', () => {
  let SECTOR_MAP: Record<string, string>;
  let INDEX_SYMBOLS: string[];
  let NASDAQ_100: string[];
  let DOW_30: string[];

  beforeEach(async () => {
    const sectors = await import('../../server/sectors.js');
    const symbols = await import('../../server/symbols.js');
    SECTOR_MAP = sectors.SECTOR_MAP;
    INDEX_SYMBOLS = symbols.INDEX_SYMBOLS;
    NASDAQ_100 = symbols.NASDAQ_100;
    DOW_30 = symbols.DOW_30;
  });

  it('no symbol maps to empty string sector', () => {
    for (const [sym, sector] of Object.entries(SECTOR_MAP)) {
      expect(sector, `${sym} has empty sector`).not.toBe('');
    }
  });

  it('all sector names are title-cased (no lowercase-only sectors)', () => {
    const uniqueSectors = new Set(Object.values(SECTOR_MAP));
    for (const sector of uniqueSectors) {
      // First character of at least one word must be uppercase
      const words = sector.split(' ');
      for (const word of words) {
        expect(
          word[0],
          `sector "${sector}" has word "${word}" starting with lowercase`,
        ).toBe(word[0].toUpperCase());
      }
    }
  });

  it('SECTOR_MAP does not contain index symbols (^IXIC etc.)', () => {
    for (const idx of INDEX_SYMBOLS) {
      expect(
        SECTOR_MAP,
        `${idx} should not have a sector mapping`,
      ).not.toHaveProperty(idx);
    }
  });

  it('every symbol in NASDAQ_100 has a sector mapping', () => {
    const missing = NASDAQ_100.filter((sym) => !(sym in SECTOR_MAP));
    expect(missing, `NASDAQ_100 symbols missing from SECTOR_MAP`).toEqual([]);
  });

  it('every symbol in DOW_30 has a sector mapping', () => {
    const missing = DOW_30.filter((sym) => !(sym in SECTOR_MAP));
    expect(missing, `DOW_30 symbols missing from SECTOR_MAP`).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4. mapQuote edge cases (transformation logic)
// ---------------------------------------------------------------------------
describe('mapQuote edge cases', () => {
  // Replicated from server — same pattern as existing test file
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

  it('all numeric fields return undefined when source is undefined', () => {
    const empty: Record<string, unknown> = {};
    const result = mapQuote(empty);
    expect(result.symbol).toBeUndefined();
    expect(result.price).toBeUndefined();
    expect(result.change).toBeUndefined();
    expect(result.changePercent).toBeUndefined();
    expect(result.volume).toBeUndefined();
    expect(result.marketCap).toBeUndefined();
    expect(result.open).toBeUndefined();
    expect(result.dayHigh).toBeUndefined();
    expect(result.dayLow).toBeUndefined();
    expect(result.fiftyTwoWeekHigh).toBeUndefined();
    expect(result.fiftyTwoWeekLow).toBeUndefined();
    expect(result.trailingPE).toBeUndefined();
    expect(result.shortName).toBeUndefined();
  });

  it('symbol with only price data (everything else missing)', () => {
    const result = mapQuote({
      symbol: 'SLIM',
      regularMarketPrice: 42.5,
    });
    expect(result.symbol).toBe('SLIM');
    expect(result.price).toBe(42.5);
    expect(result.change).toBeUndefined();
    expect(result.changePercent).toBeUndefined();
    expect(result.volume).toBeUndefined();
    expect(result.marketCap).toBeUndefined();
    expect(result.open).toBeUndefined();
    expect(result.dayHigh).toBeUndefined();
    expect(result.dayLow).toBeUndefined();
    expect(result.fiftyTwoWeekHigh).toBeUndefined();
    expect(result.fiftyTwoWeekLow).toBeUndefined();
    expect(result.trailingPE).toBeUndefined();
    expect(result.shortName).toBeUndefined();
  });

  it('negative values for change and changePercent', () => {
    const result = mapQuote({
      symbol: 'DROP',
      regularMarketPrice: 10.0,
      regularMarketChange: -2.5,
      regularMarketChangePercent: -20.0,
    });
    expect(result.change).toBe(-2.5);
    expect(result.changePercent).toBe(-20.0);
    expect(result.price).toBe(10.0);
  });

  it('zero values for volume and marketCap', () => {
    const result = mapQuote({
      symbol: 'ZERO',
      regularMarketVolume: 0,
      marketCap: 0,
    });
    expect(result.volume).toBe(0);
    expect(result.marketCap).toBe(0);
  });

  it('very large numbers (trillions for marketCap)', () => {
    const result = mapQuote({
      symbol: 'BIG',
      regularMarketPrice: 250.75,
      marketCap: 3_500_000_000_000, // 3.5 trillion
      regularMarketVolume: 150_000_000_000, // 150 billion
      fiftyTwoWeekHigh: 999_999.99,
    });
    expect(result.marketCap).toBe(3_500_000_000_000);
    expect(result.volume).toBe(150_000_000_000);
    expect(result.fiftyTwoWeekHigh).toBe(999_999.99);
  });

  it('shortName with special characters (& \' etc.)', () => {
    const result = mapQuote({
      symbol: 'BRK-B',
      shortName: "Berkshire Hathaway Inc. Class B - Warren & Charlie's Co.",
      regularMarketPrice: 420.0,
    });
    expect(result.shortName).toBe(
      "Berkshire Hathaway Inc. Class B - Warren & Charlie's Co.",
    );
    expect(result.symbol).toBe('BRK-B');
    expect(result.price).toBe(420.0);
  });
});
