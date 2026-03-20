import { useState, useEffect } from 'react';
import type { NewsItem } from '../types';

interface NewsStripProps {
  market: string;
  onSeeAll: () => void;
}

export default function NewsStrip({ market, onSeeAll }: NewsStripProps) {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    const m = market === 'all' ? 'nasdaq' : market;
    fetch(`/api/news/${m}`)
      .then(r => r.json())
      .then(data => setNews(data.slice(0, 5)))
      .catch(() => setNews([]));
  }, [market]);

  if (news.length === 0) return null;

  return (
    <div className="news-strip">
      <span className="panel-title" style={{ whiteSpace: 'nowrap' }}>NEWS</span>
      <div className="news-strip-items">
        {news.map((n, i) => (
          <span key={i}>
            <a href={n.link} target="_blank" rel="noopener noreferrer" className="news-strip-link">
              {n.title}
            </a>
            {i < news.length - 1 && <span className="news-strip-divider">|</span>}
          </span>
        ))}
      </div>
      <button className="panel-see-all" onClick={onSeeAll} style={{ whiteSpace: 'nowrap' }}>See all &rarr;</button>
    </div>
  );
}
