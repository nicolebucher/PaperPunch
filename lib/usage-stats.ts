import { createHash } from "node:crypto";
import { berlinDay, quotaEnabled, redis, weekKey } from "@/lib/quota";

// Echte Nutzungs- und Kostenzahlen fürs Kosten-Dashboard (Upstash Redis, nur Summen, keine Inhalte):
// - jede Claude-Anfrage: Tokens und Kosten in Mikro-US-Dollar, nach Art des Aufrufs (toolName)
// - jedes erstellte Material: Anzahl nach Format
// - aktive Ersteller:innen: eindeutige Geräte pro Tag/Monat als HyperLogLog (gehashte Kennung, nicht umkehrbar)
// Schlüssel verfallen nach 400 Tagen. Fehler werden geschluckt – Statistik darf nie eine Anfrage stören.

const TTL = 400 * 86400;

// US-Dollar pro 1 Mio. Tokens (Stand Nov. 2026)
const PRICES: { match: RegExp; in: number; out: number }[] = [
  { match: /haiku/i, in: 0.1, out: 0.5 },
  { match: /opus/i, in: 5, out: 25 },
  { match: /sonnet/i, in: 2, out: 10 },
];

export function priceFor(model: string): { in: number; out: number } {
  return PRICES.find((p) => p.match.test(model)) ?? { in: 2, out: 10 };
}

const month = (day: string) => day.slice(0, 7);

/** Nach jeder Claude-Antwort aufrufen. */
export async function recordAiUsage(model: string, kind: string, inputTokens: number, outputTokens: number): Promise<void> {
  if (!quotaEnabled()) return;
  try {
    const p = priceFor(model);
    const micro = Math.round(((inputTokens * p.in + outputTokens * p.out) / 1e6) * 1e6);
    const day = berlinDay();
    const k = kind.slice(0, 40);
    await redis([
      ["HINCRBY", `stat:ai:${day}`, `usd_micro:${k}`, micro],
      ["HINCRBY", `stat:ai:${day}`, `calls:${k}`, 1],
      ["HINCRBY", `stat:ai:${day}`, "in", inputTokens],
      ["HINCRBY", `stat:ai:${day}`, "out", outputTokens],
      ["HINCRBY", `stat:ai:${day}`, `model:${model.slice(0, 40)}`, micro],
      ["EXPIRE", `stat:ai:${day}`, TTL],
    ]);
  } catch {
    /* egal */
  }
}

/** Nach jedem erfolgreich erstellten Material (subject = gehashte Geräte-/IP-Kennung aus quotaSubject). */
export async function recordCreation(subject: string, format: string, src: "web" | "app" = "web"): Promise<void> {
  if (!quotaEnabled()) return;
  try {
    const day = berlinDay();
    const week = weekKey();
    await redis([
      // Kontingent-Woche nach Quelle (seit v0.19.0): eindeutige Geräte und Anzahl Materialien
      ["PFADD", `stat:quota:${src}:${week}`, subject],
      ["EXPIRE", `stat:quota:${src}:${week}`, 30 * 86400],
      ["HINCRBY", `stat:quotac:${week}`, src, 1],
      ["EXPIRE", `stat:quotac:${week}`, 30 * 86400],
      ["HINCRBY", `stat:gen:${day}`, format.slice(0, 30), 1],
      ["EXPIRE", `stat:gen:${day}`, TTL],
      ["PFADD", `stat:creators:${day}`, subject],
      ["EXPIRE", `stat:creators:${day}`, TTL],
      ["PFADD", `stat:creators:m:${month(day)}`, subject],
      ["EXPIRE", `stat:creators:m:${month(day)}`, TTL],
    ]);
  } catch {
    /* egal */
  }
}

// Besuchsdauer und Absprünge (Website und App), ohne Kennung und ohne Cookie: der Browser bzw. die App
// schickt beim Verlassen einmal {Seiten/Screens, Sekunden}; gespeichert werden nur Tagessummen.
// Absprung = Besuch mit nur einer Seite (App: nur der Startscreen). Sekunden pro Besuch gedeckelt (1 h).
export const DURATION_BUCKETS = [10, 30, 60, 180, 600] as const; // Obergrenzen in Sekunden, darüber "600+"

