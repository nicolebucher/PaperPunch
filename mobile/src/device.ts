// Zufällige Geräte-ID (nur auf dem Gerät erzeugt, kein Konto): für Lerngruppen (ein Eintrag pro Gerät)
// und das Wochen-Kontingent beim Erstellen. Der Server speichert sie nur gehasht.

const DEVICE_KEY = "paperpunch-device";

export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
