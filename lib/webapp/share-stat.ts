// Weiterempfehlen zählen (anonym, nur Tageszähler – siehe app/api/share-stat).
// click: geteilt · arrive: über einen Einladungslink (?ref=) gekommen (einmal je Browser) ·
// create: wer über einen Einladungslink kam, hat danach selbst etwas erstellt (einmal je Browser).
const REF_KEY = "paperpunch-ref";
const CREATED_KEY = "paperpunch-ref-created";

function send(kind: "click" | "arrive" | "create"): void {
  try {
    const body = JSON.stringify({ src: "web", kind });
    if (!navigator.sendBeacon?.("/api/share-stat", body)) void fetch("/api/share-stat", { method: "POST", body, keepalive: true }).catch(() => undefined);
  } catch {
    /* egal */
  }
}

export function countShareClick(): void {
  send("click");
}

/** Beim Seitenaufruf: ?ref= merken und einmal als Ankunft zählen. */
export function noteRefArrival(): void {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref || !/^[\w-]{1,40}$/.test(ref) || localStorage.getItem(REF_KEY)) return;
    localStorage.setItem(REF_KEY, ref);
    send("arrive");
  } catch {
    /* egal */
  }
}

/** Nach dem ersten erstellten Material: zählt, wenn diese Person über einen Einladungslink kam. */
export function noteRefCreate(): void {
  try {
    if (!localStorage.getItem(REF_KEY) || localStorage.getItem(CREATED_KEY)) return;
    localStorage.setItem(CREATED_KEY, "1");
    send("create");
  } catch {
    /* egal */
  }
}
