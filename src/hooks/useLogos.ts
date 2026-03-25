import { useState, useEffect } from 'react';
import { getLogoUrl } from '../tickerDomains';

// Persistent logo cache in localStorage
const CACHE_KEY = 'xtox-logos';

function loadCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, string>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full — silently fail
  }
}

// In-memory cache for current session (avoids re-reading localStorage)
let memoryCache: Record<string, string> = loadCache();

// Track in-flight fetches to avoid duplicate requests
const pending = new Set<string>();

export function useLogos(symbols: string[]): Record<string, string> {
  const [logos, setLogos] = useState<Record<string, string>>(() => {
    // Return immediately available logos
    const initial: Record<string, string> = {};
    for (const sym of symbols) {
      if (memoryCache[sym]) initial[sym] = memoryCache[sym];
      else {
        const local = getLogoUrl(sym);
        if (local) initial[sym] = local;
      }
    }
    return initial;
  });

  useEffect(() => {
    const missing = symbols.filter(sym => !memoryCache[sym] && !getLogoUrl(sym) && !pending.has(sym));
    if (missing.length === 0) return;

    missing.forEach(sym => {
      pending.add(sym);
      fetch(`/api/profile/${sym}`)
        .then(r => r.json())
        .then(data => {
          if (data.logo) {
            memoryCache[sym] = data.logo;
            saveCache(memoryCache);
            setLogos(prev => ({ ...prev, [sym]: data.logo }));
          }
          pending.delete(sym);
        })
        .catch(() => pending.delete(sym));
    });
  }, [symbols.join(',')]);

  // Merge: memory cache > local getLogoUrl
  const result: Record<string, string> = {};
  for (const sym of symbols) {
    if (memoryCache[sym]) result[sym] = memoryCache[sym];
    else {
      const local = getLogoUrl(sym);
      if (local) result[sym] = local;
    }
  }
  // Include any freshly fetched logos
  return { ...result, ...logos };
}

// Get a single logo synchronously (from cache only)
export function getCachedLogo(symbol: string): string | null {
  return memoryCache[symbol] || getLogoUrl(symbol) || null;
}
