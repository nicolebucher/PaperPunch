import { createHash } from "node:crypto";

// Wochen-Kontingent für das Erstellen von Material (Beta: 10 pro Woche, ab Montag 0 Uhr Berliner Zeit neu).
// Gezählt pro Gerät (zufällige ID aus App/Browser, nur als Hash gespeichert); ohne Geräte-ID pro IP.
// Speicher: Upstash Redis (Vercel Marketplace) über die REST-API – ohne Verbindung wird nichts begrenzt.
// Fehler beim Speicher lassen die Anfrage durch (lieber zu großzügig als Nutzer:innen aussperren).

export const QUOTA_LIMIT = Math.max(1, Number(process.env.QUOTA_PER_WEEK) || 10);

const REDIS_URL = () => process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = () => process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export function quotaEnabled(): boolean {
  return !!REDIS_URL() && !!REDIS_TOKEN();
}

export interface QuotaState {
  enforced: boolean;
  limit: number;
  used: number;
  remaining: number;
  /** Montag der aktuellen Woche (YYYY-MM-DD, Berlin) */
  week: string;
}

/** Montag der laufenden Woche in Berliner Zeit, z. B. "2026-11-02". */
export function weekKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  const d = new Date(Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day"))));
  d.setUTCDate(d.getUTCDate() - Math.max(0, dow));
  return d.toISOString().slice(0, 10);
}

/** Schlüssel für Gerät bzw. IP – nur gehasht, damit keine Roh-IDs gespeichert werden. */
export function quotaSubject(device: unknown, ip: string): string {
  const id = typeof device === "string" && /^[\w-]{8,64}$/.test(device) ? `d:${device}` : `ip:${ip.split(",")[0].trim()}`;
  return createHash("sha256").update(`pp-quota:${id}`).digest("hex").slice(0, 24);
}

export async function redis(commands: (string | number)[][]): Promise<unknown[] | null> {
  const url = REDIS_URL();
  const token = REDIS_TOKEN();
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { result?: unknown; error?: string }[];
    return json.map((r) => r.result);
  } catch (error) {
    console.error("[quota] redis failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

function state(used: number, enforced: boolean, week: string): QuotaState {
  return { enforced, limit: QUOTA_LIMIT, used, remaining: Math.max(0, QUOTA_LIMIT - used), week };
}

export async function getQuota(subject: string): Promise<QuotaState> {
  const week = weekKey();
  if (!quotaEnabled()) return state(0, false, week);
  const r = await redis([["GET", `quota:${week}:${subject}`]]);
  if (!r) return state(0, false, week);
  return state(Number(r[0] ?? 0) || 0, true, week);
}

/**
 * Platz im Kontingent VOR dem Erstellen reservieren (atomar per INCR): Parallele Anfragen können das Limit
 * so nicht überholen. Liegt der Zähler danach über dem Limit, wird sofort zurückgegeben. Schlägt das Erstellen
 * fehl, gibt releaseCreation den Platz wieder frei. Ohne Speicher: nicht begrenzt (wie bisher).
 */
export async function reserveCreation(subject: string): Promise<{ ok: boolean; reserved: boolean; state: QuotaState }> {
  const week = weekKey();
  if (!quotaEnabled()) return { ok: true, reserved: false, state: state(0, false, week) };
  const key = `quota:${week}:${subject}`;
  const r = await redis([["INCR", key], ["EXPIRE", key, 8 * 86400]]);
  if (!r) return { ok: true, reserved: false, state: state(0, false, week) };
  const used = Number(r[0] ?? 0) || 0;
  if (used > QUOTA_LIMIT) {
    await redis([["DECR", key]]);
    return { ok: false, reserved: false, state: state(QUOTA_LIMIT, true, week) };
  }
  return { ok: true, reserved: true, state: state(used, true, week) };
}

/** Reservierten Platz zurückgeben (Erstellen fehlgeschlagen). */
export async function releaseCreation(subject: string): Promise<void> {
  if (!quotaEnabled()) return;
  await redis([["DECR", `quota:${weekKey()}:${subject}`]]);
}

/** Anonymer Tageszähler (z. B. Cookie-Banner: angezeigt/akzeptiert/abgelehnt) – keine Kennung, nur Summen. */
export async function bumpCounter(name: string, ttlDays = 120): Promise<void> {
  if (!quotaEnabled()) return;
  const key = `stat:${name}`;
  await redis([["INCR", key], ["EXPIRE", key, ttlDays * 86400]]);
}

/** Berliner Kalendertag als YYYY-MM-DD. */
export function berlinDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
