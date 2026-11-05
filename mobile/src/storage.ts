import type { ActivePlan, GenerateResult, Profile, StoredSession } from "./types";

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
const MATERIALS = "materials";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(MATERIALS)) db.createObjectStore(MATERIALS, { keyPath: "id" });
    };
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

// --- Meine Materialien: erstelltes Material samt Fortschritt, damit man später weitermachen kann ---------------

export interface GameProgress {
  kind: "game";
  stars: number[];
  bossDone: boolean;
  earned: { answer: number; boss: number; correct: number; total: number; missed: string[] };
  /** Fragen (Prompt), die in den Leveln nicht im ersten Versuch saßen – kommen als "Revanche" in die Boss-Runde. */
  shaky?: string[];
}
export interface PracticeProgress {
  kind: "practice";
  index: number;
  results: boolean[];
  selfChecked: boolean[];
  secondTry: boolean[];
}
export interface StoredMaterial {
  id: string;
  createdAt: number;
  updatedAt: number;
  result: GenerateResult;
  from?: { planId: string; session: StoredSession };
  progress?: GameProgress | PracticeProgress;
  finished?: boolean;
  /** Hochgeladenes Schulmaterial (Fotos/PDFs), um später neu zu üben, herunterzuladen oder zu teilen */
  sources?: StoredFile[];
  subject?: string;
  notes?: string;
  /** Eigene Bewertung (1–5), damit nur einmal gefragt wird */
  rating?: number;
  /** Eltern mit mehreren Kindern: für welches Kind (ID + Anzeigename) */
  childId?: string;
  child?: string;
  /** Lehrkräfte: Klassenstufe, für die das Material erstellt wurde (Namensvorschlag der Lerngruppe) */
  grade?: number;
}

export interface StoredFile {
  name: string;
  type: string;
  data: Blob;
}

export const toStoredFiles = (files: File[]): StoredFile[] => files.map((f) => ({ name: f.name, type: f.type, data: f }));
export const fromStoredFiles = (files: StoredFile[] = []): File[] => files.map((s) => new File([s.data], s.name, { type: s.type }));

const MAX_MATERIALS = 20;

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(MATERIALS, mode);
    const req = run(t.objectStore(MATERIALS));
    t.oncomplete = () => resolve(req ? (req.result as T) : undefined);
    t.onerror = () => reject(t.error);
  });
}

export async function listMaterials(): Promise<StoredMaterial[]> {
  try {
    const all = (await tx<StoredMaterial[]>("readonly", (s) => s.getAll() as IDBRequest<StoredMaterial[]>)) ?? [];
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function saveMaterial(m: StoredMaterial): Promise<void> {
  try {
    await tx("readwrite", (s) => {
      s.put(m);
    });
    const all = await listMaterials();
    if (all.length > MAX_MATERIALS) {
      const old = all.slice(MAX_MATERIALS);
      await tx("readwrite", (s) => {
        old.forEach((o) => s.delete(o.id));
      });
    }
  } catch {
    // ohne Speicher geht nur das Weitermachen verloren
  }
}

export async function updateMaterial(id: string, change: Partial<StoredMaterial>): Promise<void> {
  try {
    const current = await tx<StoredMaterial>("readonly", (s) => s.get(id) as IDBRequest<StoredMaterial>);
    if (current) await saveMaterial({ ...current, ...change, updatedAt: Date.now() });
  } catch {
    // ignorieren
  }
}

export async function deleteMaterial(id: string): Promise<void> {
  try {
    await tx("readwrite", (s) => {
      s.delete(id);
    });
  } catch {
    // ignorieren
  }
}


// ---------- Laufende Erstellung (Hintergrund-Job) ----------
// Damit ein Lernspiel auch fertig wird, wenn das Handy gesperrt oder die App geschlossen wird.

export interface StoredPendingJob {
  jobId: string;
  format: import("./types").MaterialFormat;
  startedAt: number;
  subject?: string;
  notes?: string;
  from?: { planId: string; session: StoredSession };
  fileCount: number;
}

const PENDING_KEY = "paperpunch-pending-job";
export const PENDING_FILES_KEY = "pending-job";

export const loadPendingJob = () => read<StoredPendingJob>(PENDING_KEY);
export const savePendingJob = (job: StoredPendingJob) => write(PENDING_KEY, job);
export function clearPendingJob() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignorieren
  }
  void clearPlanFiles(PENDING_FILES_KEY);
}
