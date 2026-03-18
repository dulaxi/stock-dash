import { useState, useEffect, useRef } from 'react';
import './StockChart.css';

interface ChartPoint {
  time: string;
  close: number;
  volume?: number;
}

interface StockChartProps {
  symbol: string;
}

const RANGES = [
  { key: '1d', label: '1D' },
  { key: '5d', label: '5D' },
  { key: '1mo', label: '1M' },
  { key: '3mo', label: '3M' },
  { key: '1y', label: '1Y' },
  { key: '5y', label: '5Y' },
];

export function StockChart({ symbol }: StockChartProps) {
  const [range, setRange] = useState('1d');
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<{ x: number; idx: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/history/${encodeURIComponent(symbol)}?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [symbol, range]);

  const width = 700;
  const height = 260;
  const pad = { top: 10, right: 10, bottom: 30, left: 60 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const closes = data.map(d => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const yRange = max - min || 1;

  const toX = (i: number) => pad.left + (i / (data.length - 1)) * cw;
  const toY = (v: number) => pad.top + ch - ((v - min) / yRange) * ch;

  const pathD = closes.map((v, i) =>
    `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`
  ).join(' ');

  const areaD = pathD + ` L${toX(closes.length - 1).toFixed(1)},${(pad.top + ch).toFixed(1)} L${pad.left},${(pad.top + ch).toFixed(1)} Z`;

  const isUp = closes.length > 1 && closes[closes.length - 1] >= closes[0];
  const color = isUp ? 'var(--positive)' : 'var(--negative)';

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = (x - pad.left) / cw;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(ratio * (data.length - 1))));
    setHover({ x: toX(idx), idx });
  };

  const hoverPoint = hover ? data[hover.idx] : null;
  const displayPrice = hoverPoint?.close ?? (closes.length > 0 ? closes[closes.length - 1] : 0);
  const displayTime = hoverPoint
    ? new Date(hoverPoint.time).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : '';

  // Y-axis labels
  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const v = min + (yRange / (yTicks - 1)) * i;
    return { v, y: toY(v) };
  });

  return (
    <div className="stock-chart">
      <div className="chart-header">
        <div className="chart-price-display">
          <span className="chart-hover-price">${displayPrice.toFixed(2)}</span>
          {displayTime && <span className="chart-hover-time">{displayTime}</span>}
        </div>
        <div className="chart-range-pills">
          {RANGES.map(r => (
            <button
              key={r.key}
              className={`chart-range-pill ${range === r.key ? 'active' : ''}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="chart-loading skeleton" style={{ width, height }} />
      ) : (
        <svg
          ref={svgRef}
          className="chart-svg"
          viewBox={`0 0 ${width} ${height}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* Y grid lines */}
          {yLabels.map((l, i) => (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={l.y} y2={l.y} stroke="var(--border)" strokeWidth={0.5} />
              <text x={pad.left - 8} y={l.y + 4} textAnchor="end" fill="var(--text-secondary)" fontSize={10}>
                {l.v.toFixed(l.v > 1000 ? 0 : 2)}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={areaD} fill={color} opacity={0.08} />

          {/* Line */}
          <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} />

          {/* Hover crosshair */}
          {hover && (
            <>
              <line x1={hover.x} x2={hover.x} y1={pad.top} y2={pad.top + ch} stroke="var(--text-secondary)" strokeWidth={0.5} strokeDasharray="3,3" />
              <circle cx={hover.x} cy={toY(closes[hover.idx])} r={4} fill={color} stroke="var(--bg)" strokeWidth={2} />
            </>
          )}
        </svg>
      )}
    </div>
  );
}
