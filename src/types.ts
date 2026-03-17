export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface IndexQuote extends Quote {
  name: string;
}

export type Market = 'nasdaq' | 'sp500' | 'dow';
export type View = 'summary' | 'movers' | 'grid';
export type PollingSpeed = 5000 | 10000 | 30000;
