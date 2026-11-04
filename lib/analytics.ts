// Ereignisse für Google Analytics 4 – nur wirksam, wenn der Besucher im Cookie-Banner zugestimmt hat
// (sonst ist gtag nicht geladen und es passiert nichts). Keine Inhalte, keine Namen – nur Art der Aktion.
type Params = Record<string, string | number | boolean | undefined>;

export function track(event: string, params: Params = {}): void {
  try {
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.("event", event, params);
  } catch {
    // Analytics darf nie etwas kaputt machen
  }
}
