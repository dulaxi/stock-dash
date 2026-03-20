import { useMemo, useState, useRef, useEffect } from 'react';
import type { Quote } from '../types';
import './HeatmapView.css';

interface HeatmapViewProps {
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
  onNavigate?: (view: string) => void;
}

interface TreeNode {
  symbol: string;
  shortName?: string;
  price: number;
  changePercent: number;
  marketCap: number;
  sector?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SectorLabel {
  sector: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function squarify(items: { symbol: string; shortName?: string; price: number; changePercent: number; sector?: string; value: number }[], x: number, y: number, w: number, h: number): TreeNode[] {
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

type GroupMode = 'marketcap' | 'sector';

export function HeatmapView({ quotes, onSelectStock, onNavigate }: HeatmapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 500 });
  const [hover, setHover] = useState<TreeNode | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [groupMode, setGroupMode] = useState<GroupMode>('marketcap');

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

  const { nodes, sectorLabels } = useMemo(() => {
    const valid = quotes
      .filter(q => q.marketCap && q.marketCap > 0)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

    if (groupMode === 'marketcap') {
      const items = valid.map(q => ({
        symbol: q.symbol, shortName: q.shortName, price: q.price,
        changePercent: q.changePercent, sector: q.sector, value: q.marketCap || 0,
      }));
      return { nodes: squarify(items, 0, 0, dims.w, dims.h), sectorLabels: [] as SectorLabel[] };
    }

    // Group by sector
    const sectorMap = new Map<string, typeof valid>();
    for (const q of valid) {
      const sector = q.sector || 'Other';
      if (!sectorMap.has(sector)) sectorMap.set(sector, []);
      sectorMap.get(sector)!.push(q);
    }

    const sectors = [...sectorMap.entries()]
      .map(([sector, stocks]) => ({
        sector, stocks,
        totalCap: stocks.reduce((s, q) => s + (q.marketCap || 0), 0),
      }))
      .sort((a, b) => b.totalCap - a.totalCap);

    const sectorItems = sectors.map(s => ({
      symbol: s.sector, price: 0, changePercent: 0, value: s.totalCap,
    }));
    const sectorBlocks = squarify(sectorItems, 0, 0, dims.w, dims.h);

    const allNodes: TreeNode[] = [];
    const labels: SectorLabel[] = [];

    for (let i = 0; i < sectors.length; i++) {
      const block = sectorBlocks[i];
      if (!block) continue;
      const { sector, stocks } = sectors[i];

      labels.push({ sector, x: block.x, y: block.y, w: block.w, h: block.h });

      const labelHeight = block.h > 50 ? 16 : 0;
      const innerY = block.y + labelHeight;
      const innerH = block.h - labelHeight;
      if (innerH <= 0) continue;

      const stockItems = stocks.map(q => ({
        symbol: q.symbol, shortName: q.shortName, price: q.price,
        changePercent: q.changePercent, sector: q.sector, value: q.marketCap || 0,
      }));
      allNodes.push(...squarify(stockItems, block.x, innerY, block.w, innerH));
    }

    return { nodes: allNodes, sectorLabels: labels };
  }, [quotes, groupMode, dims]);

  const gap = 2;

  return (
    <div className="heatmap-view">
      <div className="heatmap-controls">
        {onNavigate && (
          <div className="pill-group">
            <button className="pill active">Heatmap</button>
            <button className="pill" onClick={() => onNavigate('screener')}>Screener</button>
          </div>
        )}
        <div className="pill-group">
          <button className={`pill ${groupMode === 'marketcap' ? 'active' : ''}`}
            onClick={() => setGroupMode('marketcap')}>By Market Cap</button>
          <button className={`pill ${groupMode === 'sector' ? 'active' : ''}`}
            onClick={() => setGroupMode('sector')}>By Sector</button>
        </div>
      </div>
      <div className="heatmap-container" ref={containerRef}
        onMouseLeave={() => setHover(null)}>
        <svg width={dims.w} height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}>
          {/* Sector borders and labels */}
          {sectorLabels.map(s => (
            <g key={s.sector}>
              <rect x={s.x + 1} y={s.y + 1} width={Math.max(0, s.w - 2)} height={Math.max(0, s.h - 2)}
                fill="none" stroke="var(--border)" strokeWidth={2} rx={4} />
              {s.h > 50 && s.w > 60 && (
                <text x={s.x + 6} y={s.y + 12}
                  fill="var(--text-secondary)" fontSize={10} fontWeight={700}
                  style={{ textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                  {s.sector}
                </text>
              )}
            </g>
          ))}
          {/* Stock cells */}
          {nodes.map(n => {
            const color = getColor(n.changePercent);
            const cw = Math.max(0, n.w - gap * 2);
            const ch = Math.max(0, n.h - gap * 2);
            const showSymbol = cw > 30 && ch > 20;
            const showPercent = cw > 55 && ch > 35;
            const showName = cw > 90 && ch > 50;
            const fontSize = cw > 120 && ch > 60 ? 14 : cw > 70 ? 12 : 10;
            return (
              <g key={n.symbol} onClick={() => onSelectStock(n.symbol)}
                className="heatmap-cell" style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => { setHover(n); setMouse({ x: e.clientX, y: e.clientY }); }}
                onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHover(null)}>
                <rect x={n.x + gap} y={n.y + gap} width={cw} height={ch}
                  rx={3} fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
                {showSymbol && (
                  <text x={n.x + n.w / 2} y={n.y + n.h / 2 - (showPercent ? (showName ? 10 : 6) : 0)}
                    textAnchor="middle" dominantBaseline="central"
                    fill="#fff" fontSize={fontSize} fontWeight={700}>
                    {n.symbol}
                  </text>
                )}
                {showPercent && (
                  <text x={n.x + n.w / 2} y={n.y + n.h / 2 + (showName ? 4 : 8)}
                    textAnchor="middle" dominantBaseline="central"
                    fill="rgba(255,255,255,0.85)" fontSize={fontSize - 2} fontWeight={500}>
                    {n.changePercent > 0 ? '+' : ''}{n.changePercent?.toFixed(2)}%
                  </text>
                )}
                {showName && n.shortName && (
                  <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 18}
                    textAnchor="middle" dominantBaseline="central"
                    fill="rgba(255,255,255,0.5)" fontSize={9} fontWeight={400}>
                    {n.shortName.length > 18 ? n.shortName.slice(0, 18) + '…' : n.shortName}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {hover && (
        <div className="heatmap-tooltip" style={{ left: mouse.x + 12, top: mouse.y - 50, position: 'fixed' }}>
          <div className="heatmap-tooltip-symbol">{hover.symbol}</div>
          {hover.shortName && <div className="heatmap-tooltip-name">{hover.shortName}</div>}
          {hover.sector && <div className="heatmap-tooltip-sector">{hover.sector}</div>}
          <div className="heatmap-tooltip-price">${hover.price?.toFixed(2)}</div>
          <div style={{ color: hover.changePercent >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: 600 }}>
            {hover.changePercent >= 0 ? '+' : ''}{hover.changePercent.toFixed(2)}%
          </div>
        </div>
      )}
    </div>
  );
}
