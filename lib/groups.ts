import { del, get, list, put, type ListBlobResultBlob } from "@vercel/blob";
import type { GameData } from "@/types/generation";
import { cleanName } from "@/lib/challenges";
import { isBlockedName } from "@/lib/name-filter";

// Lerngruppen per Link (paper-punch.com/g/CODE): alle spielen dasselbe Lernspiel, eine gemeinsame Rangliste.
// Ohne Konto: Spitznamen, ein Eintrag pro Gerät (zufällige Geräte-ID), nur der erste Versuch zählt.
// Speicher: groups/CODE/meta.json + groups/CODE/p-GERÄT.json. Jeder Eintrag ist eine eigene Datei – so gibt es
// keine Schreibkonflikte, und "nur der erste Versuch" ist garantiert (zweites Schreiben auf dieselbe Datei
// schlägt fehl). Nach 30 Tagen gelöscht.
// Seit v0.22.3 liegen neue Gruppen im PRIVATEN Blob-Store (BLOB_STORE_ID, Anmeldung per OIDC, wie das Feedback):
// Die Einträge enthalten Spitznamen und Antworten von Kindern, die nur die Lehrkraft sehen soll. Ältere Gruppen
// liegen noch im öffentlichen Store (paperpunch-jobs) und werden dort weiter gelesen und beschrieben, bis sie
// nach 30 Tagen auslaufen. Ohne BLOB_STORE_ID (lokal) wird wie früher der öffentliche Store genutzt.

const PUBLIC_TOKEN = () => process.env.BLOB_READ_WRITE_TOKEN;
const PRIVATE_STORE = () => process.env.BLOB_STORE_ID;
type Backend = "private" | "public";

const storeOpts = (b: Backend) => (b === "private" ? { storeId: PRIVATE_STORE() } : { token: PUBLIC_TOKEN() });
const newGroupBackend = (): Backend => (PRIVATE_STORE() ? "private" : "public");

async function listBlobs(prefix: string, b: Backend, limit = 200): Promise<ListBlobResultBlob[]> {
  return (await list({ prefix, limit, ...storeOpts(b) })).blobs;
}

async function readJson<T>(blob: ListBlobResultBlob, b: Backend): Promise<T | null> {
  if (b === "public") {
    const r = await fetch(blob.url);
    return r.ok ? ((await r.json()) as T) : null;
  }
  // Dateien werden nie überschrieben – der CDN-Cache darf sie also behalten
  const r = await get(blob.pathname, { access: "private", storeId: PRIVATE_STORE() });
  if (!r || r.statusCode !== 200) return null;
  return (await new Response(r.stream).json()) as T;
}

async function writeJson(pathname: string, data: unknown, b: Backend): Promise<void> {
  await put(pathname, JSON.stringify(data), {
    access: b,
    addRandomSuffix: false,
    contentType: "application/json",
    ...storeOpts(b),
  });
}
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
  /** Hausaufgabe: Kinder sehen nur ihr eigenes Ergebnis, die Rangliste nur die Lehrkraft (Auswertung). */
  homework?: boolean;
  /** SHA-256 des Lehrkraft-Schlüssels (Auswertung). Fehlt bei Gruppen von vor v0.13. Nie an Spieler:innen ausliefern. */
  teacherHash?: string;
}

/** Antwort auf eine Frage: [Level-ID, Frage-Index, richtig 1/0, gegebene Antwort (gekürzt)]. */
export type GroupAnswer = [number, number, 0 | 1, string];

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
  /** Antworten pro Frage (nur für die Lehrkraft-Auswertung, nie in der öffentlichen Rangliste). */
  qs?: GroupAnswer[];
}

