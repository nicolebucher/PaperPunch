import { todayISO, addDays } from "./dates";
import type { Lang } from "./i18n";

// Punches: die App-Währung. Es gibt sie für richtige Antworten und erledigte Einheiten, nie fürs bloße
// Erstellen von Material. Alles liegt nur auf dem Gerät als kleines Protokoll (Datum, Quelle, Menge).

export type PunchSource = "answer" | "selfcheck" | "session" | "checkpoint" | "checkpointBonus" | "daily" | "boss" | "joker" | "invite";

export interface PunchEntry {
  date: string; // YYYY-MM-DD
  source: PunchSource;
  amount: number; // negativ bei Ausgaben (Joker)
  key?: string; // Material, aus dem die Punches stammen (für die Wiederholungsregel)
}

interface PunchState {
  log: PunchEntry[];
  // Wie oft ein Material schon abgeschlossen wurde: 1. Mal voll, 2. Mal halb, danach nichts.
  plays: Record<string, number>;
}

const KEY = "paperpunch-punches";
const MAX_LOG = 400;

export const POINTS = {
  answer: { leicht: 10, mittel: 15, schwer: 20 } as Record<string, number>,
  sheetAnswer: 10,
  selfcheck: 5,
  session: 25,
  checkpoint: 50,
  checkpointBonus: 25,
  daily: 10,
  boss: 1.5, // Faktor für Boss-Fragen (vorher 2 – ein Spiel brachte sonst ~950 Punches)
  joker5050: 30,
  jokerSkip: 40,
  invite: 50, // einmalig fürs erste Einladen
};

export const LEVELS: { at: number; name: Record<Lang, string> }[] = [
  { at: 0, name: { de: "Rookie", en: "Rookie" } },
  { at: 100, name: { de: "Starter", en: "Starter" } },
  { at: 250, name: { de: "Grinder", en: "Grinder" } },
  { at: 500, name: { de: "Streak Master", en: "Streak Master" } },
  { at: 900, name: { de: "Brainiac", en: "Brainiac" } },
  { at: 1400, name: { de: "Pro", en: "Pro" } },
  { at: 2000, name: { de: "Elite", en: "Elite" } },
  { at: 2800, name: { de: "Mastermind", en: "Mastermind" } },
  { at: 3800, name: { de: "Legend", en: "Legend" } },
  { at: 5000, name: { de: "Unstoppable", en: "Unstoppable" } },
];

function load(): PunchState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as PunchState;
  } catch {
    // ohne Speicher starten
  }
  return { log: [], plays: {} };
}

function save(state: PunchState) {
  try {
    // Ältere Einträge zusammenfassen, damit der Speicher klein bleibt – die Summe bleibt erhalten.
    if (state.log.length > MAX_LOG) {
      const old = state.log.slice(0, state.log.length - MAX_LOG);
      const carried = old.reduce((s, e) => s + e.amount, 0);
      state.log = [{ date: old[old.length - 1].date, source: "answer", amount: carried, key: "archive" }, ...state.log.slice(-MAX_LOG)];
    }
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Speicher voll oder gesperrt
  }
}

export function totalPunches(state = load()): number {
  return Math.max(0, state.log.reduce((s, e) => s + e.amount, 0));
}

export function levelFor(total: number) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (total >= LEVELS[i].at) index = i;
  const current = LEVELS[index];
  const next = LEVELS[index + 1];
  const progress = next ? (total - current.at) / (next.at - current.at) : 1;
  return { index, number: index + 1, current, next, progress, toNext: next ? next.at - total : 0 };
}

export function weekPunches(): number {
  const since = addDays(todayISO(), -6);
  return load().log.filter((e) => e.date >= since && e.amount > 0).reduce((s, e) => s + e.amount, 0);
}

/**
 * Serie: Tage in Folge, an denen Punches dazukamen. Zählt bis heute – oder bis gestern, solange heute noch nichts gemacht wurde
 * (die Serie reißt erst, wenn ein ganzer Tag ohne Lernen vorbei ist). Punches gehen dabei nie verloren.
 */
export function streakDays(): number {
  const days = new Set(load().log.filter((e) => e.amount > 0 && e.key !== "archive").map((e) => e.date));
  let d = todayISO();
  if (!days.has(d)) d = addDays(d, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** true, wenn heute schon gelernt wurde (Serie für heute gesichert). */
export function learnedToday(): boolean {
  const today = todayISO();
  return load().log.some((e) => e.date === today && e.amount > 0);
}

export function recentEntries(n = 12): PunchEntry[] {
  return load().log.filter((e) => e.key !== "archive").slice(-n).reverse();
}

/** Faktor nach der Wiederholungsregel: 1. Abschluss voll, 2. halb, danach 0. */
export function repeatFactor(key: string): number {
  const plays = load().plays[key] ?? 0;
  return plays === 0 ? 1 : plays === 1 ? 0.5 : 0;
}

export interface RewardLine {
  source: PunchSource;
  amount: number;
}

export interface Reward {
  lines: RewardLine[];
  total: number;
  before: number;
  after: number;
  levelUp: boolean;
}

/**
 * Bucht Punches für einen abgeschlossenen Durchgang. `lines` sind die verdienten Punches vor der
 * Wiederholungsregel; der Tagesbonus kommt bei der ersten Einheit des Tages dazu.
 */
export function awardRun(key: string, lines: RewardLine[], opts: { countsAsPlay?: boolean } = {}): Reward {
  const state = load();
  const before = totalPunches(state);
  const factor = key ? (state.plays[key] ?? 0) === 0 ? 1 : (state.plays[key] ?? 0) === 1 ? 0.5 : 0 : 1;
  const today = todayISO();
  const scaled = lines
    .map((l) => ({ ...l, amount: l.amount < 0 ? l.amount : Math.round(l.amount * factor) }))
    .filter((l) => l.amount !== 0);

  const earnedSomething = scaled.some((l) => l.amount > 0);
  const hadToday = state.log.some((e) => e.date === today && e.source === "daily");
  if (earnedSomething && !hadToday) scaled.push({ source: "daily", amount: POINTS.daily });

  for (const l of scaled) state.log.push({ date: today, source: l.source, amount: l.amount, key });
  if (key && opts.countsAsPlay !== false) state.plays[key] = (state.plays[key] ?? 0) + 1;
  save(state);

  const after = totalPunches(state);
  return {
    lines: scaled,
    total: scaled.reduce((s, l) => s + l.amount, 0),
    before,
    after,
    levelUp: levelFor(after).index > levelFor(before).index,
  };
}

/** Joker kaufen: zieht Punches ab, wenn genug da sind. */
export function spend(amount: number, key: string): boolean {
  const state = load();
  if (totalPunches(state) < amount) return false;
  state.log.push({ date: todayISO(), source: "joker", amount: -amount, key });
  save(state);
  return true;
}

/** Stabiler Schlüssel für ein Material (damit Wiederholungen erkannt werden). */
export function materialKey(kind: string, title: string, firstItem: string): string {
  const s = `${kind}|${title}|${firstItem}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `${kind}:${(h >>> 0).toString(36)}`;
}
