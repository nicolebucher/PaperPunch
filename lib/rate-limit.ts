import { createHash } from "node:crypto";
import { redis, quotaEnabled } from "@/lib/quota";

// Rate-Limit pro Schlüssel (meist "<route>:<IP>"). Gezählt wird in Upstash Redis, damit das Limit über alle
// Vercel-Instanzen hinweg gilt (ein Zähler im Arbeitsspeicher gilt nur für die eine Instanz, die gerade läuft).
// Ohne Redis-Verbindung oder bei einem Speicherfehler greift ersatzweise der Zähler im Arbeitsspeicher.

const MAX_REQUESTS_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function memoryLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // Speicher klein halten
  if (hits.size > 5000) for (const k of [...hits.keys()].slice(0, 1000)) hits.delete(k);
  return true;
}

/**
 * true = Anfrage erlaubt. Festes Zeitfenster (Standard 60 s); `windowSec` = 86400 ergibt ein Tageslimit.
 * In Redis steht der Schlüssel nur gehasht (keine IP im Klartext), der Eintrag verfällt mit dem Fenster.
 */
export async function checkRateLimit(key: string, max = MAX_REQUESTS_PER_WINDOW, windowSec = 60): Promise<boolean> {
  if (quotaEnabled()) {
    const bucket = Math.floor(Date.now() / 1000 / windowSec);
    const hashed = createHash("sha256").update(`pp-rl:${key}`).digest("hex").slice(0, 24);
    const redisKey = `rl:${windowSec}:${bucket}:${hashed}`;
    const r = await redis([["INCR", redisKey], ["EXPIRE", redisKey, windowSec + 5]]);
    if (r) return (Number(r[0]) || 0) <= max;
  }
  return memoryLimit(`${windowSec}:${key}`, max, windowSec * 1000);
}

/** Erste IP aus x-forwarded-for (auf Vercel vom Hoster gesetzt). */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
