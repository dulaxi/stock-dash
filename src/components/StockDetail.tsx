import { useState, useEffect } from 'react';
import type { NewsItem } from '../types';
import { StockChart } from './StockChart';
import { getLogoUrl } from '../tickerDomains';
import './StockDetail.css';

interface StockDetailProps {
  symbol: string;
  onBack: () => void;
}

interface Detail {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  prevClose?: number;
  open?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  avgVolume?: number;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  peg?: number;
  priceToBook?: number;
  priceToSales?: number;
  enterpriseValue?: number;
  evToEbitda?: number;
  evToRevenue?: number;
  epsTrailing?: number;
  epsForward?: number;
  profitMargin?: number;
  operatingMargin?: number;
  grossMargin?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  bookValue?: number;
  dividendRate?: number;
  dividendYield?: number;
  exDividendDate?: string;
  payoutRatio?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyDayAvg?: number;
  twoHundredDayAvg?: number;
  beta?: number;
  sharesOutstanding?: number;
  floatShares?: number;
  shortRatio?: number;
  shortPercentOfFloat?: number;
  industry?: string;
  sector?: string;
  employees?: number;
  website?: string;
  description?: string;
  recommendation?: string;
}

function fmt(n?: number, decimals = 2): string {
  if (n == null) return '—';
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  return n.toFixed(decimals);
}

function pct(n?: number): string {
  if (n == null) return '—';
  return (n * 100).toFixed(2) + '%';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function StockDetail({ symbol, onBack }: StockDetailProps) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/detail/${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(d => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [symbol]);

  useEffect(() => {
    fetch(`/api/news/${encodeURIComponent(symbol)}`)
      .catch(() => {});
    // Use search-based news for individual ticker
    import('yahoo-finance2').catch(() => {});
    fetch(`/api/news/nasdaq`) // fallback — reuse market news
      .then(r => r.json())
      .then(setNews)
      .catch(() => {});
  }, [symbol]);

  if (loading || !detail) {
    return (
      <div className="detail-page view-enter">
        <button className="detail-back" onClick={onBack}>← Back</button>
        <div className="detail-loading">
          <div className="skeleton" style={{ width: 200, height: 32, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: '100%', height: 260, borderRadius: 8, marginTop: 16 }} />
          <div className="skeleton" style={{ width: '100%', height: 300, borderRadius: 8, marginTop: 16 }} />
        </div>
      </div>
    );
  }

  // Finviz-style rows: each row has 3 label-value pairs (6 cells)
  const statsRows: [string, string][][] = [
    [['Market Cap', fmt(detail.marketCap)], ['P/E', fmt(detail.trailingPE)], ['EPS (ttm)', fmt(detail.epsTrailing)]],
    [['Enterprise Value', fmt(detail.enterpriseValue)], ['Forward P/E', fmt(detail.forwardPE)], ['EPS (fwd)', fmt(detail.epsForward)]],
    [['Revenue', fmt(detail.marketCap && detail.priceToSales ? detail.marketCap / detail.priceToSales : undefined)], ['PEG', fmt(detail.peg)], ['Gross Margin', pct(detail.grossMargin)]],
    [['Net Income', fmt(detail.epsTrailing && detail.sharesOutstanding ? detail.epsTrailing * detail.sharesOutstanding : undefined)], ['P/S', fmt(detail.priceToSales)], ['Oper. Margin', pct(detail.operatingMargin)]],
    [['Shares Out', fmt(detail.sharesOutstanding)], ['P/B', fmt(detail.priceToBook)], ['Profit Margin', pct(detail.profitMargin)]],
    [['Float', fmt(detail.floatShares)], ['EV/EBITDA', fmt(detail.evToEbitda)], ['ROE', pct(detail.returnOnEquity)]],
    [['Prev Close', '$' + fmt(detail.prevClose)], ['ROA', pct(detail.returnOnAssets)], ['Beta', fmt(detail.beta)]],
    [['Open', '$' + fmt(detail.open)], ['Debt/Eq', fmt(detail.debtToEquity)], ['Book/sh', '$' + fmt(detail.bookValue)]],
    [['Day High', '$' + fmt(detail.dayHigh)], ['Current Ratio', fmt(detail.currentRatio)], ['SMA 50', '$' + fmt(detail.fiftyDayAvg)]],
    [['Day Low', '$' + fmt(detail.dayLow)], ['Quick Ratio', fmt(detail.quickRatio)], ['SMA 200', '$' + fmt(detail.twoHundredDayAvg)]],
    [['52W High', '$' + fmt(detail.fiftyTwoWeekHigh)], ['Volume', fmt(detail.volume, 0)], ['Short Ratio', fmt(detail.shortRatio)]],
    [['52W Low', '$' + fmt(detail.fiftyTwoWeekLow)], ['Avg Volume', fmt(detail.avgVolume, 0)], ['Short % Float', pct(detail.shortPercentOfFloat)]],
    [['Dividend', detail.dividendRate ? `$${fmt(detail.dividendRate)} (${pct(detail.dividendYield)})` : '—'], ['Payout Ratio', pct(detail.payoutRatio)], ['Sector', detail.sector || '—']],
    [['Ex-Div Date', detail.exDividendDate ? new Date(detail.exDividendDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'], ['Industry', detail.industry || '—'], ['Employees', detail.employees ? detail.employees.toLocaleString() : '—']],
  ];

  return (
    <div className="detail-page view-enter">
      <button className="detail-back" onClick={onBack}>← Back</button>

      <div className="detail-header">
        <div className="detail-title">
          {getLogoUrl(detail.symbol) && (
            <img
              className="detail-logo"
              src={getLogoUrl(detail.symbol)!}
              alt=""
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div>
            <h1 className="detail-name">{detail.name}</h1>
            <span className="detail-symbol">{detail.symbol}</span>
            {detail.sector && <span className="detail-sector"> · {detail.sector}</span>}
          </div>
        </div>
        <div className="detail-price-block">
          <div className="detail-price">${detail.price?.toFixed(2)}</div>
          <div className={`detail-change ${detail.changePercent > 0 ? 'up' : detail.changePercent < 0 ? 'down' : ''}`}>
            {detail.change > 0 ? '+' : ''}{detail.change?.toFixed(2)} ({detail.changePercent > 0 ? '+' : ''}{detail.changePercent?.toFixed(2)}%)
          </div>
        </div>
      </div>

      <StockChart symbol={symbol} />

      <table className="detail-stats-table">
        <tbody>
          {statsRows.map((row, ri) => (
            <tr key={ri}>
              {row.map(([label, value]) => (
                <>
                  <td key={label + '-l'} className="stat-label">{label}</td>
                  <td key={label + '-v'} className="stat-value">{value}</td>
                </>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {detail.description && (
        <div className="detail-about">
          <h3>About</h3>
          <p>{detail.description}</p>
        </div>
      )}
    </div>
  );
}
