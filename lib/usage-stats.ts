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
export async function recordCreation(subject: string, format: string): Promise<void> {
  if (!quotaEnabled()) return;
  try {
    const day = berlinDay();
    await redis([
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

/** Zahlen der letzten `n` Tage plus eindeutige Ersteller:innen pro Monat. */
/** Kontingent dieser Woche: wie viele Geräte wie viele Materialien erstellt haben (gibt es seit 4. Nov. 2026). */
async function weekQuota(): Promise<{ week: string; devices: number; creations: number }> {
  const week = weekKey();
  const keys = (await redis([["KEYS", `quota:${week}:*`]]))?.[0];
  const list = Array.isArray(keys) ? (keys as string[]).slice(0, 2000) : [];
  if (!list.length) return { week, devices: 0, creations: 0 };
  const vals = (await redis([["MGET", ...list]]))?.[0];
  const creations = Array.isArray(vals) ? vals.reduce((s: number, v) => s + (Number(v) || 0), 0) : 0;
  return { week, devices: list.length, creations };
}

export async function readStats(n: number): Promise<{ days: DayStats[]; months: { month: string; creators: number }[]; week: { week: string; devices: number; creations: number } } | null> {
  if (!quotaEnabled()) return null;
  const days = lastDays(Math.min(Math.max(n, 1), 120));
  const cmds: (string | number)[][] = [];
  for (const d of days) {
    cmds.push(["HGETALL", `stat:ai:${d}`], ["HGETALL", `stat:gen:${d}`], ["PFCOUNT", `stat:creators:${d}`]);
    cmds.push(["GET", `stat:consent:${d}:shown`], ["GET", `stat:consent:${d}:granted`], ["GET", `stat:consent:${d}:denied`]);
  }
  const months = [...new Set(days.map(month))];
  for (const m of months) cmds.push(["PFCOUNT", `stat:creators:m:${m}`]);
  const r = await redis(cmds);
  if (!r) return null;
  const out: DayStats[] = days.map((day, i) => {
    const ai = toObj(r[i * 6]);
    const gen = toObj(r[i * 6 + 1]);
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
      creators: Number(r[i * 6 + 2]) || 0,
      consent: { shown: Number(r[i * 6 + 3]) || 0, granted: Number(r[i * 6 + 4]) || 0, denied: Number(r[i * 6 + 5]) || 0 },
    };
  });
  const base = days.length * 6;
  return { days: out, months: months.map((m, j) => ({ month: m, creators: Number(r[base + j]) || 0 })), week: await weekQuota() };
}
