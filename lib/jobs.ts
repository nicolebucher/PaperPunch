import { del, list, put } from "@vercel/blob";

// Ausdrücklich der öffentliche Store (paperpunch-jobs): im Projekt ist zusätzlich der private Feedback-Store
// verbunden (BLOB_STORE_ID + OIDC) – ohne explizites Token könnte das SDK den falschen Store nehmen.
const PUBLIC_TOKEN = () => process.env.BLOB_READ_WRITE_TOKEN;

// Hintergrund-Jobs für /api/generate: Das Ergebnis landet als JSON im Vercel-Blob-Store
// "paperpunch-jobs" (Frankfurt), bis die App es abholt. Der Pfad enthält eine zufällige UUID plus
// ein zufälliges Suffix, ist also nicht erratbar. Abgeholte Ergebnisse löscht die App per DELETE;
// alles, was älter als 24 Stunden ist, wird beim nächsten neuen Job aufgeräumt.

export type JobRecord =
  | { status: "done"; result: unknown }
  | { status: "error"; error: string };

const PREFIX = "jobs/";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const jobsEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export const isJobId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);

export async function saveJob(id: string, record: JobRecord): Promise<void> {
  await put(`${PREFIX}${id}.json`, JSON.stringify(record), {
    access: "public",
    addRandomSuffix: true,
    contentType: "application/json",
    token: PUBLIC_TOKEN(),
  });
}

/** null = noch nicht fertig (oder unbekannt). */
export async function readJob(id: string): Promise<JobRecord | null> {
  const { blobs } = await list({ prefix: `${PREFIX}${id}`, token: PUBLIC_TOKEN() });
  if (!blobs.length) return null;
  const latest = blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
  const res = await fetch(latest.url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as JobRecord;
}

export async function deleteJob(id: string): Promise<void> {
  const { blobs } = await list({ prefix: `${PREFIX}${id}`, token: PUBLIC_TOKEN() });
  if (blobs.length) await del(blobs.map((b) => b.url), { token: PUBLIC_TOKEN() });
}

export async function cleanupOldJobs(): Promise<void> {
  try {
    const { blobs } = await list({ prefix: PREFIX, limit: 200, token: PUBLIC_TOKEN() });
    const old = blobs.filter((b) => Date.now() - new Date(b.uploadedAt).getTime() > MAX_AGE_MS);
    if (old.length) await del(old.map((b) => b.url), { token: PUBLIC_TOKEN() });
  } catch (error) {
    console.error("[jobs] cleanup failed:", error instanceof Error ? error.message : error);
  }
}
