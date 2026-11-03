import { createChallenge } from "./api";
import { shareLink, type InviteOutcome } from "./invite";
import type { Dict } from "./i18n";
import type { GameResult } from "./types";
import type { StoredMaterial } from "./storage";

const NAME_KEY = "paperpunch-nickname";

export function savedNickname(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Anteil richtiger Antworten (0–100) eines fertig gespielten Lernspiels, sonst undefined. */
export function challengePctOf(m: StoredMaterial | undefined): number | undefined {
  const e = m?.finished && m.progress?.kind === "game" ? m.progress.earned : undefined;
  return e && e.total > 0 ? Math.round((e.correct / e.total) * 100) : undefined;
}

/** Challenge auf dem Server anlegen und den Link übers Teilen-Menü verschicken. Wirft bei Netzwerkfehlern. */
export async function sendChallenge(game: GameResult["game"], name: string, pct: number | undefined, lang: string, t: Dict): Promise<InviteOutcome> {
  const clean = name.trim();
  try {
    if (clean) localStorage.setItem(NAME_KEY, clean);
  } catch {
    // ignorieren
  }
  const url = await createChallenge(game, clean, pct, lang);
  const text = pct !== undefined ? t.challengeText(pct, game.gameTitle) : t.challengeTextNoScore(game.gameTitle);
  return shareLink(t.challengeTitle, text, url);
}
