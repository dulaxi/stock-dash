export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  open?: number;
  dayHigh?: number;
  dayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  trailingPE?: number;
}

export interface IndexQuote extends Quote {
  name: string;
}

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: string;
  thumbnail: string | null;
}

export type Market = 'nasdaq' | 'sp500' | 'dow';
export type View = 'summary' | 'movers' | 'grid';
export type PollingSpeed = 5000 | 10000 | 30000;
