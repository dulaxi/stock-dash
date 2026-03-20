export const NASDAQ_100 = [
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

export const SP_500 = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'META', 'TSLA', 'BRK-B', 'AVGO', 'JPM',
  'LLY', 'UNH', 'V', 'XOM', 'MA', 'COST', 'HD', 'PG', 'JNJ', 'NFLX',
  'ABBV', 'BAC', 'CRM', 'CVX', 'KO', 'MRK', 'WMT', 'AMD', 'PEP', 'CSCO',
  'TMO', 'ACN', 'LIN', 'MCD', 'ADBE', 'ABT', 'WFC', 'DHR', 'PM', 'TXN',
  'NEE', 'ISRG', 'QCOM', 'INTU', 'CMCSA', 'AMGN', 'AMAT', 'GE', 'RTX', 'VZ',
  'PFE', 'BKNG', 'HON', 'T', 'LOW', 'UNP', 'SPGI', 'CAT', 'COP', 'BA',
  'IBM', 'GS', 'BLK', 'DE', 'ADP', 'NOW', 'MS', 'GILD', 'AXP', 'SBUX',
  'MDT', 'VRTX', 'MDLZ', 'ADI', 'REGN', 'TJX', 'PANW', 'LRCX', 'SYK', 'BMY',
  'SCHW', 'CB', 'PGR', 'MMC', 'MU', 'KLAC', 'SNPS', 'CDNS', 'SO', 'DUK',
  'ZTS', 'CI', 'BDX', 'CME', 'EOG', 'FI', 'PYPL', 'SLB', 'ICE', 'MCO',
];

export const DOW_30 = [
  'AAPL', 'AMGN', 'AMZN', 'AXP', 'BA', 'CAT', 'CRM', 'CSCO', 'CVX', 'DIS',
  'DOW', 'GS', 'HD', 'HON', 'IBM', 'JNJ', 'JPM', 'KO', 'MCD', 'MMM',
  'MRK', 'MSFT', 'NKE', 'NVDA', 'PG', 'TRV', 'UNH', 'V', 'VZ', 'WMT',
];

export const INDEX_SYMBOLS = ['^IXIC', '^GSPC', '^DJI'];

export const ALL_SYMBOLS = [...new Set([...NASDAQ_100, ...SP_500, ...DOW_30])];

export const MARKET_MAP = {
  nasdaq: NASDAQ_100,
  sp500: SP_500,
  dow: DOW_30,
};
