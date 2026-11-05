// Postausgang: Meldungen und Bewertungen, die offline entstehen, werden auf dem Handy gemerkt und
// automatisch gesendet, sobald wieder Internet da ist (App-Start, "online"-Ereignis, App wieder sichtbar).
// Nur kleine JSON-Anfragen ohne Fotos; höchstens 50 Einträge, ältere als 14 Tage verfallen.

const KEY = "paperpunch-outbox";
const MAX = 50;
const MAX_AGE = 14 * 86_400_000;

interface Item {
  url: string;
  body: string;
  at: number;
}

function load(): Item[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Item[];
    return Array.isArray(list) ? list.filter((i) => Date.now() - i.at < MAX_AGE) : [];
  } catch {
    return [];
  }
}

function save(list: Item[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    /* Speicher voll – dann eben nicht */
  }
}

async function send(url: string, body: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    // 4xx (z. B. ungültig) nicht ewig wiederholen – nur Netzwerkfehler und 5xx/429 landen im Postausgang
    return res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429);
  } catch {
    return false;
  }
}

/** Senden – klappt es nicht (offline), wird es gemerkt und später nachgeschickt. Gibt true zurück, wenn gesendet oder gemerkt. */
export async function postOrQueue(url: string, payload: unknown): Promise<"sent" | "queued"> {
  const body = JSON.stringify(payload);
  if (typeof navigator !== "undefined" && navigator.onLine !== false && (await send(url, body))) return "sent";
  save([...load(), { url, body, at: Date.now() }]);
  return "queued";
}

let flushing = false;

/** Postausgang leeren (still, ohne Meldung). */
export async function flushOutbox(): Promise<void> {
  if (flushing || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
  const list = load();
  if (!list.length) return;
  flushing = true;
  const rest: Item[] = [];
  for (const item of list) if (!(await send(item.url, item.body))) rest.push(item);
  save(rest);
  flushing = false;
}

/** Beim App-Start einmal aufrufen. */
export function startOutbox(): void {
  void flushOutbox();
  window.addEventListener("online", () => void flushOutbox());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void flushOutbox();
  });
}
