import { del, list, put } from "@vercel/blob";
import type { GameData } from "@/types/generation";
import { cleanName } from "@/lib/challenges";
import { isBlockedName } from "@/lib/name-filter";

// Lerngruppen per Link (paper-punch.com/g/CODE): alle spielen dasselbe Lernspiel, eine gemeinsame Rangliste.
// Ohne Konto: Spitznamen, ein Eintrag pro Gerät (zufällige Geräte-ID), nur der erste Versuch zählt.
// Öffentlicher Blob-Store (paperpunch-jobs, Frankfurt): groups/CODE/meta.json + groups/CODE/p-GERÄT.json.
// Jeder Eintrag ist eine eigene Datei – so gibt es keine Schreibkonflikte, und "nur der erste Versuch"
// ist garantiert (zweites Schreiben auf dieselbe Datei schlägt fehl). Nach 30 Tagen gelöscht.

const PUBLIC_TOKEN = () => process.env.BLOB_READ_WRITE_TOKEN;
const PREFIX = "groups/";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface GroupMeta {
  v: 1;
  code: string;
  name: string;
  createdAt: string;
  /** ISO-Zeitpunkt, ab dem die Rangliste eingefroren ist; null = ohne Ende (30 Tage). */
  endsAt: string | null;
  lang: "de" | "en";
  by: string;
  game: GameData;
}

export interface GroupEntry {
  name: string;
  pct: number;
  correct: number;
  total: number;
  /** Spielzeit in Millisekunden (Gleichstand: schneller gewinnt). */
  ms: number;
  at: string;
  /** Kurzer, nicht umkehrbarer Teil der Geräte-ID – damit ein Gerät sich in der Liste wiederfindet. */
  me: string;
}

export interface GroupBoard {
  meta: Omit<GroupMeta, "game">;
  entries: GroupEntry[];
  ended: boolean;
}

export const groupsEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;
export const isGroupCode = (code: string) => /^[A-HJ-NP-Z2-9]{6}$/.test(code);
export const groupUrl = (code: string) => `https://paper-punch.com/g/${code}`;
export const isDeviceId = (id: string) => /^[a-zA-Z0-9-]{8,64}$/.test(id);

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

async function deviceTag(device: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`pp-group:${device}`));
  return Array.from(new Uint8Array(hash).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function cleanGroupName(name: string): string {
  const clean = name.replace(/[^\p{L}\p{N} ._–\-/&+]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40);
  return isBlockedName(clean) || isBlockedName(name) ? "" : clean;
}

export function rank(entries: GroupEntry[]): GroupEntry[] {
  return [...entries].sort((a, b) => b.pct - a.pct || a.ms - b.ms || a.at.localeCompare(b.at));
}

// Ranglisten werden kurz zwischengespeichert, damit nicht jeder Aufruf den Speicher abfragt.
const cache = new Map<string, { at: number; meta: GroupMeta; entries: GroupEntry[] }>();
const CACHE_MS = 15_000;

async function load(code: string, fresh = false): Promise<{ meta: GroupMeta; entries: GroupEntry[] } | null> {
  const hit = cache.get(code);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit;
  const { blobs } = await list({ prefix: `${PREFIX}${code}/`, limit: 200, token: PUBLIC_TOKEN() });
  const metaBlob = blobs.find((b) => b.pathname.endsWith("/meta.json"));
  if (!metaBlob) return null;
  if (Date.now() - new Date(metaBlob.uploadedAt).getTime() > MAX_AGE_MS) return null;
  const meta = (await (await fetch(metaBlob.url)).json()) as GroupMeta;
  const entryBlobs = blobs.filter((b) => b.pathname.includes("/p-"));
  const entries = (
    await Promise.all(
      entryBlobs.map(async (b) => {
        try {
          const r = await fetch(b.url);
          return r.ok ? ((await r.json()) as GroupEntry) : null;
        } catch {
          return null;
        }
      })
    )
  ).filter((e): e is GroupEntry => !!e);
  const value = { at: Date.now(), meta, entries };
  cache.set(code, value);
  return value;
}

const isEnded = (meta: GroupMeta) => !!meta.endsAt && Date.now() >= new Date(meta.endsAt).getTime();

export async function readGroup(code: string): Promise<GroupMeta | null> {
  if (!isGroupCode(code)) return null;
  return (await load(code))?.meta ?? null;
}

export async function readBoard(code: string, fresh = false): Promise<GroupBoard | null> {
  if (!isGroupCode(code)) return null;
  const data = await load(code, fresh);
  if (!data) return null;
  const { game: _game, ...meta } = data.meta;
  void _game;
  return { meta, entries: rank(data.entries), ended: isEnded(data.meta) };
}

export async function createGroup(input: { name: string; by: string; lang: "de" | "en"; endsAt: string | null; game: GameData }): Promise<GroupMeta> {
  let endsAt = input.endsAt;
  if (endsAt) {
    const t = new Date(endsAt).getTime();
    endsAt = Number.isFinite(t) && t > Date.now() ? new Date(Math.min(t, Date.now() + MAX_DURATION_MS)).toISOString() : null;
  }
  const meta: GroupMeta = {
    v: 1,
    code: newCode(),
    name: cleanGroupName(input.name) || input.game.gameTitle.slice(0, 40),
    createdAt: new Date().toISOString(),
    endsAt,
    lang: input.lang,
    by: cleanName(input.by) || (input.lang === "en" ? "Someone" : "Jemand"),
    game: input.game,
  };
  await put(`${PREFIX}${meta.code}/meta.json`, JSON.stringify(meta), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    token: PUBLIC_TOKEN(),
  });
  return meta;
}

export type SubmitOutcome = "ok" | "already" | "ended" | "missing";

/** Ergebnis eintragen – pro Gerät genau einmal (die Datei darf nicht überschrieben werden). */
export async function submitResult(code: string, device: string, r: { name: string; pct: number; correct: number; total: number; ms: number }): Promise<SubmitOutcome> {
  const data = await load(code, true);
  if (!data) return "missing";
  if (isEnded(data.meta)) return "ended";
  const me = await deviceTag(device);
  if (data.entries.some((e) => e.me === me)) return "already";
  const entry: GroupEntry = {
    name: cleanName(r.name) || (data.meta.lang === "en" ? "Player" : "Spieler:in"),
    pct: Math.max(0, Math.min(100, Math.round(r.pct))),
    correct: Math.max(0, Math.round(r.correct)),
    total: Math.max(1, Math.round(r.total)),
    ms: Math.max(0, Math.round(r.ms)),
    at: new Date().toISOString(),
    me,
  };
  try {
    await put(`${PREFIX}${code}/p-${me}.json`, JSON.stringify(entry), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      token: PUBLIC_TOKEN(),
    });
  } catch {
    return "already"; // Datei gibt es schon: dieses Gerät hat bereits gespielt
  }
  cache.set(code, { at: Date.now(), meta: data.meta, entries: [...data.entries, entry] });
  return "ok";
}

export async function myTag(device: string): Promise<string> {
  return deviceTag(device);
}

export async function cleanupOldGroups(): Promise<void> {
  try {
    const { blobs } = await list({ prefix: PREFIX, limit: 500, token: PUBLIC_TOKEN() });
    const old = blobs.filter((b) => Date.now() - new Date(b.uploadedAt).getTime() > MAX_AGE_MS + MAX_DURATION_MS);
    if (old.length) await del(old.map((b) => b.url), { token: PUBLIC_TOKEN() });
  } catch (error) {
    console.error("[groups] cleanup failed:", error instanceof Error ? error.message : error);
  }
}
