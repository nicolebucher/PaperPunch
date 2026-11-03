import { del, list, put } from "@vercel/blob";
import type { GameData } from "@/types/generation";

// Challenges per Link: Ein Lernspiel wird mit Spitzname und Ergebnis der Person gespeichert, die
// herausfordert. Der Link paper-punch.com/c/CODE öffnet dasselbe Spiel im Browser – ohne Konto.
// Gespeichert im Vercel-Blob-Store (Frankfurt), nach 30 Tagen gelöscht (Aufräumen bei jeder neuen Challenge).

export interface ChallengeRecord {
  v: 1;
  code: string;
  createdAt: string;
  lang: "de" | "en";
  game: GameData;
  /** Spitzname und Anteil richtiger Antworten (0–100) der herausfordernden Person; pct fehlt, wenn noch nicht gespielt. */
  from: { name: string; pct?: number };
}

const PREFIX = "challenges/";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const challengesEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;
export const isChallengeCode = (code: string) => /^[A-HJ-NP-Z2-9]{6}$/.test(code);
export const challengeUrl = (code: string) => `https://paper-punch.com/c/${code}`;

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Spitznamen säubern: nur Buchstaben, Ziffern, Leerzeichen und ein paar Satzzeichen, max. 20 Zeichen. */
export function cleanName(name: string): string {
  return name.replace(/[^\p{L}\p{N} ._-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 20);
}

export async function saveChallenge(data: Omit<ChallengeRecord, "v" | "code" | "createdAt">): Promise<ChallengeRecord> {
  const record: ChallengeRecord = { v: 1, code: newCode(), createdAt: new Date().toISOString(), ...data };
  await put(`${PREFIX}${record.code}.json`, JSON.stringify(record), {
    access: "public",
    addRandomSuffix: true,
    contentType: "application/json",
  });
  return record;
}

export async function readChallenge(code: string): Promise<ChallengeRecord | null> {
  if (!isChallengeCode(code)) return null;
  const { blobs } = await list({ prefix: `${PREFIX}${code}` });
  if (!blobs.length) return null;
  const blob = blobs[0];
  if (Date.now() - new Date(blob.uploadedAt).getTime() > MAX_AGE_MS) return null;
  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as ChallengeRecord;
}

export async function cleanupOldChallenges(): Promise<void> {
  try {
    const { blobs } = await list({ prefix: PREFIX, limit: 200 });
    const old = blobs.filter((b) => Date.now() - new Date(b.uploadedAt).getTime() > MAX_AGE_MS);
    if (old.length) await del(old.map((b) => b.url));
  } catch (error) {
    console.error("[challenges] cleanup failed:", error instanceof Error ? error.message : error);
  }
}