export function durationBucket(sec: number): string {
  const b = DURATION_BUCKETS.find((x) => sec < x);
  return b === undefined ? "600+" : `<${b}`;
}

// Eindeutige Nutzer:innen je Quelle (seit v0.17.0): Website und App schicken die zufällige Geräte-ID mit, die es
// fürs Kontingent ohnehin gibt. Gespeichert wird nur ein eigener, nicht umkehrbarer Hash davon in HyperLogLogs
// (stat:users:<src>:<Tag> und stat:users:<src>:m:<Monat>) – daraus lässt sich nur die Anzahl lesen, keine Kennung.
// Über mehrere Tage zählt PFCOUNT die Vereinigung, also echte eindeutige Geräte für 7/30/90 Tage.
const DEVICE_RE = /^[\w-]{8,64}$/;

export function userSubject(device: unknown): string | null {
  if (typeof device !== "string" || !DEVICE_RE.test(device)) return null;
  return createHash("sha256").update(`pp-users:${device}`).digest("hex").slice(0, 24);
}

// Push-Statistik und Rückkehrquote (seit v0.18.0): Die App meldet mit dem Besuch, ob Lernplan-Erinnerungen an sind
// (rem) und wie viele seit der letzten Meldung zugestellt/angetippt wurden. Für die Rückkehrquote führt der Server pro
// gehashtem Gerät einen kleinen Datensatz dev:<src>:<hash> {first, rem, remEver, d:<Tag>…} (nur Aktivtage, 400 Tage).
export interface VisitExtra {
  rem?: boolean;
  delivered?: number;
  tapped?: number;
}

export async function recordVisit(src: "web" | "app", pages: number, seconds: number, user: string | null = null, extra: VisitExtra = {}): Promise<void> {
  if (!quotaEnabled()) return;
  try {
    const day = berlinDay();
    const key = `stat:visit:${day}`;
    const p = Math.max(1, Math.min(200, Math.round(pages)));
    const sec = Math.max(0, Math.min(3600, Math.round(seconds)));
    const cmds: (string | number)[][] = [
      ["HINCRBY", key, `${src}:visits`, 1],
      ["HINCRBY", key, `${src}:bounces`, p <= 1 ? 1 : 0],
      ["HINCRBY", key, `${src}:pages`, p],
      ["HINCRBY", key, `${src}:sec`, sec],
      ["HINCRBY", key, `${src}:d:${durationBucket(sec)}`, 1],
      ["EXPIRE", key, TTL],
    ];
    if (user) {
      cmds.push(
        ["PFADD", `stat:users:${src}:${day}`, user],
        ["EXPIRE", `stat:users:${src}:${day}`, TTL],
        ["PFADD", `stat:users:${src}:m:${month(day)}`, user],
        ["EXPIRE", `stat:users:${src}:m:${month(day)}`, TTL],
      );
      const dev = `dev:${src}:${user}`;
      cmds.push(["HSETNX", dev, "first", day], ["HSET", dev, `d:${day}`, 1]);
      if (src === "app") {
        cmds.push(["HSET", dev, "rem", extra.rem ? 1 : 0]);
        if (extra.rem) {
          cmds.push(
            ["HSET", dev, "remEver", 1],
            ["PFADD", `stat:users:app:rem:${day}`, user],
            ["EXPIRE", `stat:users:app:rem:${day}`, TTL],
            ["PFADD", `stat:users:app:rem:m:${month(day)}`, user],
            ["EXPIRE", `stat:users:app:rem:m:${month(day)}`, TTL],
          );
        }
      }
      cmds.push(["EXPIRE", dev, TTL]);
    }
    const delivered = Math.max(0, Math.min(500, Math.round(extra.delivered ?? 0)));
    const tapped = Math.max(0, Math.min(500, Math.round(extra.tapped ?? 0)));
    if (src === "app" && (delivered || tapped)) {
      cmds.push(["HINCRBY", `stat:push:${day}`, "delivered", delivered], ["HINCRBY", `stat:push:${day}`, "tapped", tapped], ["EXPIRE", `stat:push:${day}`, TTL]);
    }
    await redis(cmds);
  } catch {
    /* egal */
  }
}

