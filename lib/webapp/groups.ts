import type { GameData } from "@/types/generation";

// Lerngruppen im Browser: Geräte-ID, eigene Gruppen (für "Weitermachen") und API-Aufrufe.

const DEVICE_KEY = "paperpunch-device";
const GROUPS_KEY = "paperpunch-web-groups";

export interface BoardEntry { name: string; pct: number; correct: number; total: number; ms: number; at: string; me: string }
export interface Board {
  meta: { code: string; name: string; createdAt: string; endsAt: string | null; lang: "de" | "en"; by: string };
  entries: BoardEntry[];
  ended: boolean;
  me?: string;
}
export interface SavedGroup { code: string; name: string; title: string; endsAt: string | null; savedAt: number; lastRank?: number }

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

export function savedGroups(): SavedGroup[] {
  try {
    const list = JSON.parse(localStorage.getItem(GROUPS_KEY) ?? "[]") as SavedGroup[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveGroup(g: Omit<SavedGroup, "savedAt"> & { savedAt?: number }): void {
  try {
    const rest = savedGroups().filter((x) => x.code !== g.code);
    const old = savedGroups().find((x) => x.code === g.code);
    localStorage.setItem(GROUPS_KEY, JSON.stringify([{ ...old, ...g, savedAt: g.savedAt ?? old?.savedAt ?? Date.now() }, ...rest].slice(0, 20)));
  } catch {
    // ohne Speicher egal
  }
}

export async function fetchBoard(code: string): Promise<Board | null> {
  const res = await fetch(`/api/groups/${code}?device=${encodeURIComponent(deviceId())}`, { cache: "no-store" });
  return res.ok ? ((await res.json()) as Board) : null;
}

export async function submitToGroup(code: string, r: { name: string; pct: number; correct: number; total: number; ms: number }): Promise<(Board & { outcome: string }) | null> {
  const res = await fetch(`/api/groups/${code}/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device: deviceId(), ...r }),
  });
  return res.ok ? ((await res.json()) as Board & { outcome: string }) : null;
}

export async function createGroupWeb(input: { game: GameData; name: string; by: string; lang: "de" | "en"; endsAt: string | null }): Promise<{ code: string; url: string; name: string; endsAt: string | null }> {
  const res = await fetch("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, device: deviceId() }),
  });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as { code: string; url: string; name: string; endsAt: string | null };
}

/** Ende-Optionen wie im Entwurf: ohne Ende, morgen (18 Uhr), Freitag 18 Uhr, in 1 Woche. */
export function endOptions(lang: "de" | "en"): { id: string; label: string; endsAt: string | null }[] {
  const at18 = (d: Date) => { const x = new Date(d); x.setHours(18, 0, 0, 0); return x; };
  const now = new Date();
  const tomorrow = at18(new Date(now.getTime() + 86_400_000));
  const friday = at18(new Date(now));
  const diff = (5 - friday.getDay() + 7) % 7;
  friday.setDate(friday.getDate() + diff);
  if (friday.getTime() <= now.getTime()) friday.setDate(friday.getDate() + 7);
  const week = new Date(now.getTime() + 7 * 86_400_000);
  const de = lang === "de";
  return [
    { id: "none", label: de ? "Ohne Ende" : "No end", endsAt: null },
    { id: "tomorrow", label: de ? "Morgen, 18 Uhr" : "Tomorrow, 6 pm", endsAt: tomorrow.toISOString() },
    { id: "friday", label: de ? "Fr, 18 Uhr" : "Fri, 6 pm", endsAt: friday.toISOString() },
    { id: "week", label: de ? "In 1 Woche" : "In 1 week", endsAt: week.toISOString() },
  ];
}

/** "noch 2 Tage" / "noch 5 Std." / "Beendet" */
export function timeLeft(endsAt: string | null, lang: "de" | "en"): string | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  const de = lang === "de";
  if (ms <= 0) return de ? "Beendet" : "Ended";
  const h = Math.ceil(ms / 3_600_000);
  if (h < 24) return de ? `noch ${h} Std.` : `${h} h left`;
  const d = Math.round(h / 24);
  return de ? `noch ${d} ${d === 1 ? "Tag" : "Tage"}` : `${d} ${d === 1 ? "day" : "days"} left`;
}

export function fmtTime(ms: number): string {
  if (!(ms > 0)) return "";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} Min.`;
}
