const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

const hits = new Map<string, number[]>();

/** Einfacher In-Memory-Limiter pro IP, um versehentliche Kosten-Explosionen bei /api/generate zu vermeiden. */
export function checkRateLimit(key: string, max = MAX_REQUESTS_PER_WINDOW): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);

  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);
  return true;
}
