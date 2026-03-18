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
  { key: 'ytd', label: 'YTD' },
  { key: '1y', label: '1Y' },
  { key: '5y', label: '5Y' },
  { key: 'all', label: 'ALL' },
];

const HOUR_LABELS = [3, 6, 9, 12, 15, 18, 21];

export function StockChart({ symbol }: StockChartProps) {
  const [range, setRange] = useState('1d');
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<{ svgX: number; idx: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setLoading(true);
    const fetchChart = () => {
      fetch(`/api/history/${encodeURIComponent(symbol)}?range=${range}`)
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false); })
        .catch(() => setLoading(false));
    };
    fetchChart();
    const liveRanges = ['1d', '5d'];
    const interval = liveRanges.includes(range)
      ? setInterval(fetchChart, 30000)
      : null;
    return () => { if (interval) clearInterval(interval); };
  }, [symbol, range]);

  const width = 700;
  const height = 260;
  const pad = { top: 10, right: 10, bottom: 30, left: 60 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const is1D = range === '1d';
  const closes = data.map(d => d.close);
  const min = closes.length > 0 ? Math.min(...closes) : 0;
  const max = closes.length > 0 ? Math.max(...closes) : 1;
  const yRange = max - min || 1;

  const toY = (v: number) => pad.top + ch - ((v - min) / yRange) * ch;

  // For 1D: map time to fixed 24h axis. For others: map index to width.
  let dayStart = 0;
  const DAY_MS = 21 * 60 * 60 * 1000; // 3AM to 12AM = 21 hours
  if (is1D) {
    const now = new Date();
    dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 3, 0, 0).getTime();
  }

  const toX = (i: number) => {
    if (is1D && data[i]) {
      const t = new Date(data[i].time).getTime();
      const ratio = (t - dayStart) / DAY_MS;
      return pad.left + Math.max(0, Math.min(1, ratio)) * cw;
    }
    if (data.length <= 1) return pad.left;
    return pad.left + (i / (data.length - 1)) * cw;
  };

  // For hover on 1D, find nearest data point by x position
  const timeToX = (t: number) => pad.left + Math.max(0, Math.min(1, (t - dayStart) / DAY_MS)) * cw;

  // Split into premarket (<9:30) and market (>=9:30) segments for 1D
  const marketOpenMs = is1D ? dayStart - 3 * 3600000 + 9.5 * 3600000 : 0; // 9:30 AM

  let prePath = '';
  let preArea = '';
  let mktPath = '';
  let mktArea = '';
  let fullPath = '';

  if (closes.length > 0 && is1D) {
    const prePoints: string[] = [];
    const mktPoints: string[] = [];
    let lastPreIdx = -1;

    data.forEach((d, i) => {
      const t = new Date(d.time).getTime();
      const pt = `${toX(i).toFixed(1)},${toY(closes[i]).toFixed(1)}`;
      if (t < marketOpenMs) {
        prePoints.push(pt);
        lastPreIdx = i;
      } else {
        mktPoints.push(pt);
      }
    });

    // Connect market line from last premarket point for continuity
    if (lastPreIdx >= 0 && mktPoints.length > 0) {
      const bridgePt = `${toX(lastPreIdx).toFixed(1)},${toY(closes[lastPreIdx]).toFixed(1)}`;
      mktPoints.unshift(bridgePt);
    }

    if (prePoints.length > 0) {
      prePath = 'M' + prePoints.join(' L');
      const lastPre = prePoints[prePoints.length - 1].split(',')[0];
      const firstPre = prePoints[0].split(',')[0];
      preArea = prePath + ` L${lastPre},${(pad.top + ch).toFixed(1)} L${firstPre},${(pad.top + ch).toFixed(1)} Z`;
    }
    if (mktPoints.length > 0) {
      mktPath = 'M' + mktPoints.join(' L');
      const lastMkt = mktPoints[mktPoints.length - 1].split(',')[0];
      const firstMkt = mktPoints[0].split(',')[0];
      mktArea = mktPath + ` L${lastMkt},${(pad.top + ch).toFixed(1)} L${firstMkt},${(pad.top + ch).toFixed(1)} Z`;
    }
    fullPath = closes.map((v, i) =>
      `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`
    ).join(' ');
  } else if (closes.length > 0) {
    fullPath = closes.map((v, i) =>
      `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`
    ).join(' ');
    const lastX = toX(closes.length - 1);
    mktArea = fullPath + ` L${lastX.toFixed(1)},${(pad.top + ch).toFixed(1)} L${toX(0).toFixed(1)},${(pad.top + ch).toFixed(1)} Z`;
    mktPath = fullPath;
  }

  const isUp = closes.length > 1 && closes[closes.length - 1] >= closes[0];
  const color = isUp ? 'var(--positive)' : 'var(--negative)';

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scale = width / rect.width;
    const svgX = (e.clientX - rect.left) * scale;

    if (is1D) {
      // Find nearest data point by time position
      const ratio = (svgX - pad.left) / cw;
      const targetTime = dayStart + ratio * DAY_MS;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < data.length; i++) {
        const dist = Math.abs(new Date(data[i].time).getTime() - targetTime);
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      }
      const dataEndX = data.length > 0 ? toX(data.length - 1) : pad.left;
      if (svgX <= dataEndX + 10) {
        setHover({ svgX: toX(bestIdx), idx: bestIdx });
      } else {
        setHover(null);
      }
    } else {
      const ratio = (svgX - pad.left) / cw;
      const idx = Math.max(0, Math.min(data.length - 1, Math.round(ratio * (data.length - 1))));
      setHover({ svgX: toX(idx), idx });
    }
  };

  const hoverPoint = hover ? data[hover.idx] : null;
  const latestPoint = data.length > 0 ? data[data.length - 1] : null;
  const activePoint = hoverPoint || latestPoint;
  const displayPrice = activePoint?.close ?? 0;
  const displayTime = activePoint
    ? new Date(activePoint.time).toLocaleString(undefined, {
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

          {/* X-axis time labels for 1D */}
          {is1D && HOUR_LABELS.map(h => {
            const midnight = dayStart - 3 * 3600000;
            const x = timeToX(midnight + h * 3600000);
            const label = h === 0 ? '12AM' : h === 12 ? '12PM' : h < 12 ? `${h}AM` : `${h - 12}PM`;
            return (
              <text key={h} x={x} y={height - 8} textAnchor="middle" fill="var(--text-secondary)" fontSize={9}>
                {label}
              </text>
            );
          })}

          {/* Premarket (reduced opacity) */}
          {preArea && <path d={preArea} fill={color} opacity={0.03} />}
          {prePath && <path d={prePath} fill="none" stroke={color} strokeWidth={1.5} opacity={0.3} />}

          {/* Market hours (full opacity) */}
          {mktArea && <path d={mktArea} fill={color} opacity={0.08} />}
          {mktPath && <path d={mktPath} fill="none" stroke={color} strokeWidth={1.5} />}


          {/* "Now" marker for 1D — dashed line at current time */}
          {is1D && (() => {
            const nowX = timeToX(Date.now());
            return nowX > pad.left && nowX < width - pad.right ? (
              <line x1={nowX} x2={nowX} y1={pad.top} y2={pad.top + ch} stroke="var(--text-secondary)" strokeWidth={0.5} strokeDasharray="2,4" opacity={0.4} />
            ) : null;
          })()}

          {/* Hover crosshair */}
          {hover && (
            <>
              <line x1={hover.svgX} x2={hover.svgX} y1={pad.top} y2={pad.top + ch} stroke="var(--text-secondary)" strokeWidth={0.5} strokeDasharray="3,3" />
              <circle cx={hover.svgX} cy={toY(closes[hover.idx])} r={4} fill={color} stroke="var(--bg)" strokeWidth={2} />
            </>
          )}
        </svg>
      )}
    </div>
  );
}
