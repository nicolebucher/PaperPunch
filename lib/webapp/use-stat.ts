// Drucken vs. online lösen zählen (anonym, nur Tageszähler – siehe app/api/use-stat, Website-Seite).
// Pro Material und Aktion nur einmal je Sitzung (PDF ansehen + herunterladen = einmal "Drucken").
const seen = new Set<string>();

export function countUse(action: "print" | "online", format: string, materialId?: string): void {
  if (materialId) {
    const k = `${action}:${materialId}`;
    if (seen.has(k)) return;
    seen.add(k);
  }
  try {
    const body = JSON.stringify({ src: "web", action, format });
    if (!navigator.sendBeacon?.("/api/use-stat", body)) void fetch("/api/use-stat", { method: "POST", body, keepalive: true }).catch(() => undefined);
  } catch {
    /* egal */
  }
}