export interface VisitStats {
  visits: number;
  bounces: number;
  pages: number;
  sec: number;
  /** Anzahl Besuche je Dauer-Klasse ("<10", "<30", "<60", "<180", "<600", "600+") */
  dur: Record<string, number>;
}

function visitStats(h: Record<string, string>, src: string): VisitStats {
  const n = (k: string) => Number(h[`${src}:${k}`]) || 0;
  const dur: Record<string, number> = {};
  for (const b of [...DURATION_BUCKETS.map((x) => `<${x}`), "600+"]) dur[b] = n(`d:${b}`);
  return { visits: n("visits"), bounces: n("bounces"), pages: n("pages"), sec: n("sec"), dur };
}

// Drucken vs. online lösen (Website und App), ohne Kennung: pro Tag nur Zähler je Quelle, Aktion und Format.
// print = PDF angesehen, heruntergeladen, gedruckt oder geteilt; online = online gelöst bzw. gespielt (gestartet).
export type UseAction = "print" | "online";

export async function recordUse(src: "web" | "app", action: UseAction, format: string): Promise<void> {
  if (!quotaEnabled()) return;
  try {
    const key = `stat:use:${berlinDay()}`;
    await redis([["HINCRBY", key, `${src}:${action}:${format.slice(0, 20)}`, 1], ["EXPIRE", key, TTL]]);
  } catch {
    /* egal */
  }
}

export interface DayStats {
  day: string;
  aiUsd: number;
  aiCalls: number;
  tokensIn: number;
  tokensOut: number;
  aiByKind: Record<string, { usd: number; calls: number }>;
  aiByModel: Record<string, number>;
  generated: Record<string, number>;
  creators: number;
  consent: { shown: number; granted: number; denied: number };
  /** Besuche Website/App (gibt es seit 5. Nov. 2026) */
  visits: { web: VisitStats; app: VisitStats };
  /** Drucken vs. online: z. B. "web:print:worksheet" → Anzahl (gibt es seit 5. Nov. 2026 abends) */
  use: Record<string, number>;
  /** Eindeutige Geräte mit mindestens einem Besuch an diesem Tag, je Quelle (gibt es seit 6. Nov. 2026) */
  users: { web: number; app: number };
  /** Lernplan-Erinnerungen (App): zugestellt, angetippt, Geräte mit Erinnerungen an (gibt es seit v0.18.0) */
  push: { delivered: number; tapped: number; remDevices: number };
}

/** Rückkehrquote je Kohorte (Woche des ersten Besuchs, Montag) und Gruppe; eN = Geräte, deren N-Tage-Fenster
 *  vorbei ist, bN = davon an mindestens einem der N Tage nach dem ersten Besuch wieder da. */
export interface RetentionRow {
  cohort: string;
  group: "web" | "app_reminders" | "app_no_reminders";
  size: number;
  e1: number;
  b1: number;
  e7: number;
  b7: number;
  e30: number;
  b30: number;
}

const addDaysIso = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const mondayOf = (day: string) => addDaysIso(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));

