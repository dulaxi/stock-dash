import { useState, useRef } from 'react';
import { Info } from '@phosphor-icons/react';
import './MetricTooltip.css';

// Financial metric explanations dictionary
const METRIC_EXPLANATIONS: Record<string, { label: string; tip: string }> = {
  // Valuation
  marketCap: { label: 'Market Cap', tip: 'Total market value of all shares. Mega >500B, Large >10B, Mid >2B, Small <2B.' },
  pe: { label: 'P/E', tip: 'Price-to-Earnings ratio. How much investors pay per $1 of earnings. S&P 500 avg: ~23. Lower = cheaper.' },
  forwardPE: { label: 'Forward P/E', tip: 'P/E based on estimated future earnings. Lower than trailing P/E suggests growing earnings.' },
  peg: { label: 'PEG', tip: 'P/E divided by earnings growth rate. Below 1 = undervalued relative to growth. Above 2 = expensive.' },
  ps: { label: 'P/S', tip: 'Price-to-Sales ratio. Useful for unprofitable companies. Lower = cheaper relative to revenue.' },
  pb: { label: 'P/B', tip: 'Price-to-Book ratio. Below 1 means stock trades below net asset value. Banks avg ~1.2.' },
  evEbitda: { label: 'EV/EBITDA', tip: 'Enterprise Value to EBITDA. Compares total company value to cash earnings. Lower = cheaper. S&P 500 avg: ~14.' },
  evRevenue: { label: 'EV/Revenue', tip: 'Enterprise Value to Revenue. Useful for high-growth companies without profits.' },
  enterpriseValue: { label: 'Enterprise Value', tip: 'Market cap + debt - cash. The theoretical buyout price of the company.' },

  // Earnings
  eps: { label: 'EPS', tip: 'Earnings Per Share. Net income divided by shares outstanding. Higher = more profitable per share.' },
  epsForward: { label: 'EPS (fwd)', tip: 'Estimated future earnings per share. Compare to trailing EPS to gauge growth direction.' },
  revenue: { label: 'Revenue', tip: 'Total sales before expenses. Top-line growth is a key health indicator.' },
  netIncome: { label: 'Net Income', tip: 'Profit after all expenses and taxes. The bottom line.' },

  // Profitability
  grossMargin: { label: 'Gross Margin', tip: 'Revenue minus cost of goods, as %. Higher = better pricing power. Tech avg: ~60%, Retail avg: ~25%.' },
  operatingMargin: { label: 'Operating Margin', tip: 'Profit from operations as % of revenue. Shows efficiency before interest/taxes.' },
  profitMargin: { label: 'Profit Margin', tip: 'Net income as % of revenue. Higher = more of each dollar becomes profit. S&P 500 avg: ~11%.' },
  roe: { label: 'ROE', tip: 'Return on Equity. Profit relative to shareholder equity. Above 15% is strong. Buffett looks for >20%.' },
  roa: { label: 'ROA', tip: 'Return on Assets. How efficiently assets generate profit. Above 5% is solid for most industries.' },

  // Balance Sheet
  debtEquity: { label: 'Debt/Equity', tip: 'Total debt divided by equity. Below 1 = more equity than debt. Above 2 can signal risk.' },
  currentRatio: { label: 'Current Ratio', tip: 'Current assets / current liabilities. Above 1.5 = healthy short-term liquidity.' },
  quickRatio: { label: 'Quick Ratio', tip: 'Like current ratio but excludes inventory. Above 1 = can cover short-term debts without selling inventory.' },
  bookValue: { label: 'Book Value', tip: 'Net asset value per share. If stock price < book value, could be undervalued.' },

  // Performance
  beta: { label: 'Beta', tip: 'Volatility relative to the market. 1 = moves with market. >1 = more volatile. <1 = less volatile.' },
  fiftyTwoWeekHigh: { label: '52W High', tip: 'Highest price in the last year. Proximity to high can signal momentum or resistance.' },
  fiftyTwoWeekLow: { label: '52W Low', tip: 'Lowest price in the last year. Near low could mean value opportunity or ongoing decline.' },
  sma50: { label: 'SMA 50', tip: '50-day Simple Moving Average. Price above SMA50 = short-term uptrend.' },
  sma200: { label: 'SMA 200', tip: '200-day Simple Moving Average. Price above SMA200 = long-term uptrend. "Golden cross" = SMA50 crosses above SMA200.' },

  // Shares
  sharesOutstanding: { label: 'Shares Out', tip: 'Total shares issued. Dilution (more shares) reduces EPS.' },
  float: { label: 'Float', tip: 'Shares available for public trading (excludes insider holdings). Low float = more volatile.' },
  shortRatio: { label: 'Short Ratio', tip: 'Days to cover all short positions at average volume. Above 5 = heavy short interest, potential squeeze.' },
  shortPercent: { label: 'Short % Float', tip: 'Percentage of float sold short. Above 20% = very bearish sentiment.' },

  // Dividend
  dividendYield: { label: 'Dividend Yield', tip: 'Annual dividend as % of stock price. S&P 500 avg: ~1.5%. Above 4% = high yield (check sustainability).' },
  payoutRatio: { label: 'Payout Ratio', tip: 'Percentage of earnings paid as dividends. Above 80% may not be sustainable.' },
  exDivDate: { label: 'Ex-Div Date', tip: 'Must own shares before this date to receive the next dividend.' },

  // Trading
  volume: { label: 'Volume', tip: 'Shares traded today. High volume confirms price moves. Low volume = less conviction.' },
  avgVolume: { label: 'Avg Volume', tip: 'Average daily shares traded. Compare to current volume — above avg = unusual activity.' },
  price: { label: 'Price', tip: 'Current market price per share.' },
  change: { label: 'Change', tip: 'Dollar change from previous close.' },
  changePercent: { label: 'Change %', tip: 'Percentage change from previous close. The primary measure of daily performance.' },

  // Sectors
  sector: { label: 'Sector', tip: 'Industry classification. Sectors rotate in and out of favor based on economic cycles.' },
};

export function getMetricExplanation(key: string): { label: string; tip: string } | null {
  return METRIC_EXPLANATIONS[key] || null;
}

interface MetricTooltipProps {
  metricKey: string;
  children: React.ReactNode;
}

export default function MetricTooltip({ metricKey, children }: MetricTooltipProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);
  const explanation = METRIC_EXPLANATIONS[metricKey];

  if (!explanation) return <>{children}</>;

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 4 });
    }
    setShow(true);
  };

  return (
    <span
      ref={ref}
      className="metric-tooltip-trigger"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <Info size={10} weight="bold" className="metric-tooltip-icon" />
      {show && (
        <div className="metric-tooltip-popup" style={{ left: pos.x, top: pos.y, position: 'fixed' }}>
          <div className="metric-tooltip-label">{explanation.label}</div>
          <div className="metric-tooltip-text">{explanation.tip}</div>
        </div>
      )}
    </span>
  );
}
