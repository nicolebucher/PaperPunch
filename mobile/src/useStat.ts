import { API_BASE } from "./api";

// Drucken vs. online lösen zählen (anonym, nur Tageszähler – Gegenstück: app/api/use-stat).
// Pro Material und Aktion nur einmal je Sitzung (PDF ansehen + herunterladen = einmal "Drucken").
const seen = new Set<string>();

export function countUse(action: "print" | "online", format: string, materialId?: string): void {
  if (materialId) {
    const k = `${action}:${materialId}`;
    if (seen.has(k)) return;
    seen.add(k);
  }
  try {
    void fetch(`${API_BASE}/api/use-stat`, { method: "POST", body: JSON.stringify({ src: "app", action, format }), keepalive: true }).catch(() => undefined);
  } catch {
    /* egal */
  }
}
