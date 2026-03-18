import express from 'express';
import YahooFinance from 'yahoo-finance2';
import { MARKET_MAP, INDEX_SYMBOLS } from './symbols.js';
import { cacheGet, cacheSet } from './cache.js';

const yahooFinance = new YahooFinance();
const app = express();
const PORT = 3001;

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
    fetchQuotes(symbols).then(data => cacheSet(cacheKey, data)).catch(() => {});
    return;
  }

  try {
    const data = await fetchQuotes(symbols);
    cacheSet(cacheKey, data, 10000); // 10s cache
    res.json(data);
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

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
