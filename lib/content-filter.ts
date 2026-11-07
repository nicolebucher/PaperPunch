import type { GameData } from "@/types/generation";

// Prüfung geteilter Lernspiele (Challenges, Lerngruppen), bevor sie unter paper-punch.com/c/… bzw. /g/…
// für alle mit dem Link sichtbar werden. Die Nutzer:innen sind oft minderjährig, und die Spiele kommen vom
// Gerät – sie könnten also auch von Hand gebaut sein. Deshalb:
//   1. Längen begrenzen (großzügig über dem, was die KI erzeugt),
//   2. keine Links in Spieltexten (Phishing, fremde Seiten),
//   3. eindeutige Beleidigungen/Slurs blockieren. Bewusst eine KURZE Liste: Begriffe wie "Hitler", "Penis"
//      oder "Sex" können in Geschichte oder Biologie vorkommen und bleiben erlaubt (anders als bei Spitznamen,
//      siehe lib/name-filter.ts).

export const LIMITS = { title: 200, prompt: 1000, option: 300, answer: 300, explanation: 1500 } as const;

// Wortanfänge, die in Schultexten nicht vorkommen …
const SLURS_START = [
  "fotze", "hurensohn", "wichser", "schwuchtel", "kanake", "judensau", "nutte",
  "fuck", "motherf", "cocksuck", "nigger", "nigga", "faggot", "killyourself",
];
// … und ganze Wörter, deren Anfang auch harmlos sein kann ("fickle" = launisch)
const SLURS_WORD = /^(fick(en|t|st|e|er|dich)?|kys)$/;

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|de|net|org|io|ru|xyz|link|ly|info|biz|app|gg|tk|top|click)(\/|\b))/i;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[0134578@$]/g, (c) => ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s" })[c] ?? c);
}

/** true, wenn der Text eine eindeutige Beleidigung enthält (Wortanfang, auch "f.u.c.k" / "f u c k"). */
export function containsSlur(text: string): boolean {
  const words = normalize(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  // einzeln getrennte Buchstaben zusammenziehen: "f u c k" → "fuck"
  const merged: string[] = [];
  let run = "";
  for (const w of words) {
    if (w.length === 1) run += w;
    else {
      if (run) merged.push(run);
      run = "";
      merged.push(w);
    }
  }
  if (run) merged.push(run);
  return merged.some((w) => SLURS_WORD.test(w) || SLURS_START.some((s) => w.startsWith(s)));
}

export function containsLink(text: string): boolean {
  return LINK.test(text);
}

export type ContentProblem = "too-long" | "link" | "offensive";

/** null = in Ordnung, sonst der erste gefundene Grund. */
export function checkSharedGame(game: GameData): ContentProblem | null {
  const texts: [string, number][] = [
    [game.gameTitle, LIMITS.title],
    [game.subject, LIMITS.title],
  ];
  const questions = [...game.levels.flatMap((l) => l.questions), ...(game.boss ?? [])];
  for (const level of game.levels) texts.push([level.title, LIMITS.title]);
  for (const q of questions) {
    texts.push([q.prompt, LIMITS.prompt], [q.explanation, LIMITS.explanation]);
    for (const o of q.options ?? []) texts.push([o, LIMITS.option]);
    if (q.correctAnswer) texts.push([q.correctAnswer, LIMITS.answer]);
    for (const a of q.acceptedAnswers ?? []) texts.push([a, LIMITS.answer]);
    for (const it of q.items ?? []) texts.push([it, LIMITS.option]);
    for (const p of q.pairs ?? []) texts.push([p.left, LIMITS.option], [p.right, LIMITS.option]);
  }
  if (texts.some(([t, max]) => t.length > max)) return "too-long";
  if (texts.some(([t]) => containsLink(t))) return "link";
  if (texts.some(([t]) => containsSlur(t))) return "offensive";
  return null;
}
