// Alle Datumsangaben als lokales Kalenderdatum (YYYY-MM-DD), damit "heute" der Tag auf dem Handy ist.

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Calendar days from a to b (b - a), ignoring time of day and DST. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const date = parse(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

export function formatDay(iso: string, lang: "de" | "en"): string {
  return parse(iso).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { weekday: "short", day: "numeric", month: "short" });
}
