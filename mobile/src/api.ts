import type { GameResult, GenerateResult, MaterialFormat, PlanGoal, Profile, QuizOutcome, StudyPlan } from "./types";
import { daysBetween, todayISO } from "./dates";
import { answerMatches } from "./answerMatch";

// Die App hat keine eigene KI-Schnittstelle: Sie ruft die API der Website auf.
// Standard ist die feste Vercel-Adresse der Website – sie funktioniert immer, auch bevor paper-punch.com
// eingerichtet ist. Mit VITE_API_BASE (z. B. in .env.local) lässt sich eine andere Adresse setzen.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "https://snap-it-new.vercel.app";

export class ApiError extends Error {
  constructor(message: string, readonly network = false) {
    super(message);
  }
}

async function post<T>(path: string, body: FormData): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: "POST", body });
  } catch {
    throw new ApiError("network", true);
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // keine JSON-Antwort, z.B. Zeitüberschreitung des Servers
  }
  if (!res.ok) {
    const message = (json as { error?: string } | null)?.error;
    throw new ApiError(message || `HTTP ${res.status}`);
  }
  return json as T;
}

function profileFields(body: FormData, profile: Profile) {
  body.set("locale", profile.lang);
  body.set("country", profile.country);
  body.set("schoolType", profile.schoolType);
  body.set("grade", String(profile.grade));
}

export interface PendingJob {
  jobId: string;
  format: MaterialFormat;
  startedAt: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Wartet auf einen Hintergrund-Job der Website. Läuft weiter, wenn die App pausiert war (Handy gesperrt):
 * Timer stehen dann still, beim Zurückkommen wird sofort weiter abgefragt.
 */
export async function waitForJob(jobId: string, format: MaterialFormat, maxMinutes = 10): Promise<GenerateResult> {
  const deadline = Date.now() + maxMinutes * 60_000;
  let failures = 0;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, { cache: "no-store" });
      const json = (await res.json()) as { status: string; result?: Record<string, unknown>; error?: string };
      failures = 0;
      if (json.status === "done" && json.result) {
        void fetch(`${API_BASE}/api/jobs/${jobId}`, { method: "DELETE" }).catch(() => undefined);
        return { format, ...json.result } as GenerateResult;
      }
      if (json.status === "error") throw new ApiError(json.error || "error");
    } catch (error) {
      if (error instanceof ApiError) throw error;
      // kurz offline (z. B. direkt nach dem Entsperren) – weiter versuchen
      if (++failures > 20) throw new ApiError("network", true);
    }
    await sleep(3000);
  }
  throw new ApiError("timeout");
}

/**
 * Erstellt Material als Hintergrund-Job: Die Website antwortet sofort mit einer Job-ID und arbeitet weiter,
 * auch wenn das Handy gesperrt oder die App geschlossen wird. onJob speichert die ID, damit die App das
 * Ergebnis nach einem Neustart abholen kann. Antwortet der Server direkt mit dem Ergebnis, wird es übernommen.
 */
export async function generateMaterial(opts: {
  profile: Profile;
  format: MaterialFormat;
  files: File[];
  subject?: string;
  notes?: string;
  onJob?: (job: PendingJob) => void;
}): Promise<GenerateResult> {
  const body = new FormData();
  profileFields(body, opts.profile);
  body.set("format", opts.format);
  body.set("async", "1");
  if (opts.subject) body.set("subject", opts.subject.slice(0, 60));
  if (opts.notes) body.set("notes", opts.notes.slice(0, 300));
  opts.files.forEach((f) => body.append("file", f, f.name));
  const json = await post<Record<string, unknown>>("/api/generate", body);
  if (typeof json.jobId === "string") {
    opts.onJob?.({ jobId: json.jobId, format: opts.format, startedAt: Date.now() });
    return waitForJob(json.jobId, opts.format);
  }
  return { format: opts.format, ...json } as GenerateResult;
}

function goalFields(body: FormData, goal: PlanGoal) {
  body.set("subject", goal.subject);
  body.set("testFormat", goal.testFormat);
  if (goal.targetGrade) body.set("targetGrade", goal.targetGrade);
  if (goal.currentGrade) body.set("currentGrade", goal.currentGrade);
  body.set("daysUntilTest", String(daysBetween(todayISO(), goal.testDate)));
  body.set("minutesPerDay", String(goal.minutesPerDay));
  if (goal.topics) body.set("topics", goal.topics);
}

