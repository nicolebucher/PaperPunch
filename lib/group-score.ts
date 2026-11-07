import type { GameData } from "@/types/generation";

// Ergebnis einer Lerngruppen-Runde serverseitig festlegen (Security-Review M5). Früher galten pct/correct/total
// so, wie der Browser sie schickte – mit einem selbst gebauten Request ließ sich jede Rangliste mit 100 % füllen.
// Jetzt:
//   - total = Anzahl Fragen im Spiel der Gruppe (liegt auf dem Server),
//   - mit Antworten pro Frage: Multiple Choice prüft der Server selbst (gegebene Option = richtige Option),
//     Lückentext übernimmt er vom Browser (dort kann auch die KI-Prüfung "richtig" gesagt haben),
//     jede Frage zählt höchstens einmal, unbekannte Fragen gar nicht,
//   - ohne Antworten (ältere App): die geschickte Zahl, aber höchstens total,
//   - pct wird immer daraus berechnet.

export interface SubmittedAnswer {
  l: number;
  i: number;
  ok: boolean;
  a?: string;
}

export interface Score {
  correct: number;
  total: number;
  pct: number;
  /** Antworten in der gespeicherten Form, mit dem vom Server festgelegten "richtig". */
  answers: SubmittedAnswer[];
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

export function scoreGroupResult(game: GameData, submitted: { correct: number; answers?: SubmittedAnswer[] }): Score {
  const byKey = new Map<string, GameData["levels"][number]["questions"][number]>(game.levels.flatMap((level) => level.questions.map((q, i) => [`${level.id}:${i}`, q] as const)));
  const total = Math.max(1, byKey.size);
  const answers: SubmittedAnswer[] = [];
  if (submitted.answers?.length) {
    const seen = new Set<string>();
    for (const x of submitted.answers.slice(0, 200)) {
      const key = `${Math.round(x.l)}:${Math.round(x.i)}`;
      const q = byKey.get(key);
      if (!q || seen.has(key)) continue;
      seen.add(key);
      const given = x.a ?? "";
      const ok =
        q.type === "multiple-choice"
          ? norm(given) !== "" && norm(given) === norm(q.options?.[q.correctIndex ?? -1] ?? "\u0000")
          : !!x.ok;
      answers.push({ l: Math.round(x.l), i: Math.round(x.i), ok, a: given });
    }
    const correct = answers.filter((x) => x.ok).length;
    return { correct, total, pct: Math.round((correct / total) * 100), answers };
  }
  const correct = Math.max(0, Math.min(total, Math.round(submitted.correct)));
  return { correct, total, pct: Math.round((correct / total) * 100), answers };
}
