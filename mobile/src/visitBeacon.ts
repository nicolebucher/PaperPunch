import { API_BASE } from "./api";
import { deviceId } from "./device";

// Nutzungsdauer und "Absprünge" der App fürs Kosten-Dashboard (Gegenstück: app/api/visit-stat).
// Eine Sitzung = App im Vordergrund bis sie in den Hintergrund geht. Gemeldet werden nur
// {Anzahl verschiedener Screens, Sekunden} plus die zufällige Geräte-ID (dieselbe wie fürs Kontingent), damit der
// Server eindeutige Nutzer:innen zählen kann – er speichert davon nur einen nicht umkehrbaren Hash.
// Absprung = nur ein Screen gesehen (App geöffnet und ohne weitere Aktion wieder verlassen).

let screens = new Set<string>();
let since: number | null = null;

function begin() {
  screens = new Set();
  since = Date.now();
}

function send() {
  if (since === null) return;
  const seconds = Math.round((Date.now() - since) / 1000);
  const pages = Math.max(1, screens.size);
  since = null;
  if (seconds < 1) return;
  try {
    void fetch(`${API_BASE}/api/visit-stat`, { method: "POST", body: JSON.stringify({ src: "app", pages, seconds, device: deviceId() }), keepalive: true }).catch(() => undefined);
  } catch {
    /* egal */
  }
}

/** Screen-Wechsel melden (Name der Ansicht, z. B. "home", "game"). */
export function noteScreen(name: string): void {
  if (since === null && document.visibilityState === "visible") begin();
  screens.add(name);
}

export function startVisitBeacon(): void {
  if (document.visibilityState === "visible") begin();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") send();
    else begin();
  });
}