export async function createPlan(profile: Profile, goal: PlanGoal, files: File[]): Promise<StudyPlan> {
  const body = new FormData();
  profileFields(body, profile);
  goalFields(body, goal);
  files.forEach((f) => body.append("file", f, f.name));
  const { plan } = await post<{ plan: StudyPlan }>("/api/plan", body);
  return plan;
}

/**
 * Passt die restlichen Einheiten nach einem Zwischentest an. Der Plan zählt die Tage ab seinem
 * Start, die API erwartet "daysUntilTest" ebenfalls relativ zum Planstart.
 */
export async function adjustPlan(opts: {
  profile: Profile;
  goal: PlanGoal;
  startDate: string;
  plan: StudyPlan;
  checkpointTitle: string;
  outcome: QuizOutcome;
}): Promise<StudyPlan> {
  const body = new FormData();
  profileFields(body, opts.profile);
  goalFields(body, opts.goal);
  body.set("daysUntilTest", String(daysBetween(opts.startDate, opts.goal.testDate)));
  body.set("mode", "adjust");
  body.set("previousPlan", JSON.stringify(opts.plan));
  body.set(
    "checkpoint",
    JSON.stringify({
      title: opts.checkpointTitle.slice(0, 80),
      correct: opts.outcome.correct,
      total: Math.max(opts.outcome.total, 1),
      missed: opts.outcome.missed.slice(0, 40).map((m) => m.slice(0, 300)),
      dayIndex: daysBetween(opts.startDate, todayISO()),
    })
  );
  const { plan } = await post<{ plan: StudyPlan }>("/api/plan", body);
  return plan;
}

export interface CheckResult {
  correct: boolean;
  feedback: string;
  /** Prüfung nicht möglich (offline, Limit, Serverfehler) – nicht als falsch werten. */
  error?: boolean;
}

/**
 * Prüft eine getippte Antwort: erst tolerant auf dem Gerät, nur im Zweifel per KI (kurzer Aufruf).
 * Ohne Verbindung zählt das Ergebnis des Vergleichs auf dem Gerät.
 */
export async function checkTypedAnswer(opts: { question: string; expected: string; accepted?: string[]; given: string; lang: string }): Promise<CheckResult> {
  if (answerMatches(opts.given, opts.expected, opts.accepted, opts.question)) return { correct: true, feedback: "" };
  try {
    const res = await fetch(`${API_BASE}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: opts.question.slice(0, 600),
        expected: opts.expected.slice(0, 300),
        accepted: opts.accepted?.slice(0, 8).map((a) => a.slice(0, 120)),
        given: opts.given.slice(0, 300),
        locale: opts.lang,
      }),
    });
    if (!res.ok) return { correct: false, feedback: "", error: true };
    const json = (await res.json()) as CheckResult;
    return { correct: !!json.correct, feedback: json.feedback ?? "" };
  } catch {
    return { correct: false, feedback: "", error: true };
  }
}

/** Bewertung eines Lernmaterials an die Website schicken (dort landet sie im Google Sheet). Fehler werden ignoriert. */
export async function sendRating(r: {
  stars: number;
  text: string;
  format: MaterialFormat;
  title: string;
  subject?: string;
  profile: Profile;
  score?: { correct: number; total: number };
}): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stars: r.stars,
        text: r.text,
        format: r.format,
        title: r.title,
        subject: r.subject,
        lang: r.profile.lang,
        country: r.profile.country,
        schoolType: r.profile.schoolType,
        grade: r.profile.grade,
        score: r.score,
        source: "app",
      }),
    });
  } catch {
    // offline: Bewertung geht verloren, das ist okay
  }
}

/** Challenge anlegen: Spiel + Spitzname + Anteil richtiger Antworten → Link paper-punch.com/c/CODE. */
export async function createChallenge(game: GameResult["game"], name: string, pct: number | undefined, lang: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/challenges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game, name, pct, lang: lang === "en" ? "en" : "de" }),
    });
  } catch {
    throw new ApiError("network", true);
  }
  if (!res.ok) throw new ApiError(`HTTP ${res.status}`);
  return ((await res.json()) as { url: string }).url;
}
