// Blitzrunde – identisch in mobile/src/blitz.ts (bei Änderungen beide anpassen).
// Blitzrunde: 60 Sekunden, so viele Fragen wie möglich. Fragen kommen aus allen Leveln des Spiels und werden in
// schnelle Formen gebracht: Multiple Choice, Richtig/Falsch (aus einer Auswahlfrage: stimmt diese Antwort?),
// Zuordnen (max. 4 Paare) und kurze Lücken (höchstens 2 Wörter). Kein zweiter Versuch, kein Combo-Bonus.
// Website und App nutzen dieselbe Logik (lib/blitz.ts = mobile/src/blitz.ts ab Zeile 2).

export const BLITZ_SECONDS = 60;
/** Punches je richtiger Antwort in der Blitzrunde */
export const BLITZ_PUNCHES = 3;

export interface BlitzSource {
  type: string;
  prompt: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  acceptedAnswers?: string[];
  pairs?: { left: string; right: string }[];
  explanation?: string;
}

export type BlitzItem =
  | { kind: "mc"; src: BlitzSource; prompt: string; options: string[]; answer: string }
  | { kind: "tf"; src: BlitzSource; prompt: string; candidate: string; truth: boolean; answer: string }
  | { kind: "match"; src: BlitzSource; prompt: string; pairs: { left: string; right: string }[] }
  | { kind: "gap"; src: BlitzSource; prompt: string; answer: string; accepted: string[] };

const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

/** Kurze Lücke: höchstens 2 Wörter und 18 Zeichen – längeres Tippen passt nicht in eine Zeitrunde. */
export function isShortGap(answer: string | undefined): boolean {
  const a = (answer ?? "").trim();
  return a !== "" && a.length <= 18 && a.split(/\s+/).length <= 2;
}

/** Gemischter Stapel für eine Blitzrunde (jede Runde neu gemischt). */
export function buildBlitzDeck(questions: BlitzSource[]): BlitzItem[] {
  const seen = new Set<string>();
  const items: BlitzItem[] = [];
  let mcCount = 0;
  for (const q of shuffle(questions)) {
    if (seen.has(q.prompt)) continue;
    seen.add(q.prompt);
    if (q.type === "multiple-choice" && q.options && q.correctIndex !== undefined && q.options[q.correctIndex]) {
      const answer = q.options[q.correctIndex];
      // jede dritte Auswahlfrage als Richtig/Falsch – die Hälfte davon mit einer falschen Antwort
      if (mcCount++ % 3 === 2) {
        const wrong = q.options.filter((o, i) => i !== q.correctIndex && o.trim().toLowerCase() !== answer.trim().toLowerCase());
        const truth = wrong.length === 0 || Math.random() < 0.5;
        items.push({ kind: "tf", src: q, prompt: q.prompt, candidate: truth ? answer : wrong[Math.floor(Math.random() * wrong.length)], truth, answer });
      } else {
        items.push({ kind: "mc", src: q, prompt: q.prompt, options: shuffle(q.options), answer });
      }
    } else if (q.type === "zuordnen" && (q.pairs?.length ?? 0) >= 2) {
      items.push({ kind: "match", src: q, prompt: q.prompt, pairs: shuffle(q.pairs ?? []).slice(0, 4) });
    } else if (q.type === "lueckentext" && q.prompt.includes("___") && isShortGap(q.correctAnswer)) {
      items.push({ kind: "gap", src: q, prompt: q.prompt, answer: q.correctAnswer ?? "", accepted: q.acceptedAnswers ?? [] });
    }
  }
  return items;
}

/** Bestwert je Spiel (nur auf diesem Gerät). */
export function blitzRecord(gameKey: string): number {
  try {
    return Number(localStorage.getItem(`paperpunch-blitz:${gameKey}`)) || 0;
  } catch {
    return 0;
  }
}
export function saveBlitzRecord(gameKey: string, value: number): void {
  try {
    localStorage.setItem(`paperpunch-blitz:${gameKey}`, String(value));
  } catch {
    // ohne Speicher kein Rekord
  }
}
