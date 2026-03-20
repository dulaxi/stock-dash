import { useState, useEffect } from 'react';
import type { NewsItem } from '../types';
import './NewsView.css';

interface NewsViewProps {
  market: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NewsView({ market }: NewsViewProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const m = market === 'all' ? 'nasdaq' : market;
    fetch(`/api/news/${m}`)
      .then(r => r.json())
      .then(data => {
        setNews(data);
        setLoading(false);
      })
      .catch(() => {
        setNews([]);
        setLoading(false);
      });
  }, [market]);

  if (loading) {
    return (
      <div className="news-view">
        <div className="news-view-loading">Loading news...</div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="news-view">
        <div className="news-view-empty">No news available</div>
      </div>
    );
  }

  return (
    <div className="news-view">
      <h3 className="news-view-title">Latest News</h3>
      <div className="news-view-list">
        {news.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="news-card"
          >
            {item.thumbnail && (
              <img
                className="news-card-thumbnail"
                src={item.thumbnail}
                alt=""
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="news-card-body">
              <div className="news-card-headline">{item.title}</div>
              <div className="news-card-meta">
                <span className="news-card-publisher">{item.publisher}</span>
                <span className="news-card-dot" />
                <span>{timeAgo(item.providerPublishTime)}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
