// Punches & Level im Web – wie in der App, aber nur im Browser gespeichert (kein Konto).
// Stufen und Namen identisch zu mobile/src/punches.ts.

const KEY = "paperpunch-web-punches";
export const PUNCHES_EVENT = "paperpunch-punches";

/** Punches für eine richtig gelöste Aufgabe beim Online-Lösen (wie "sheetAnswer" in der App). */
export const SHEET_ANSWER_PUNCHES = 10;

/** Joker 50:50 im Lernspiel – kostet so viel wie in der App. */
export const JOKER_PUNCHES = 30;

export const LEVELS = [
  { min: 0, name: "Rookie" },
  { min: 100, name: "Starter" },
  { min: 250, name: "Grinder" },
  { min: 500, name: "Streak Master" },
  { min: 900, name: "Brainiac" },
  { min: 1400, name: "Pro" },
  { min: 2000, name: "Elite" },
  { min: 2800, name: "Mastermind" },
  { min: 3800, name: "Legend" },
  { min: 5000, name: "Unstoppable" },
] as const;

export function totalPunches(): number {
  try {
    const n = Number(localStorage.getItem(KEY) ?? "0");
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

const DAYS_KEY = "paperpunch-web-days";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function activeDays(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DAYS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/** Serie: Tage in Folge mit Punches – bis heute oder, solange heute noch nichts war, bis gestern (wie in der App). */
export function streakDays(): number {
  const days = new Set(activeDays());
  const d = new Date();
  if (!days.has(iso(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(iso(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function learnedToday(): boolean {
  return activeDays().includes(iso(new Date()));
}

export function addPunches(amount: number): void {
  if (!(amount > 0)) return;
  try {
    const today = iso(new Date());
    const days = activeDays();
    if (!days.includes(today)) localStorage.setItem(DAYS_KEY, JSON.stringify([...days, today].slice(-120)));
  } catch {
    // ohne Speicher keine Serie
  }
  const next = totalPunches() + Math.round(amount);
  try {
    localStorage.setItem(KEY, String(next));
  } catch {
    // ohne Speicher zählen die Punches nur bis zum Neuladen nicht mit
  }
  try {
    window.dispatchEvent(new CustomEvent(PUNCHES_EVENT, { detail: { total: next, added: amount } }));
  } catch {
    // ignorieren
  }
}

/** Punches ausgeben (Joker). Gibt false zurück, wenn nicht genug da sind. */
export function spendPunches(amount: number): boolean {
  const total = totalPunches();
  if (total < amount) return false;
  const next = total - amount;
  try {
    localStorage.setItem(KEY, String(next));
  } catch {
    return false;
  }
  try {
    window.dispatchEvent(new CustomEvent(PUNCHES_EVENT, { detail: { total: next, added: -amount } }));
  } catch {
    // ignorieren
  }
  return true;
}

export type LevelInfo = {
  number: number;
  name: string;
  /** Fortschritt zur nächsten Stufe, 0–1 (1 auf der höchsten Stufe). */
  progress: number;
  /** Punches bis zur nächsten Stufe, undefined auf der höchsten. */
  toNext?: number;
  nextName?: string;
};

export function levelFor(total: number): LevelInfo {
  let i = 0;
  while (i + 1 < LEVELS.length && total >= LEVELS[i + 1].min) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  if (!next) return { number: i + 1, name: cur.name, progress: 1 };
  return {
    number: i + 1,
    name: cur.name,
    progress: (total - cur.min) / (next.min - cur.min),
    toNext: next.min - total,
    nextName: next.name,
  };
}
