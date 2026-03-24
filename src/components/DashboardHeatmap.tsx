import { useMemo, useState, useRef, useEffect } from 'react';
import type { Quote } from '../types';
import { getLogoUrl } from '../tickerDomains';

interface DashboardHeatmapProps {
  quotes: Quote[];
  onSelectStock: (symbol: string) => void;
  onSeeAll: () => void;
}

interface TreeNode {
  symbol: string; shortName?: string; price: number;
  changePercent: number; marketCap: number; sector?: string;
  x: number; y: number; w: number; h: number;
}

interface SectorLabel {
  sector: string;
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
    if (isWide) { cx += rowWidth; cw -= rowWidth; }
    else { cy += rowWidth; ch -= rowWidth; }
    remaining = remaining.slice(row.length);
  }
  return nodes;
}

type GroupMode = 'marketcap' | 'sector';

export default function DashboardHeatmap({ quotes, onSelectStock, onSeeAll }: DashboardHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 400 });
  const [hover, setHover] = useState<TreeNode | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [groupMode, setGroupMode] = useState<GroupMode>('marketcap');
  const [logos, setLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    quotes.forEach(q => {
      if (getLogoUrl(q.symbol) || logos[q.symbol]) return;
      fetch(`/api/profile/${q.symbol}`)
        .then(r => r.json())
        .then(data => { if (data.logo) setLogos(prev => ({ ...prev, [q.symbol]: data.logo })); })
        .catch(() => {});
    });
  }, [quotes]);

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
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, 30);

    if (groupMode === 'marketcap') {
      const items = valid.map(q => ({
        symbol: q.symbol, shortName: q.shortName, price: q.price,
        changePercent: q.changePercent, sector: q.sector, value: q.marketCap || 0,
      }));
      return { nodes: squarify(items, 0, 0, dims.w, dims.h), sectorLabels: [] as SectorLabel[] };
    }

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

      const labelH = block.h > 40 ? 14 : 0;
      const innerY = block.y + labelH;
      const innerH = block.h - labelH;
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
    <div className="dashboard-heatmap">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="panel-title">MARKET HEATMAP</span>
          <div className="heatmap-mini-toggle">
            <button className={groupMode === 'marketcap' ? 'active' : ''}
              onClick={() => setGroupMode('marketcap')}>Cap</button>
            <button className={groupMode === 'sector' ? 'active' : ''}
              onClick={() => setGroupMode('sector')}>Sector</button>
          </div>
        </div>
        <button className="panel-see-all" onClick={onSeeAll}>See all &rarr;</button>
      </div>
      <div className="dashboard-heatmap-container" ref={containerRef}
        onMouseLeave={() => setHover(null)}>
        <svg width={dims.w} height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}>
          {sectorLabels.map(s => (
            <g key={s.sector}>
              <rect x={s.x + 1} y={s.y + 1} width={Math.max(0, s.w - 2)} height={Math.max(0, s.h - 2)}
                fill="none" stroke="var(--border)" strokeWidth={1.5} rx={3} />
              {s.h > 40 && s.w > 50 && (
                <text x={s.x + 5} y={s.y + 11}
                  fill="var(--text-secondary)" fontSize={8} fontWeight={700}
                  style={{ textTransform: 'uppercase' as const, letterSpacing: '0.3px' }}>
                  {s.sector}
                </text>
              )}
            </g>
          ))}
          {nodes.map(n => {
            const color = getColor(n.changePercent);
            const cw = Math.max(0, n.w - gap * 2);
            const ch = Math.max(0, n.h - gap * 2);
            const showSymbol = cw > 28 && ch > 18;
            const showPercent = cw > 50 && ch > 32;
            const fontSize = cw > 100 ? 12 : cw > 60 ? 10 : 8;
            return (
              <g key={n.symbol} onClick={() => onSelectStock(n.symbol)}
                onMouseEnter={(e) => { setHover(n); setMouse({ x: e.clientX, y: e.clientY }); }}
                onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}>
                <rect x={n.x + gap} y={n.y + gap} width={cw} height={ch}
                  rx={2} fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
                {showSymbol && (
                  <text x={n.x + n.w / 2} y={n.y + n.h / 2 - (showPercent ? 5 : 0)}
                    textAnchor="middle" dominantBaseline="central"
                    fill="#fff" fontSize={fontSize} fontWeight="700">{n.symbol}</text>
                )}
                {showPercent && (
                  <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 8}
                    textAnchor="middle" dominantBaseline="central"
                    fill="rgba(255,255,255,0.85)" fontSize={fontSize - 2} fontWeight="500">
                    {n.changePercent >= 0 ? '+' : ''}{n.changePercent.toFixed(1)}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover && (
          <div className="heatmap-tooltip" style={{ left: mouse.x + 12, top: mouse.y - 50, position: 'fixed' }}>
            <div className="heatmap-tooltip-header">
              {(logos[hover.symbol] || getLogoUrl(hover.symbol)) && (
                <img className="heatmap-tooltip-logo" src={logos[hover.symbol] || getLogoUrl(hover.symbol)!} alt=""
                  onError={e => (e.currentTarget.style.display = 'none')} />
              )}
              <div>
                <div className="heatmap-tooltip-symbol">{hover.symbol}</div>
                {hover.shortName && <div className="heatmap-tooltip-name">{hover.shortName}</div>}
              </div>
            </div>
            {hover.sector && <div className="heatmap-tooltip-sector">{hover.sector}</div>}
            <div style={{ fontWeight: 600 }}>${hover.price?.toFixed(2)}</div>
            <div style={{ color: hover.changePercent >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: 600 }}>
              {hover.changePercent >= 0 ? '+' : ''}{hover.changePercent.toFixed(2)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
