import { useMemo, useState } from 'react';
import type { Quote } from '../types';
import { getLogoUrl } from '../tickerDomains';
import './HeatmapView.css';

interface HeatmapViewProps {
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
}

interface TreeNode {
  symbol: string;
  price: number;
  changePercent: number;
  marketCap: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

function squarify(items: { symbol: string; price: number; changePercent: number; value: number }[], x: number, y: number, w: number, h: number): TreeNode[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ ...items[0], marketCap: items[0].value, x, y, w, h }];
  }

  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return [];

  const nodes: TreeNode[] = [];
  let remaining = [...items];
  let cx = x, cy = y, cw = w, ch = h;

  while (remaining.length > 0) {
    const isWide = cw >= ch;
    const side = isWide ? ch : cw;
    const totalRemaining = remaining.reduce((s, i) => s + i.value, 0);

    // Find best row
    let row: typeof remaining = [];
    let rowSum = 0;
    let bestRatio = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      row.push(remaining[i]);
      rowSum += remaining[i].value;

      const rowWidth = (rowSum / totalRemaining) * (isWide ? cw : ch);
      let worstRatio = 0;
      for (const item of row) {
        const itemHeight = (item.value / rowSum) * side;
        const ratio = Math.max(rowWidth / itemHeight, itemHeight / rowWidth);
        worstRatio = Math.max(worstRatio, ratio);
      }

      if (worstRatio > bestRatio && row.length > 1) {
        row.pop();
        rowSum -= remaining[i].value;
        break;
      }
      bestRatio = worstRatio;
    }

    // Layout row
    const rowWidth = (rowSum / totalRemaining) * (isWide ? cw : ch);
    let offset = 0;

    for (const item of row) {
      const frac = item.value / rowSum;
      const itemSize = frac * side;

      if (isWide) {
        nodes.push({ ...item, marketCap: item.value, x: cx, y: cy + offset, w: rowWidth, h: itemSize });
      } else {
        nodes.push({ ...item, marketCap: item.value, x: cx + offset, y: cy, w: itemSize, h: rowWidth });
      }
      offset += itemSize;
    }

    // Update remaining area
    if (isWide) {
      cx += rowWidth;
      cw -= rowWidth;
    } else {
      cy += rowWidth;
      ch -= rowWidth;
    }

    remaining = remaining.slice(row.length);
  }

  return nodes;
}

function getColor(pct: number): string {
  if (pct > 3) return '#22c55e';
  if (pct > 1.5) return '#4ade80';
  if (pct > 0.5) return '#86efac';
  if (pct > 0) return '#bbf7d0';
  if (pct === 0) return '#6b7280';
  if (pct > -0.5) return '#fecaca';
  if (pct > -1.5) return '#f87171';
  if (pct > -3) return '#ef4444';
  return '#dc2626';
}

export function HeatmapView({ quotes, onSelectStock }: HeatmapViewProps) {
  const [hover, setHover] = useState<TreeNode | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const nodes = useMemo(() => {
    const sorted = quotes
      .filter(q => q.marketCap && q.marketCap > 0)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .map(q => ({
        symbol: q.symbol,
        price: q.price,
        changePercent: q.changePercent,
        value: q.marketCap || 0,
      }));
    return squarify(sorted, 0, 0, 1000, 600);
  }, [quotes]);

  return (
    <div className="heatmap-view">
      <svg viewBox="0 0 1000 600" className="heatmap-svg" preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}>
        {nodes.map(n => {
          const color = getColor(n.changePercent);
          const isSmall = n.w < 60 || n.h < 40;
          const isTiny = n.w < 35 || n.h < 25;
          return (
            <g key={n.symbol} onClick={() => onSelectStock(n.symbol)} className="heatmap-cell" style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => { setHover(n); setMouse({ x: e.clientX, y: e.clientY }); }}
              onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHover(null)}>
              <rect
                x={n.x + 1}
                y={n.y + 1}
                width={Math.max(0, n.w - 2)}
                height={Math.max(0, n.h - 2)}
                rx={4}
                fill={color}
              />
              {!isTiny && (
                <>
                  <text
                    x={n.x + n.w / 2}
                    y={n.y + n.h / 2 - (isSmall ? 0 : 6)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#fff"
                    fontSize={isSmall ? 9 : 13}
                    fontWeight={700}
                  >
                    {n.symbol}
                  </text>
                  {!isSmall && (
                    <text
                      x={n.x + n.w / 2}
                      y={n.y + n.h / 2 + 12}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="rgba(255,255,255,0.8)"
                      fontSize={11}
                      fontWeight={500}
                    >
                      {n.changePercent > 0 ? '+' : ''}{n.changePercent?.toFixed(2)}%
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="heatmap-tooltip" style={{ left: mouse.x + 12, top: mouse.y - 40, position: 'fixed' }}>
          <div className="heatmap-tooltip-symbol">{hover.symbol}</div>
          <div>${hover.price?.toFixed(2)}</div>
          <div style={{ color: hover.changePercent >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
            {hover.changePercent >= 0 ? '+' : ''}{hover.changePercent.toFixed(2)}%
          </div>
        </div>
      )}
    </div>
  );
}
