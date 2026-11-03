import type { Dict } from "../i18n";
import type { StoredMaterial } from "../storage";

export function materialTitle(m: StoredMaterial): string {
  const r = m.result;
  return r.format === "game" ? r.game.gameTitle : r.format === "podcast" ? r.title : r.data.title;
}

/** Kurzer Stand: "Aufgabe 4 von 10", "Level 2 von 4", "Fertig" oder "Noch nicht angefangen". */
export function materialStatus(m: StoredMaterial, t: Dict): string {
  if (m.finished) return t.matDone;
  const p = m.progress;
  if (p?.kind === "practice") {
    const total = m.result.format === "worksheet" || m.result.format === "test" ? m.result.data.tasks.length : p.results.length;
    return t.matProgressTasks(Math.min(p.index + 1, total), total);
  }
  if (p?.kind === "game") return t.matProgressLevels(p.stars.filter((x) => x > 0).length + (p.bossDone ? 1 : 0), p.stars.length + 1);
  return t.matNew;
}

export const isResumable = (m: StoredMaterial) => !!m.progress && !m.finished;

/** Erstellungsdatum kurz: "Heute", "Gestern" oder "3. Nov." / "3 Nov". */
export function materialDate(m: StoredMaterial, t: Dict, lang: string): string {
  const d = new Date(m.createdAt);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
  if (days <= 0) return t.today;
  if (days === 1) return t.yesterday;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}
