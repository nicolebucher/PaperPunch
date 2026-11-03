// Punches & Level im Web – wie in der App, aber nur im Browser gespeichert (kein Konto).
// Stufen und Namen identisch zu mobile/src/punches.ts.

const KEY = "paperpunch-web-punches";
export const PUNCHES_EVENT = "paperpunch-punches";

/** Punches für eine richtig gelöste Aufgabe beim Online-Lösen (wie "sheetAnswer" in der App). */
export const SHEET_ANSWER_PUNCHES = 10;

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

export function addPunches(amount: number): void {
  if (!(amount > 0)) return;
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
