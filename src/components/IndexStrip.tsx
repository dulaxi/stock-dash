import { useState, useEffect } from 'react';
import type { IndexQuote } from '../types';
import { Sparkline } from './Sparkline';

interface IndexStripProps {
  indices: IndexQuote[];
}

export default function IndexStrip({ indices }: IndexStripProps) {
  const [charts, setCharts] = useState<Record<string, number[]>>({});

  useEffect(() => {
    const syms = ['^IXIC', '^GSPC', '^DJI'];
    syms.forEach(s =>
      fetch(`/api/chart/${encodeURIComponent(s)}`)
        .then(r => r.json())
        .then(data => setCharts(prev => ({ ...prev, [s]: data.map((p: { close: number }) => p.close) })))
        .catch(() => {})
    );
  }, []);

  const chartSymMap: Record<string, string> = { 'NASDAQ': '^IXIC', 'S&P 500': '^GSPC', 'DOW': '^DJI' };

  return (
    <div className="index-strip">
      {indices.map(idx => {
        const chartKey = chartSymMap[idx.name] || '';
        const data = charts[chartKey] || [];
        const up = idx.changePercent >= 0;
        return (
          <div key={idx.symbol} className="index-strip-item">
            <span className="index-strip-name">{idx.name}</span>
            <span className="index-strip-price">{idx.price?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            <span className={`index-strip-change ${up ? 'up' : 'down'}`}>
              {up ? '+' : ''}{idx.changePercent?.toFixed(2)}%
            </span>
            {data.length > 1 && (
              <Sparkline data={data} width={48} height={16}
                color={up ? 'var(--green)' : 'var(--red)'} />
            )}
          </div>
        );
      })}
    </div>
  );
}