export interface GroupBoard {
  meta: Omit<GroupMeta, "game" | "teacherHash">;
  entries: GroupEntry[];
  ended: boolean;
  /** Anzahl aller Einträge (bei Hausaufgaben enthält entries nur den eigenen). */
  count: number;
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
const cache = new Map<string, { at: number; meta: GroupMeta; entries: GroupEntry[]; backend: Backend }>();
const CACHE_MS = 15_000;

async function load(code: string, fresh = false): Promise<{ meta: GroupMeta; entries: GroupEntry[]; backend: Backend } | null> {
  const hit = cache.get(code);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit;
  // Erst der private Store (neue Gruppen), dann der öffentliche (Gruppen von vor v0.22.3)
  const backends: Backend[] = PRIVATE_STORE() ? ["private", "public"] : ["public"];
  let backend: Backend | null = null;
  let blobs: ListBlobResultBlob[] = [];
  for (const b of backends) {
    try {
      blobs = await listBlobs(`${PREFIX}${code}/`, b);
    } catch (error) {
      // privater Store nicht erreichbar: im öffentlichen weitersuchen statt die Gruppe zu verlieren
      if (b === "public") throw error;
      console.error("[groups] private store list failed:", error instanceof Error ? error.message : error);
      blobs = [];
    }
    if (blobs.some((x) => x.pathname.endsWith("/meta.json"))) {
      backend = b;
      break;
    }
  }
  const metaBlob = blobs.find((b) => b.pathname.endsWith("/meta.json"));
  if (!backend || !metaBlob) return null;
  if (Date.now() - new Date(metaBlob.uploadedAt).getTime() > MAX_AGE_MS) return null;
  const meta = await readJson<GroupMeta>(metaBlob, backend);
  if (!meta) return null;
  const entryBlobs = blobs.filter((b) => b.pathname.includes("/p-"));
  const entries = (
    await Promise.all(
      entryBlobs.map(async (b) => {
        try {
          return await readJson<GroupEntry>(b, backend);
        } catch {
          return null;
        }
      })
    )
  ).filter((e): e is GroupEntry => !!e);
  const value = { at: Date.now(), meta, entries, backend };
  cache.set(code, value);
  return value;
}

const isEnded = (meta: GroupMeta) => !!meta.endsAt && Date.now() >= new Date(meta.endsAt).getTime();

export async function readGroup(code: string): Promise<GroupMeta | null> {
  if (!isGroupCode(code)) return null;
  return (await load(code))?.meta ?? null;
}

/** Rangliste für Spieler:innen. Bei Hausaufgaben nur der eigene Eintrag (`me` = Geräte-Kennung) plus die Anzahl. */
export async function readBoard(code: string, fresh = false, me?: string): Promise<GroupBoard | null> {
  if (!isGroupCode(code)) return null;
  const data = await load(code, fresh);
  if (!data) return null;
  const { game: _game, teacherHash: _hash, ...meta } = data.meta;
  void _game;
  void _hash;
  // Antworten pro Frage bleiben privat (nur Lehrkraft-Auswertung)
  const all = rank(data.entries).map(({ qs: _qs, ...e }) => (void _qs, e));
  const entries = data.meta.homework ? all.filter((e) => !!me && e.me === me) : all;
  return { meta, entries, ended: isEnded(data.meta), count: all.length };
}

async function sha256(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

function newTeacherKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export const teacherUrl = (code: string, key: string) => `https://paper-punch.com/g/${code}/auswertung#k=${key}`;

/** Lehrkraft-Schlüssel prüfen (konstante Laufzeit beim Vergleich ist hier unkritisch: Hash gegen Hash). */
export async function checkTeacherKey(meta: GroupMeta, key: string): Promise<boolean> {
  if (!meta.teacherHash || !/^[A-HJ-NP-Z2-9]{18}$/.test(key)) return false;
  return (await sha256(`pp-teacher:${meta.code}:${key}`)) === meta.teacherHash;
}

export async function createGroup(input: { name: string; by: string; lang: "de" | "en"; endsAt: string | null; game: GameData; homework?: boolean }): Promise<GroupMeta & { teacherKey: string }> {
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
    ...(input.homework && endsAt ? { homework: true } : {}),
  };
  const teacherKey = newTeacherKey();
  meta.teacherHash = await sha256(`pp-teacher:${meta.code}:${teacherKey}`);
  const target = newGroupBackend();
  try {
    await writeJson(`${PREFIX}${meta.code}/meta.json`, meta, target);
  } catch (error) {
    // Sicherheitsnetz: Klappt der private Store nicht, lieber wie bisher öffentlich speichern als gar nicht
    if (target === "public") throw error;
    console.error("[groups] private store write failed, using public store:", error instanceof Error ? error.message : error);
    await writeJson(`${PREFIX}${meta.code}/meta.json`, meta, "public");
  }
  return { ...meta, teacherKey };
}

export type SubmitOutcome = "ok" | "already" | "ended" | "missing";

/** Ergebnis eintragen – pro Gerät genau einmal (die Datei darf nicht überschrieben werden). */
export async function submitResult(code: string, device: string, r: { name: string; pct: number; correct: number; total: number; ms: number; answers?: { l: number; i: number; ok: boolean; a?: string }[] }): Promise<SubmitOutcome> {
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
  if (r.answers?.length) {
    entry.qs = r.answers.slice(0, 200).map((x) => [Math.round(x.l), Math.round(x.i), x.ok ? 1 : 0, (x.a ?? "").replace(/\s+/g, " ").trim().slice(0, 60)]);
  }
  try {
    await writeJson(`${PREFIX}${code}/p-${me}.json`, entry, data.backend);
  } catch {
    return "already"; // Datei gibt es schon: dieses Gerät hat bereits gespielt
  }
  cache.set(code, { at: Date.now(), meta: data.meta, entries: [...data.entries, entry], backend: data.backend });
  return "ok";
}

export async function myTag(device: string): Promise<string> {
  return deviceTag(device);
}

export async function cleanupOldGroups(): Promise<void> {
  const backends: Backend[] = PRIVATE_STORE() ? ["private", "public"] : ["public"];
  for (const b of backends) {
    try {
      const blobs = await listBlobs(PREFIX, b, 500);
      const old = blobs.filter((x) => Date.now() - new Date(x.uploadedAt).getTime() > MAX_AGE_MS + MAX_DURATION_MS);
      if (old.length) await del(old.map((x) => x.url), storeOpts(b));
    } catch (error) {
      console.error(`[groups] cleanup (${b}) failed:`, error instanceof Error ? error.message : error);
    }
  }
}

export interface TeacherQuestion {
  level: number;
  levelTitle: string;
  index: number;
  prompt: string;
  correct: string;
  answered: number;
  wrong: number;
  /** häufigste falsche Antworten mit Anzahl */
  topWrong: { answer: string; n: number }[];
}

export interface TeacherReport {
  meta: { code: string; name: string; title: string; subject: string; createdAt: string; endsAt: string | null; ended: boolean; lang: "de" | "en"; homework: boolean };
  players: number;
  avgPct: number | null;
  avgMs: number | null;
  levels: { id: number; title: string; pct: number | null }[];
  questions: TeacherQuestion[];
  /** Ergebnisse pro Kind – bewusst ohne Schwächen-Auswertung pro Kind. */
  entries: { name: string; pct: number; correct: number; total: number; ms: number; at: string }[];
  /** Anzahl Einträge mit Antworten pro Frage (ältere Apps senden nur die Summe). */
  detailed: number;
}

/** Auswertung für die Lehrkraft: Fragen mit den meisten Fehlern, Level-Quoten, Ergebnisse. */
export async function teacherReport(code: string, key: string): Promise<TeacherReport | "denied" | null> {
  if (!isGroupCode(code)) return null;
  const data = await load(code, true);
  if (!data) return null;
  if (!(await checkTeacherKey(data.meta, key))) return "denied";
  const { meta, entries } = data;
  const levels = [...meta.game.levels].sort((a, b) => a.id - b.id);
  const qmap = new Map<string, { answered: number; wrong: number; wrongAnswers: Map<string, number> }>();
  const levelAgg = new Map<number, { ok: number; n: number }>();
  let detailed = 0;
  for (const e of entries) {
    if (!e.qs?.length) continue;
    detailed++;
    for (const [l, i, ok, a] of e.qs) {
      const k = `${l}:${i}`;
      const q = qmap.get(k) ?? { answered: 0, wrong: 0, wrongAnswers: new Map<string, number>() };
      q.answered++;
      if (!ok) {
        q.wrong++;
        const key2 = a.toLowerCase();
        if (key2) q.wrongAnswers.set(key2, (q.wrongAnswers.get(key2) ?? 0) + 1);
      }
      qmap.set(k, q);
      const la = levelAgg.get(l) ?? { ok: 0, n: 0 };
      la.n++;
      la.ok += ok;
      levelAgg.set(l, la);
    }
  }
  const questions: TeacherQuestion[] = [];
  for (const level of levels) {
    level.questions.forEach((q, i) => {
      const agg = qmap.get(`${level.id}:${i}`);
      if (!agg) return;
      const correct = q.type === "multiple-choice" ? (q.options ?? [])[q.correctIndex ?? 0] ?? "" : q.correctAnswer ?? "";
      questions.push({
        level: level.id,
        levelTitle: level.title,
        index: i,
        prompt: q.prompt,
        correct,
        answered: agg.answered,
        wrong: agg.wrong,
        topWrong: [...agg.wrongAnswers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([answer, n]) => ({ answer, n })),
      });
    });
  }
  questions.sort((a, b) => b.wrong / Math.max(1, b.answered) - a.wrong / Math.max(1, a.answered) || b.answered - a.answered);
  const ranked = rank(entries);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
  return {
    meta: { code: meta.code, name: meta.name, title: meta.game.gameTitle, subject: meta.game.subject, createdAt: meta.createdAt, endsAt: meta.endsAt, ended: isEnded(meta), lang: meta.lang, homework: !!meta.homework },
    players: entries.length,
    avgPct: avg(entries.map((e) => e.pct)),
    avgMs: avg(entries.filter((e) => e.ms > 0).map((e) => e.ms)),
    levels: levels.map((l) => {
      const a = levelAgg.get(l.id);
      return { id: l.id, title: l.title, pct: a && a.n ? Math.round((a.ok / a.n) * 100) : null };
    }),
    questions,
    entries: ranked.map((e) => ({ name: e.name, pct: e.pct, correct: e.correct, total: e.total, ms: e.ms, at: e.at })),
    detailed,
  };
}