async function readRetention(today: string): Promise<RetentionRow[]> {
  const keys = (await redis([["KEYS", "dev:*"]]))?.[0];
  const list = Array.isArray(keys) ? (keys as string[]).slice(0, 5000) : [];
  if (!list.length) return [];
  const r = await redis(list.map((k) => ["HGETALL", k]));
  if (!r) return [];
  const yesterday = addDaysIso(today, -1);
  const rows = new Map<string, RetentionRow>();
  list.forEach((key, i) => {
    const h = toObj(r[i]);
    const first = h.first;
    if (!first) return;
    const src = key.split(":")[1];
    const group: RetentionRow["group"] = src === "web" ? "web" : h.remEver === "1" ? "app_reminders" : "app_no_reminders";
    const cohort = mondayOf(first);
    const id = `${cohort}|${group}`;
    const row = rows.get(id) ?? { cohort, group, size: 0, e1: 0, b1: 0, e7: 0, b7: 0, e30: 0, b30: 0 };
    row.size += 1;
    const days = Object.keys(h).filter((k) => k.startsWith("d:")).map((k) => k.slice(2));
    for (const n of [1, 7, 30] as const) {
      const last = addDaysIso(first, n);
      if (last > yesterday) continue;
      row[`e${n}`] += 1;
      if (days.some((d) => d > first && d <= last)) row[`b${n}`] += 1;
    }
    rows.set(id, row);
  });
  return [...rows.values()].sort((a, b) => a.cohort.localeCompare(b.cohort) || a.group.localeCompare(b.group));
}

export interface UserRange {
  /** Anzahl Tage bis heute (7, 30, 90) bzw. das ganze abgefragte Fenster */
  days: number;
  /** eindeutige Geräte mit mindestens einem Besuch, je Quelle */
  web: number;
  app: number;
  /** eindeutige Geräte, die etwas erstellt haben (Website + App) */
  creators: number;
  /** eindeutige App-Geräte mit Lernplan-Erinnerungen an */
  remDevices: number;
}

function lastDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(berlinDay(new Date(Date.now() - i * 86400000)));
  return [...new Set(out)];
}

const toObj = (arr: unknown): Record<string, string> => {
  const o: Record<string, string> = {};
  if (Array.isArray(arr)) for (let i = 0; i + 1 < arr.length; i += 2) o[String(arr[i])] = String(arr[i + 1]);
  return o;
};

/** Kontingent dieser Woche: wie viele Geräte wie viele Materialien erstellt haben (gibt es seit 4. Nov. 2026). */
interface WeekQuota {
  week: string;
  devices: number;
  creations: number;
  /** nach Quelle, gezählt seit v0.19.0 (6. Nov. 2026) */
  split: { devicesWeb: number; devicesApp: number; creationsWeb: number; creationsApp: number };
}

async function weekQuota(): Promise<WeekQuota> {
  const week = weekKey();
  const r0 = await redis([["KEYS", `quota:${week}:*`], ["PFCOUNT", `stat:quota:web:${week}`], ["PFCOUNT", `stat:quota:app:${week}`], ["HGETALL", `stat:quotac:${week}`]]);
  const c = toObj(r0?.[3]);
  const split = { devicesWeb: Number(r0?.[1]) || 0, devicesApp: Number(r0?.[2]) || 0, creationsWeb: Number(c.web) || 0, creationsApp: Number(c.app) || 0 };
  const keys = r0?.[0];
  const list = Array.isArray(keys) ? (keys as string[]).slice(0, 2000) : [];
  if (!list.length) return { week, devices: 0, creations: 0, split };
  const vals = (await redis([["MGET", ...list]]))?.[0];
  const creations = Array.isArray(vals) ? vals.reduce((s: number, v) => s + (Number(v) || 0), 0) : 0;
  return { week, devices: list.length, creations, split };
}

