import { useState, useEffect, useRef } from 'react';
import type { Quote, IndexQuote, Market, PollingSpeed } from '../types';

interface PollingState {
  quotes: Quote[];
  indices: IndexQuote[];
  loading: boolean;
  switching: boolean;
  error: boolean;
}

export function usePolling(market: Market, speed: PollingSpeed): PollingState {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [indices, setIndices] = useState<IndexQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState(false);
  const failCount = useRef(0);
  const initialLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;
    if (quotes.length === 0) {
      setLoading(true);
    } else {
      setSwitching(true);
    }
    failCount.current = 0;
    setError(false);

    const fetchData = async () => {
      try {
        const [quotesRes, indicesRes] = await Promise.all([
          fetch(`/api/quotes/${market}`),
          fetch('/api/indices'),
        ]);

        if (!quotesRes.ok || !indicesRes.ok) throw new Error('Fetch failed');

        const [quotesData, indicesData] = await Promise.all([
          quotesRes.json(),
          indicesRes.json(),
        ]);

        if (cancelled) return;
        setQuotes(quotesData);
        setIndices(indicesData);
        setLoading(false);
        setSwitching(false);
        setError(false);
        failCount.current = 0;
        initialLoad.current = false;
      } catch {
        if (cancelled) return;
        failCount.current++;
        if (failCount.current >= 3) setError(true);
        if (initialLoad.current) {
          setTimeout(() => { if (!cancelled) fetchData(); }, 5000);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, speed);
    return () => { cancelled = true; clearInterval(interval); };
  }, [market, speed]);

  return { quotes, indices, loading, switching, error };
}
