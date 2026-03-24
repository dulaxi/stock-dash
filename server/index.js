import 'dotenv/config';
import express from 'express';
import YahooFinance from 'yahoo-finance2';
import { MARKET_MAP, INDEX_SYMBOLS, ALL_SYMBOLS } from './symbols.js';
import { SECTOR_MAP } from './sectors.js';
import { cacheGet, cacheSet } from './cache.js';

const yahooFinance = new YahooFinance();
const app = express();
const PORT = 3001;

// Finnhub API for universal search + supplementary data
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || '';
async function finnhubFetch(path) {
  const url = `https://finnhub.io/api/v1${path}${path.includes('?') ? '&' : '?'}token=${FINNHUB_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub ${res.status}`);
  return res.json();
}

function mapQuote(q) {
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchQuotes(symbols) {
  const all = [];
  const BATCH = 10;
  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = symbols.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(s => yahooFinance.quote(s).then(mapQuote))
    );
    all.push(...results.filter(r => r.status === 'fulfilled').map(r => r.value));
    if (i + BATCH < symbols.length) await sleep(300);
  }
  return all;
}

// GET /api/quotes/all — all tracked symbols with sector data
// IMPORTANT: must be registered BEFORE /api/quotes/:market
app.get('/api/quotes/all', async (req, res) => {
  const key = 'quotes-all';
  const cached = cacheGet(key);
  if (cached && !cached.stale) return res.json(cached.data);
  if (cached) {
    res.json(cached.data);
    fetchQuotes(ALL_SYMBOLS).then(data => {
      const withSector = data.map(q => ({ ...q, sector: SECTOR_MAP[q.symbol] || null }));
      cacheSet(key, withSector, 10000);
    }).catch(() => {});
    return;
  }
  try {
    const data = await fetchQuotes(ALL_SYMBOLS);
    const withSector = data.map(q => ({ ...q, sector: SECTOR_MAP[q.symbol] || null }));
    cacheSet(key, withSector, 10000);
    res.json(withSector);
  } catch (e) {
    console.error('Error fetching all quotes:', e);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// GET /api/quotes/:market (nasdaq | sp500 | dow)
app.get('/api/quotes/:market', async (req, res) => {
  const market = req.params.market;
  const symbols = MARKET_MAP[market];
  if (!symbols) return res.status(400).json({ error: 'Invalid market' });

  const cacheKey = `quotes-${market}`;
  const cached = cacheGet(cacheKey);
  if (cached && !cached.stale) return res.json(cached.data);
  if (cached?.stale) {
    res.json(cached.data);
    fetchQuotes(symbols).then(data => {
      const withSector = data.map(q => ({ ...q, sector: SECTOR_MAP[q.symbol] || null }));
      cacheSet(cacheKey, withSector, 10000);
    }).catch(() => {});
    return;
  }

  try {
    const data = await fetchQuotes(symbols);
    const withSector = data.map(q => ({ ...q, sector: SECTOR_MAP[q.symbol] || null }));
    cacheSet(cacheKey, withSector, 10000); // 10s cache
    res.json(withSector);
  } catch (error) {
    console.error(`Error fetching ${market}:`, error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// GET /api/indices
app.get('/api/indices', async (_req, res) => {
  const cached = cacheGet('indices');
  if (cached && !cached.stale) return res.json(cached.data);
  if (cached?.stale) {
    res.json(cached.data);
    fetchQuotes(INDEX_SYMBOLS).then(data => {
      const named = data.map(q => ({
        ...q,
        name: q.symbol === '^IXIC' ? 'NASDAQ' : q.symbol === '^GSPC' ? 'S&P 500' : 'DOW 30',
      }));
      cacheSet('indices', named);
    }).catch(() => {});
    return;
  }

  try {
    const data = await fetchQuotes(INDEX_SYMBOLS);
    const named = data.map(q => ({
      ...q,
      name: q.symbol === '^IXIC' ? 'NASDAQ' : q.symbol === '^GSPC' ? 'S&P 500' : 'DOW 30',
    }));
    cacheSet('indices', named);
    res.json(named);
  } catch (error) {
    console.error('Error fetching indices:', error);
    res.status(500).json({ error: 'Failed to fetch indices' });
  }
});

// GET /api/quote/:symbol — single quote with sector
app.get('/api/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const key = `quote-${symbol.toUpperCase()}`;
  const cached = cacheGet(key);
  if (cached && !cached.stale) return res.json(cached.data);
  try {
    const raw = await yahooFinance.quote(symbol.toUpperCase());
    const data = { ...mapQuote(raw), sector: SECTOR_MAP[symbol.toUpperCase()] || null };
    cacheSet(key, data, 10000);
    res.json(data);
  } catch (e) {
    if (cached) return res.json(cached.data);
    res.status(404).json({ error: 'Symbol not found' });
  }
});

// GET /api/sectors?market= — sector performance computed from cached quotes
app.get('/api/sectors', async (req, res) => {
  const market = req.query.market || 'all';
  const key = `sectors-${market}`;
  const cached = cacheGet(key);
  if (cached && !cached.stale) return res.json(cached.data);

  // Get quotes for the requested market
  const quotesKey = market === 'all' ? 'quotes-all' : `quotes-${market}`;
  const quotesCache = cacheGet(quotesKey);
  if (!quotesCache) return res.json([]);

  const quotes = quotesCache.data;
  const sectorMap = {};
  for (const q of quotes) {
    const sector = SECTOR_MAP[q.symbol];
    if (!sector) continue;
    if (!sectorMap[sector]) sectorMap[sector] = { total: 0, count: 0 };
    sectorMap[sector].total += q.changePercent || 0;
    sectorMap[sector].count += 1;
  }

  const sectors = Object.entries(sectorMap)
    .map(([sector, { total, count }]) => ({
      sector,
      changePercent: +(total / count).toFixed(2),
      stockCount: count,
    }))
    .sort((a, b) => b.stockCount - a.stockCount);

  cacheSet(key, sectors, 30000);
  res.json(sectors);
});

// GET /api/search?q= — universal stock search via Finnhub
app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json([]);

  // First check local symbols for instant matches
  const localMatches = ALL_SYMBOLS
    .filter(s => s.toLowerCase().startsWith(q.toLowerCase()))
    .slice(0, 5);

  if (!FINNHUB_KEY) {
    // No Finnhub key — return local matches only
    return res.json(localMatches.map(s => ({ symbol: s, description: s, type: 'local' })));
  }

  const cacheKey = `search-${q.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached && !cached.stale) return res.json(cached.data);

  try {
    const data = await finnhubFetch(`/search?q=${encodeURIComponent(q)}`);
    const results = (data.result || [])
      .filter(r => r.type === 'Common Stock' && !r.symbol.includes('.'))
      .slice(0, 10)
      .map(r => ({
        symbol: r.symbol,
        description: r.description,
        type: r.type,
      }));
    cacheSet(cacheKey, results, 300000); // 5 min cache
    res.json(results);
  } catch (e) {
    // Fallback to local matches
    res.json(localMatches.map(s => ({ symbol: s, description: s, type: 'local' })));
  }
});

// GET /api/profile/:symbol — company profile via Finnhub
app.get('/api/profile/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const cacheKey = `profile-${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached && !cached.stale) return res.json(cached.data);

  if (!FINNHUB_KEY) return res.json({});

  try {
    const data = await finnhubFetch(`/stock/profile2?symbol=${symbol}`);
    const profile = {
      name: data.name,
      logo: data.logo,
      industry: data.finnhubIndustry,
      country: data.country,
      exchange: data.exchange,
      ipo: data.ipo,
      weburl: data.weburl,
      marketCap: data.marketCapitalization ? data.marketCapitalization * 1e6 : null, // Finnhub returns in millions
      shareOutstanding: data.shareOutstanding ? data.shareOutstanding * 1e6 : null,
    };
    cacheSet(cacheKey, profile, 86400000); // 24hr cache — profiles rarely change
    res.json(profile);
  } catch (e) {
    if (cached) return res.json(cached.data);
    res.json({});
  }
});

// GET /api/chart/:symbol (intraday)
app.get('/api/chart/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  const cacheKey = `chart-${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached && !cached.stale) return res.json(cached.data);

  try {
    const now = new Date();
    const open = new Date(now);
    open.setHours(0, 0, 0, 0);
    const result = await yahooFinance.chart(symbol, { period1: open, period2: now, interval: '5m' });
    const points = (result.quotes || [])
      .filter(q => q.close != null)
      .map(q => ({ time: q.date, close: q.close }));
    cacheSet(cacheKey, points, 30000); // 30s cache
    res.json(points);
  } catch (error) {
    console.error(`Error fetching chart for ${symbol}:`, error);
    if (cached?.stale) return res.json(cached.data);
    res.status(500).json({ error: 'Failed to fetch chart' });
  }
});

// GET /api/detail/:symbol — full stock detail
app.get('/api/detail/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  const cacheKey = `detail-${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached && !cached.stale) return res.json(cached.data);

  try {
    const [quote, summary] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.quoteSummary(symbol, {
        modules: [
          'defaultKeyStatistics', 'financialData', 'summaryDetail', 'summaryProfile',
          'earningsHistory', 'recommendationTrend', 'upgradeDowngradeHistory',
          'insiderTransactions', 'institutionOwnership', 'majorHoldersBreakdown'
        ]
      }).catch(() => ({})),
    ]);

    const ks = summary.defaultKeyStatistics || {};
    const fd = summary.financialData || {};
    const sd = summary.summaryDetail || {};
    const sp = summary.summaryProfile || {};
    const rt = summary.recommendationTrend?.trend?.[0] || {};
    const udh = summary.upgradeDowngradeHistory?.history || [];
    const it = summary.insiderTransactions?.transactions || [];
    const io = summary.institutionOwnership?.ownershipList || [];
    const mh = summary.majorHoldersBreakdown || {};
    const eh = summary.earningsHistory?.history || [];

    const data = {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName || symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      prevClose: quote.regularMarketPreviousClose,
      open: quote.regularMarketOpen,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      avgVolume: quote.averageDailyVolume3Month,
      marketCap: quote.marketCap,
      // Key stats
      trailingPE: sd.trailingPE,
      forwardPE: sd.forwardPE ?? ks.forwardPE,
      peg: ks.pegRatio,
      priceToBook: ks.priceToBook,
      priceToSales: sd.priceToSalesTrailing12Months,
      enterpriseValue: ks.enterpriseValue,
      evToEbitda: ks.enterpriseToEbitda,
      evToRevenue: ks.enterpriseToRevenue,
      // Earnings
      epsTrailing: ks.trailingEps,
      epsForward: ks.forwardEps,
      // Profitability
      profitMargin: fd.profitMargins,
      operatingMargin: fd.operatingMargins,
      grossMargin: fd.grossMargins,
      returnOnEquity: fd.returnOnEquity,
      returnOnAssets: fd.returnOnAssets,
      // Balance sheet
      debtToEquity: fd.debtToEquity,
      currentRatio: fd.currentRatio,
      quickRatio: fd.quickRatio,
      bookValue: ks.bookValue,
      // Dividend
      dividendRate: sd.dividendRate,
      dividendYield: sd.dividendYield,
      exDividendDate: sd.exDividendDate,
      payoutRatio: sd.payoutRatio,
      // Performance
      fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh ?? quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: sd.fiftyTwoWeekLow ?? quote.fiftyTwoWeekLow,
      fiftyDayAvg: sd.fiftyDayAverage,
      twoHundredDayAvg: sd.twoHundredDayAverage,
      beta: sd.beta ?? ks.beta,
      // Shares
      sharesOutstanding: ks.sharesOutstanding,
      floatShares: ks.floatShares,
      shortRatio: ks.shortRatio,
      shortPercentOfFloat: ks.shortPercentOfFloat,
      // Company
      industry: sp.industry,
      sector: sp.sector,
      employees: sp.fullTimeEmployees,
      website: sp.website,
      description: sp.longBusinessSummary,
      city: sp.city,
      state: sp.state,
      country: sp.country,
      ceo: sp.companyOfficers?.[0]?.name,
      // Recommendation
      recommendation: rt.buy != null ? ((rt.strongBuy + rt.buy * 0.75 + rt.hold * 0.5 + rt.sell * 0.25) / (rt.strongBuy + rt.buy + rt.hold + rt.sell + rt.strongSell)).toFixed(2) : null,
      targetPrice: fd.targetMeanPrice,
      targetHigh: fd.targetHighPrice,
      targetLow: fd.targetLowPrice,
      numberOfAnalysts: fd.numberOfAnalystOpinions,
      recommendationKey: fd.recommendationKey,
      // Insider transactions
      insiderTransactions: it.slice(0, 10).map(t => ({
        name: t.filerName,
        relation: t.filerRelation,
        date: t.startDate,
        type: t.moneyText || (t.shares > 0 ? 'Buy' : 'Sale'),
        shares: t.shares,
        value: t.value,
      })),
      // Institutional holders
      institutionHolders: io.slice(0, 10).map(h => ({
        name: h.organization,
        shares: h.position,
        value: h.value,
        pctHeld: h.pctHeld,
        change: h.pctChange,
      })),
      // Ownership breakdown
      insidersPercentHeld: mh.insidersPercentHeld,
      institutionsPercentHeld: mh.institutionsPercentHeld,
      // Upgrade/downgrade history
      analystActions: udh.slice(0, 10).map(a => ({
        firm: a.firm,
        toGrade: a.toGrade,
        fromGrade: a.fromGrade,
        action: a.action,
        date: a.epochGradeDate,
      })),
      // Earnings history
      earningsHistory: eh.map(e => ({
        date: e.quarter,
        epsEstimate: e.epsEstimate,
        epsActual: e.epsActual,
        surprise: e.surprisePercent,
      })),
    };

    cacheSet(cacheKey, data, 15000);
    res.json(data);
  } catch (error) {
    console.error(`Error fetching detail for ${symbol}:`, error);
    if (cached?.stale) return res.json(cached.data);
    res.status(500).json({ error: 'Failed to fetch detail' });
  }
});

