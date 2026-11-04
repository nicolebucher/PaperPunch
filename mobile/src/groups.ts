import { createGroup, fetchGroupBoard, submitGroupResult, type GroupBoard } from "./api";
// Gegenstück auf der Website: lib/groups.ts (Speicher) und components/group/GroupPlay.tsx (Mitspielen im Browser).
import { shareLink, type InviteOutcome } from "./invite";
import { savedNickname } from "./challenge";
import type { Dict } from "./i18n";
import type { GameResult } from "./types";
import type { StoredMaterial } from "./storage";

// Lerngruppen in der App: Geräte-ID, eigene Gruppen auf dem Gerät, Rangliste vom Server.

const DEVICE_KEY = "paperpunch-device";
const GROUPS_KEY = "paperpunch-groups";
const NAME_KEY = "paperpunch-nickname";

export interface MyGroup {
  code: string;
  url: string;
  name: string;
  title: string;
  endsAt: string | null;
  createdAt: number;
  /** Material in der App, aus dem das Spiel stammt – das eigene Ergebnis wird nachgereicht, sobald es gespielt ist. */
  materialId?: string;
  submitted?: boolean;
  lastRank?: number;
}

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

export function myGroups(): MyGroup[] {
  try {
    const list = JSON.parse(localStorage.getItem(GROUPS_KEY) ?? "[]") as MyGroup[];
    return Array.isArray(list) ? list.filter((g) => Date.now() - g.createdAt < 30 * 86_400_000) : [];
  } catch {
    return [];
  }
}

export function updateGroup(code: string, patch: Partial<MyGroup>): void {
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(myGroups().map((g) => (g.code === code ? { ...g, ...patch } : g))));
  } catch {
    // ohne Speicher egal
  }
}

function addGroup(g: MyGroup): void {
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify([g, ...myGroups().filter((x) => x.code !== g.code)].slice(0, 20)));
  } catch {
    // ohne Speicher egal
  }
}

/** Ergebnis (richtig/gesamt) eines fertig gespielten Lernspiels, sonst undefined. */
export function resultOf(m: StoredMaterial | undefined): { pct: number; correct: number; total: number } | undefined {
  const e = m?.finished && m.progress?.kind === "game" ? m.progress.earned : undefined;
  return e && e.total > 0 ? { pct: Math.round((e.correct / e.total) * 100), correct: e.correct, total: e.total } : undefined;
}

/** Gruppe anlegen, auf dem Gerät merken und den Link übers Teilen-Menü verschicken. */
export async function startGroup(opts: { material: StoredMaterial; game: GameResult["game"]; name: string; nick: string; endsAt: string | null; lang: string; t: Dict }): Promise<{ outcome: InviteOutcome; group: MyGroup }> {
  const nick = opts.nick.trim();
  try {
    if (nick) localStorage.setItem(NAME_KEY, nick);
  } catch {
    // ignorieren
  }
  const result = resultOf(opts.material);
  const res = await createGroup({ game: opts.game, name: opts.name.trim(), by: nick, lang: opts.lang, endsAt: opts.endsAt, device: deviceId(), result });
  const group: MyGroup = { code: res.code, url: res.url, name: res.name, title: opts.game.gameTitle, endsAt: res.endsAt, createdAt: Date.now(), materialId: opts.material.id, submitted: !!result };
  addGroup(group);
  const outcome = await shareLink(opts.t.groupShareTitle, opts.t.groupShareText(res.name, opts.game.gameTitle), res.url);
  return { outcome, group };
}

/** Eigenes Ergebnis nachreichen, wenn das Spiel inzwischen gespielt ist (nur der erste Durchgang zählt). */
export async function submitPending(materials: StoredMaterial[]): Promise<void> {
  for (const g of myGroups()) {
    if (g.submitted || !g.materialId) continue;
    const r = resultOf(materials.find((m) => m.id === g.materialId));
    if (!r) continue;
    const board = await submitGroupResult(g.code, deviceId(), { name: savedNickname() || "Ich", ...r });
    if (board) updateGroup(g.code, { submitted: true });
  }
}

export async function loadBoard(code: string): Promise<GroupBoard | null> {
  return fetchGroupBoard(code, deviceId());
}

export function endOptions(t: Dict): { id: string; label: string; endsAt: string | null }[] {
  const at18 = (d: Date) => { const x = new Date(d); x.setHours(18, 0, 0, 0); return x; };
  const now = new Date();
  const tomorrow = at18(new Date(now.getTime() + 86_400_000));
  const friday = at18(new Date(now));
  friday.setDate(friday.getDate() + ((5 - friday.getDay() + 7) % 7));
  if (friday.getTime() <= now.getTime()) friday.setDate(friday.getDate() + 7);
  return [
    { id: "none", label: t.groupEndNone, endsAt: null },
    { id: "tomorrow", label: t.groupEndTomorrow, endsAt: tomorrow.toISOString() },
    { id: "friday", label: t.groupEndFriday, endsAt: friday.toISOString() },
    { id: "week", label: t.groupEndWeek, endsAt: new Date(now.getTime() + 7 * 86_400_000).toISOString() },
  ];
}

export function timeLeft(endsAt: string | null, t: Dict): string | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return t.groupEnded;
  const h = Math.ceil(ms / 3_600_000);
  return h < 24 ? t.groupHoursLeft(h) : t.groupDaysLeft(Math.round(h / 24));
}
