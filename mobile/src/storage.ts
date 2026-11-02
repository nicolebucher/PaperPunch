import type { ActivePlan, Profile } from "./types";

// Alles bleibt auf dem Gerät: Profil und Plan im localStorage, Lernstoff-Dateien des Plans in IndexedDB.

const PROFILE_KEY = "paperpunch-profile";
const PLAN_KEY = "paperpunch-plan";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Speicher voll oder gesperrt: die App funktioniert weiter, nur ohne Merken.
  }
}

export const loadProfile = () => read<Profile>(PROFILE_KEY);
export const saveProfile = (p: Profile) => write(PROFILE_KEY, p);
export const loadPlan = () => read<ActivePlan>(PLAN_KEY);
export const savePlan = (p: ActivePlan | null) => write(PLAN_KEY, p);

// --- Plan-Dateien in IndexedDB --------------------------------------------------------------

const DB = "paperpunch";
const STORE = "planFiles";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePlanFiles(files: File[]): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const blobs = files.map((f) => ({ name: f.name, type: f.type, data: f as Blob }));
      tx.objectStore(STORE).put(blobs, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ohne gespeicherte Dateien arbeitet der Plan mit Fach und Fokus weiter
  }
}

export async function loadPlanFiles(): Promise<File[]> {
  try {
    const db = await openDb();
    const stored = await new Promise<{ name: string; type: string; data: Blob }[] | undefined>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get("current");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return (stored ?? []).map((s) => new File([s.data], s.name, { type: s.type }));
  } catch {
    return [];
  }
}

export async function clearPlanFiles(): Promise<void> {
  try {
    const db = await openDb();
    db.transaction(STORE, "readwrite").objectStore(STORE).delete("current");
  } catch {
    // nichts zu löschen
  }
}