// GET /api/history/:symbol?range=1d|5d|1mo|3mo|1y|5y
app.get('/api/history/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  const range = req.query.range || '1d';
  const cacheKey = `history-${symbol}-${range}`;
  const cached = cacheGet(cacheKey);
  if (cached && !cached.stale) return res.json(cached.data);

  const ytdStart = new Date(new Date().getFullYear(), 0, 1);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const rangeMap = {
    '1d': { period1: todayStart, interval: '5m' },
    '5d': { period1: daysAgo(5), interval: '15m' },
    '1mo': { period1: daysAgo(30), interval: '1h' },
    '3mo': { period1: daysAgo(90), interval: '1d' },
    'ytd': { period1: ytdStart, interval: '1d' },
    '1y': { period1: daysAgo(365), interval: '1d' },
    '5y': { period1: daysAgo(1825), interval: '1wk' },
    'all': { period1: new Date('1970-01-01'), interval: '1mo' },
  };

  const config = rangeMap[range] || rangeMap['1d'];

  try {
    const result = await yahooFinance.chart(symbol, {
      period1: config.period1,
      period2: new Date(),
      interval: config.interval,
    });
    const points = (result.quotes || [])
      .filter(q => q.close != null)
      .map(q => ({ time: q.date, close: q.close, volume: q.volume }));
    const ttl = range === '1d' ? 30000 : 60000;
    cacheSet(cacheKey, points, ttl);
    res.json(points);
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error);
    if (cached?.stale) return res.json(cached.data);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// GET /api/news
const NEWS_TICKERS = { nasdaq: ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'META'], sp500: ['SPY', 'AAPL', 'JPM', 'GOOGL', 'AMZN'], dow: ['DIA', 'BA', 'GS', 'UNH', 'MSFT'] };
app.get('/api/news/:market', async (req, res) => {
  const market = req.params.market;
  const tickers = NEWS_TICKERS[market];
  if (!tickers) return res.status(400).json({ error: 'Invalid market' });

  const cacheKey = `news-${market}`;
  const cached = cacheGet(cacheKey);
  if (cached && !cached.stale) return res.json(cached.data);

  try {
    const results = await Promise.allSettled(
      tickers.map(t => yahooFinance.search(t, { newsCount: 5, quotesCount: 0 }))
    );
    const seen = new Set();
    const news = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value.news || [])
      .filter(n => {
        if (!n.thumbnail?.resolutions?.[0]?.url) return false;
        if (seen.has(n.title)) return false;
        seen.add(n.title);
        return true;
      })
      .sort((a, b) => new Date(b.providerPublishTime).getTime() - new Date(a.providerPublishTime).getTime())
      .slice(0, 15)
      .map(n => ({
        title: n.title,
        publisher: n.publisher,
        link: n.link,
        providerPublishTime: n.providerPublishTime,
        thumbnail: n.thumbnail.resolutions[0].url,
      }));
    cacheSet(cacheKey, news, 60000);
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    if (cached?.stale) return res.json(cached.data);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// GET /api/ticker-news/:symbol — news for a specific ticker
app.get('/api/ticker-news/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  const cacheKey = `ticker-news-${symbol}`;
  const cached = cacheGet(cacheKey);
  if (cached && !cached.stale) return res.json(cached.data);

  try {
    const result = await yahooFinance.search(symbol, { newsCount: 15, quotesCount: 0 });
    const news = (result.news || [])
      .filter(n => n.thumbnail?.resolutions?.[0]?.url)
      .map(n => ({
        title: n.title,
        publisher: n.publisher,
        link: n.link,
        providerPublishTime: n.providerPublishTime,
        thumbnail: n.thumbnail.resolutions[0].url,
      }));
    cacheSet(cacheKey, news, 60000);
    res.json(news);
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    if (cached?.stale) return res.json(cached.data);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
