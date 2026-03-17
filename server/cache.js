const store = new Map();

// Returns { data, stale } or null (miss)
export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  return { data: entry.data, stale: age >= entry.ttl };
}

export function cacheSet(key, data, ttl = 3000) {
  store.set(key, { data, timestamp: Date.now(), ttl });
}
