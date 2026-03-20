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
  shortName?: string;
  sector?: string;
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

export interface SectorPerformance {
  sector: string;
  changePercent: number;
  stockCount: number;
}

export type Market = 'nasdaq' | 'sp500' | 'dow' | 'all';
export type View = 'dashboard' | 'heatmap' | 'movers' | 'screener' | 'watchlist' | 'news';
export type PollingSpeed = 5000 | 10000 | 30000;
