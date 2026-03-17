import express from 'express';
import yahooFinance from 'yahoo-finance2';
import { MARKET_MAP, INDEX_SYMBOLS } from './symbols.js';
import { cacheGet, cacheSet } from './cache.js';
const app = express();
const PORT = 3001;

async function fetchQuotes(symbols) {
  const results = await Promise.allSettled(
    symbols.map(symbol =>
      yahooFinance.quote(symbol).then(q => ({
        symbol: q.symbol,
        price: q.regularMarketPrice,
        change: q.regularMarketChange,
        changePercent: q.regularMarketChangePercent,
      }))
    )
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
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
    cacheSet(cacheKey, data);
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

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
