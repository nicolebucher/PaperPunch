import type { ActivePlan, Profile } from "./types";

// Alles bleibt auf dem Gerät: Profil und Plan im localStorage, Lernstoff-Dateien des Plans in IndexedDB.

const PROFILE_KEY = "paperpunch-profile";
const PLAN_KEY = "paperpunch-plan"; // alt: ein einzelner Plan
const PLANS_KEY = "paperpunch-plans";

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
/** Alle Lernpläne. Ein Plan aus der ersten Version (ein einzelner Plan) wird übernommen. */
export function loadPlans(): ActivePlan[] {
  const list = read<ActivePlan[]>(PLANS_KEY);
  if (list) return list;
  const legacy = read<ActivePlan>(PLAN_KEY);
  if (!legacy) return [];
  const migrated = [{ ...legacy, id: legacy.id ?? "legacy" }];
  write(PLANS_KEY, migrated);
  write(PLAN_KEY, null);
  return migrated;
}
export const savePlans = (plans: ActivePlan[]) => write(PLANS_KEY, plans);

export function newPlanId(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

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

export async function savePlanFiles(planId: string, files: File[]): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const blobs = files.map((f) => ({ name: f.name, type: f.type, data: f as Blob }));
      tx.objectStore(STORE).put(blobs, planId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ohne gespeicherte Dateien arbeitet der Plan mit Fach und Fokus weiter
  }
}

export async function loadPlanFiles(planId: string): Promise<File[]> {
  try {
    const db = await openDb();
    const stored = await new Promise<{ name: string; type: string; data: Blob }[] | undefined>((resolve, reject) => {
      // "current" = Ablage aus der ersten Version (nur ein Plan)
      const req = db.transaction(STORE).objectStore(STORE).get(planId === "legacy" ? "current" : planId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return (stored ?? []).map((s) => new File([s.data], s.name, { type: s.type }));
  } catch {
    return [];
  }
}

export async function clearPlanFiles(planId: string): Promise<void> {
  try {
    const db = await openDb();
    db.transaction(STORE, "readwrite").objectStore(STORE).delete(planId === "legacy" ? "current" : planId);
  } catch {
    // nichts zu löschen
  }
}
