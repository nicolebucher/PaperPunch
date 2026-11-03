import type { GenerateResult, MaterialFormat, PlanGoal, Profile, QuizOutcome, StudyPlan } from "./types";
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

export async function generateMaterial(opts: {
  profile: Profile;
  format: MaterialFormat;
  files: File[];
  subject?: string;
  notes?: string;
}): Promise<GenerateResult> {
  const body = new FormData();
  profileFields(body, opts.profile);
  body.set("format", opts.format);
  if (opts.subject) body.set("subject", opts.subject.slice(0, 60));
  if (opts.notes) body.set("notes", opts.notes.slice(0, 300));
  opts.files.forEach((f) => body.append("file", f, f.name));
  const json = await post<Record<string, unknown>>("/api/generate", body);
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
}

/**
 * Prüft eine getippte Antwort: erst tolerant auf dem Gerät, nur im Zweifel per KI (kurzer Aufruf).
 * Ohne Verbindung zählt das Ergebnis des Vergleichs auf dem Gerät.
 */
export async function checkTypedAnswer(opts: { question: string; expected: string; accepted?: string[]; given: string; lang: string }): Promise<CheckResult> {
  if (answerMatches(opts.given, opts.expected, opts.accepted)) return { correct: true, feedback: "" };
  try {
    const res = await fetch(`${API_BASE}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: opts.question.slice(0, 600),
        expected: opts.expected.slice(0, 300),
        accepted: opts.accepted?.slice(0, 8),
        given: opts.given.slice(0, 300),
        locale: opts.lang,
      }),
    });
    if (!res.ok) return { correct: false, feedback: "" };
    const json = (await res.json()) as CheckResult;
    return { correct: !!json.correct, feedback: json.feedback ?? "" };
  } catch {
    return { correct: false, feedback: "" };
  }
}
