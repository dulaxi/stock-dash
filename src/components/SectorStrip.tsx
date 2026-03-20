import { useState, useEffect } from 'react';

interface SectorPerformance {
  sector: string;
  changePercent: number;
  stockCount: number;
}

interface SectorStripProps {
  market: string;
}

export default function SectorStrip({ market }: SectorStripProps) {
  const [sectors, setSectors] = useState<SectorPerformance[]>([]);

  useEffect(() => {
    fetch(`/api/sectors?market=${market}`)
      .then(r => r.json())
      .then(setSectors)
      .catch(() => setSectors([]));
  }, [market]);

  if (sectors.length === 0) return null;

  return (
    <div className="sector-strip">
      {sectors.map(s => (
        <span key={s.sector} className="sector-strip-item">
          <span className="sector-strip-name">{s.sector}</span>
          <span className={`sector-strip-change ${s.changePercent >= 0 ? 'up' : 'down'}`}>
            {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(1)}%
          </span>
        </span>
      ))}
    </div>
  );
}