export async function readStats(n: number): Promise<{ days: DayStats[]; months: { month: string; creators: number; users: { web: number; app: number }; remDevices: number }[]; userRanges: UserRange[]; retention: RetentionRow[]; week: WeekQuota } | null> {
  if (!quotaEnabled()) return null;
  const days = lastDays(Math.min(Math.max(n, 1), 120));
  const cmds: (string | number)[][] = [];
  for (const d of days) {
    cmds.push(["HGETALL", `stat:ai:${d}`], ["HGETALL", `stat:gen:${d}`], ["PFCOUNT", `stat:creators:${d}`]);
    cmds.push(["GET", `stat:consent:${d}:shown`], ["GET", `stat:consent:${d}:granted`], ["GET", `stat:consent:${d}:denied`]);
    cmds.push(["HGETALL", `stat:visit:${d}`], ["HGETALL", `stat:use:${d}`]);
    cmds.push(["PFCOUNT", `stat:users:web:${d}`], ["PFCOUNT", `stat:users:app:${d}`]);
    cmds.push(["HGETALL", `stat:push:${d}`], ["PFCOUNT", `stat:users:app:rem:${d}`]);
  }
  const months = [...new Set(days.map(month))];
  for (const m of months) cmds.push(["PFCOUNT", `stat:creators:m:${m}`], ["PFCOUNT", `stat:users:web:m:${m}`], ["PFCOUNT", `stat:users:app:m:${m}`], ["PFCOUNT", `stat:users:app:rem:m:${m}`]);
  // Eindeutige Geräte über mehrere Tage: PFCOUNT über mehrere Schlüssel zählt die Vereinigung
  const spans = [...new Set([7, 30, 90, days.length].filter((x) => x <= days.length))];
  for (const span of spans) {
    const last = days.slice(-span);
    cmds.push(["PFCOUNT", ...last.map((d) => `stat:users:web:${d}`)], ["PFCOUNT", ...last.map((d) => `stat:users:app:${d}`)]);
    cmds.push(["PFCOUNT", ...last.map((d) => `stat:creators:${d}`)]);
    cmds.push(["PFCOUNT", ...last.map((d) => `stat:users:app:rem:${d}`)]);
  }
  const r = await redis(cmds);
  if (!r) return null;
  const PER = 12;
  const out: DayStats[] = days.map((day, i) => {
    const ai = toObj(r[i * PER]);
    const gen = toObj(r[i * PER + 1]);
    const aiByKind: DayStats["aiByKind"] = {};
    const aiByModel: Record<string, number> = {};
    let usd = 0;
    let calls = 0;
    for (const [k, v] of Object.entries(ai)) {
      const num = Number(v) || 0;
      if (k.startsWith("usd_micro:")) {
        const kind = k.slice(10);
        (aiByKind[kind] ??= { usd: 0, calls: 0 }).usd += num / 1e6;
        usd += num / 1e6;
      } else if (k.startsWith("calls:")) {
        const kind = k.slice(6);
        (aiByKind[kind] ??= { usd: 0, calls: 0 }).calls += num;
        calls += num;
      } else if (k.startsWith("model:")) aiByModel[k.slice(6)] = num / 1e6;
    }
    return {
      day,
      aiUsd: Math.round(usd * 10000) / 10000,
      aiCalls: calls,
      tokensIn: Number(ai.in) || 0,
      tokensOut: Number(ai.out) || 0,
      aiByKind,
      aiByModel,
      generated: Object.fromEntries(Object.entries(gen).map(([k, v]) => [k, Number(v) || 0])),
      creators: Number(r[i * PER + 2]) || 0,
      consent: { shown: Number(r[i * PER + 3]) || 0, granted: Number(r[i * PER + 4]) || 0, denied: Number(r[i * PER + 5]) || 0 },
      visits: { web: visitStats(toObj(r[i * PER + 6]), "web"), app: visitStats(toObj(r[i * PER + 6]), "app") },
      use: Object.fromEntries(Object.entries(toObj(r[i * PER + 7])).map(([k, v]) => [k, Number(v) || 0])),
      users: { web: Number(r[i * PER + 8]) || 0, app: Number(r[i * PER + 9]) || 0 },
      push: (() => {
        const p = toObj(r[i * PER + 10]);
        return { delivered: Number(p.delivered) || 0, tapped: Number(p.tapped) || 0, remDevices: Number(r[i * PER + 11]) || 0 };
      })(),
    };
  });
  const base = days.length * PER;
  const monthStats = months.map((m, j) => ({
    month: m,
    creators: Number(r[base + j * 4]) || 0,
    users: { web: Number(r[base + j * 4 + 1]) || 0, app: Number(r[base + j * 4 + 2]) || 0 },
    remDevices: Number(r[base + j * 4 + 3]) || 0,
  }));
  const spanBase = base + months.length * 4;
  const userRanges = spans.map((span, j) => ({
    days: span,
    web: Number(r[spanBase + j * 4]) || 0,
    app: Number(r[spanBase + j * 4 + 1]) || 0,
    creators: Number(r[spanBase + j * 4 + 2]) || 0,
    remDevices: Number(r[spanBase + j * 4 + 3]) || 0,
  }));
  return { days: out, months: monthStats, userRanges, retention: await readRetention(berlinDay()), week: await weekQuota() };
}

