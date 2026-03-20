import { useMemo, useState, useRef, useEffect } from 'react';
import type { Quote } from '../types';

interface DashboardHeatmapProps {
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
  onSeeAll: () => void;
}

interface TreeNode {
  symbol: string; shortName?: string; price: number;
  changePercent: number; marketCap: number;
  x: number; y: number; w: number; h: number;
}

function getColor(cp: number) {
  if (cp > 3) return '#22c55e';
  if (cp > 1.5) return '#4ade80';
  if (cp > 0.5) return '#86efac';
  if (cp > 0) return '#bbf7d0';
  if (cp === 0) return '#6b7280';
  if (cp > -0.5) return '#fecaca';
  if (cp > -1.5) return '#f87171';
  if (cp > -3) return '#ef4444';
  return '#dc2626';
}

function squarify(items: { symbol: string; shortName?: string; price: number; changePercent: number; value: number }[], x: number, y: number, w: number, h: number): TreeNode[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ symbol: items[0].symbol, shortName: items[0].shortName, price: items[0].price, changePercent: items[0].changePercent, marketCap: items[0].value, x, y, w, h }];
  }
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return [];
  const horizontal = w >= h;
  let rowItems: typeof items = [];
  let rest = [...items];
  let bestRatio = Infinity;

  for (let i = 1; i <= items.length; i++) {
    const row = items.slice(0, i);
    const rowTotal = row.reduce((s, it) => s + it.value, 0);
    const rowFrac = rowTotal / total;
    const rowSize = horizontal ? w * rowFrac : h * rowFrac;
    const worstRatio = row.reduce((worst, it) => {
      const frac = it.value / rowTotal;
      const cellSize = horizontal ? h * frac : w * frac;
      const ratio = Math.max(rowSize / cellSize, cellSize / rowSize);
      return Math.max(worst, ratio);
    }, 0);
    if (worstRatio <= bestRatio) {
      bestRatio = worstRatio;
      rowItems = row;
      rest = items.slice(i);
    } else break;
  }

  const rowTotal = rowItems.reduce((s, i) => s + i.value, 0);
  const rowFrac = rowTotal / total;
  const nodes: TreeNode[] = [];
  let offset = 0;

  if (horizontal) {
    const rowW = w * rowFrac;
    for (const it of rowItems) {
      const frac = it.value / rowTotal;
      const cellH = h * frac;
      nodes.push({ symbol: it.symbol, shortName: it.shortName, price: it.price, changePercent: it.changePercent, marketCap: it.value, x, y: y + offset, w: rowW, h: cellH });
      offset += cellH;
    }
    nodes.push(...squarify(rest, x + rowW, y, w - rowW, h));
  } else {
    const rowH = h * rowFrac;
    for (const it of rowItems) {
      const frac = it.value / rowTotal;
      const cellW = w * frac;
      nodes.push({ symbol: it.symbol, shortName: it.shortName, price: it.price, changePercent: it.changePercent, marketCap: it.value, x: x + offset, y, w: cellW, h: rowH });
      offset += cellW;
    }
    nodes.push(...squarify(rest, x, y + rowH, w, h - rowH));
  }
  return nodes;
}

export default function DashboardHeatmap({ quotes, onSelectStock, onSeeAll }: DashboardHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 400 });
  const [hover, setHover] = useState<TreeNode | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const nodes = useMemo(() => {
    const sorted = quotes
      .filter(q => q.marketCap && q.marketCap > 0)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, 25);
    const items = sorted.map(q => ({
      symbol: q.symbol, shortName: (q as Record<string, unknown>).shortName as string | undefined, price: q.price,
      changePercent: q.changePercent, value: q.marketCap || 0,
    }));
    return squarify(items, 0, 0, dims.w, dims.h);
  }, [quotes, dims]);

  return (
    <div className="dashboard-heatmap">
      <div className="panel-header">
        <span className="panel-title">MARKET HEATMAP</span>
        <button className="panel-see-all" onClick={onSeeAll}>See all &rarr;</button>
      </div>
      <div className="dashboard-heatmap-container" ref={containerRef}
        onMouseLeave={() => setHover(null)}>
        <svg width={dims.w} height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}>
          {nodes.map(n => {
            const showText = n.w > 40 && n.h > 30;
            return (
              <g key={n.symbol} onClick={() => onSelectStock(n.symbol)}
                onMouseEnter={(e) => { setHover(n); setMouse({ x: e.clientX, y: e.clientY }); }}
                onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
                style={{ cursor: 'pointer' }}>
                <rect x={n.x + 1} y={n.y + 1} width={Math.max(0, n.w - 2)} height={Math.max(0, n.h - 2)}
                  fill={getColor(n.changePercent)} rx={3} />
                {showText && (
                  <>
                    <text x={n.x + n.w / 2} y={n.y + n.h / 2 - 4} textAnchor="middle"
                      fill="#fff" fontSize={n.w > 80 ? 12 : 10} fontWeight="600">{n.symbol}</text>
                    <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 10} textAnchor="middle"
                      fill="#fff" fontSize={n.w > 80 ? 10 : 8} opacity={0.85}>
                      {n.changePercent >= 0 ? '+' : ''}{n.changePercent.toFixed(1)}%
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
        {hover && (
          <div className="heatmap-tooltip" style={{ left: mouse.x + 12, top: mouse.y - 40, position: 'fixed' }}>
            <div className="heatmap-tooltip-symbol">{hover.symbol}</div>
            {hover.shortName && <div className="heatmap-tooltip-name">{hover.shortName}</div>}
            <div>${hover.price?.toFixed(2)}</div>
            <div style={{ color: hover.changePercent >= 0 ? '#34c759' : '#ff3b30' }}>
              {hover.changePercent >= 0 ? '+' : ''}{hover.changePercent.toFixed(2)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
