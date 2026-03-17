import express from 'express';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

const app = express();
const PORT = 3001;

// NASDAQ-100 symbols
const SYMBOLS = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'META', 'GOOGL', 'GOOG', 'TSLA', 'AVGO', 'COST',
  'NFLX', 'TMUS', 'ASML', 'AMD', 'PEP', 'CSCO', 'ADBE', 'LIN', 'TXN', 'INTU',
  'QCOM', 'ISRG', 'AMGN', 'CMCSA', 'BKNG', 'AMAT', 'HON', 'VRTX', 'PANW', 'ADP',
  'GILD', 'SBUX', 'MU', 'ADI', 'MDLZ', 'LRCX', 'REGN', 'INTC', 'KLAC', 'PYPL',
  'SNPS', 'CDNS', 'CRWD', 'CTAS', 'MAR', 'MRVL', 'ORLY', 'ABNB', 'NXPI', 'DASH',
  'FTNT', 'WDAY', 'CSX', 'PCAR', 'CEG', 'CHTR', 'MNST', 'MELI', 'ROP', 'AEP',
  'ODFL', 'ADSK', 'PAYX', 'KDP', 'AZN', 'FAST', 'ROST', 'DXCM', 'KHC', 'VRSK',
  'CTSH', 'EXC', 'BKR', 'EA', 'LULU', 'XEL', 'GEHC', 'IDXX', 'CCEP', 'TTWO',
  'MCHP', 'CSGP', 'ON', 'ANSS', 'ZS', 'DDOG', 'CDW', 'BIIB', 'GFS', 'ILMN',
  'TTD', 'MDB', 'TEAM', 'WBD', 'ARM', 'SMCI', 'COIN', 'HOOD', 'PLTR', 'MSTR',
];

app.get('/api/quotes', async (_req, res) => {
  try {
    const results = await Promise.allSettled(
      SYMBOLS.map(symbol =>
        yahooFinance.quote(symbol).then(quote => ({
          symbol: quote.symbol,
          name: quote.shortName || quote.longName || symbol,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          volume: quote.regularMarketVolume,
          marketCap: quote.marketCap,
        }))
      )
    );

    const quotes = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    res.json(quotes);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