// Herkunft nach Land (Website und App): beim Besuchsbericht liest der Server das Land aus dem Vercel-Header
// x-vercel-ip-country (zweistelliger Code). Gespeichert wird nur ein Tageszähler je Quelle und Land –
// keine IP-Adresse, keine Kennung (stat:country:<Tag>, Felder "web:DE", "app:AT" …).
export async function recordCountry(src: "web" | "app", country: string | null): Promise<void> {
  if (!quotaEnabled()) return;
  const cc = (country ?? "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return;
  try {
    const key = `stat:country:${berlinDay()}`;
    await redis([["HINCRBY", key, `${src}:${cc}`, 1], ["EXPIRE", key, TTL]]);
  } catch {
    /* egal */
  }
}

/** Besuche je Tag, Quelle und Land für die letzten `n` Tage (gibt es seit 6. Nov. 2026). */
export async function readCountries(n: number): Promise<{ day: string; src: string; country: string; visits: number }[]> {
  if (!quotaEnabled()) return [];
  const days: string[] = [];
  for (let i = Math.min(Math.max(n, 1), 120) - 1; i >= 0; i--) days.push(berlinDay(new Date(Date.now() - i * 86400000)));
  const uniq = [...new Set(days)];
  const r = await redis(uniq.map((d) => ["HGETALL", `stat:country:${d}`]));
  if (!r) return [];
  const out: { day: string; src: string; country: string; visits: number }[] = [];
  uniq.forEach((day, i) => {
    const arr = r[i];
    if (!Array.isArray(arr)) return;
    for (let j = 0; j + 1 < arr.length; j += 2) {
      const [src, country] = String(arr[j]).split(":");
      const visits = Number(arr[j + 1]) || 0;
      if (src && country && visits) out.push({ day, src, country, visits });
    }
  });
  return out;
}

// Weiterempfehlen (seit v0.30.0): Klicks auf "Weiterempfehlen"/"Einladen" (Website, App), Ankünfte über einen
// Einladungslink (?ref=, Website) und wie viele davon danach selbst etwas erstellen. Nur Tageszähler stat:share:<Tag>.
export type ShareKind = "click" | "arrive" | "create";

export async function recordShare(src: "web" | "app", kind: ShareKind): Promise<void> {
  if (!quotaEnabled()) return;
  try {
    const key = `stat:share:${berlinDay()}`;
    await redis([["HINCRBY", key, `${src}:${kind}`, 1], ["EXPIRE", key, TTL]]);
  } catch {
    /* egal */
  }
}

/** Weiterempfehlungen je Tag, Quelle und Art für die letzten `n` Tage. */
export async function readShares(n: number): Promise<{ day: string; src: string; kind: string; count: number }[]> {
  if (!quotaEnabled()) return [];
  const days: string[] = [];
  for (let i = Math.min(Math.max(n, 1), 120) - 1; i >= 0; i--) days.push(berlinDay(new Date(Date.now() - i * 86400000)));
  const uniq = [...new Set(days)];
  const r = await redis(uniq.map((d) => ["HGETALL", `stat:share:${d}`]));
  if (!r) return [];
  const out: { day: string; src: string; kind: string; count: number }[] = [];
  uniq.forEach((day, i) => {
    const arr = r[i];
    if (!Array.isArray(arr)) return;
    for (let j = 0; j + 1 < arr.length; j += 2) {
      const [src, kind] = String(arr[j]).split(":");
      const count = Number(arr[j + 1]) || 0;
      if (src && kind && count) out.push({ day, src, kind, count });
    }
  });
  return out;
}
