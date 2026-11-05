import type { CountryCode } from "./countries";
import type { Lang } from "./i18n";

// Spiegelt die Antworten der Website-API (types/generation.ts im Hauptprojekt).

export type MaterialFormat = "worksheet" | "test" | "game" | "podcast";

export interface Profile {
  lang: Lang;
  country: CountryCode;
  schoolType: string;
  grade: number;
  theme?: "dark" | "light";
  /** Wer die App nutzt (ab v0.13; ältere Profile ohne Angabe = Schüler:in). */
  role?: Role;
  /** Eltern: Kinder mit Schulart/Klasse (schoolType/grade oben = gewähltes Kind) */
  children?: Child[];
  childId?: string;
}

export type Role = "student" | "parent" | "teacher";

export interface Child {
  id: string;
  /** optional, bleibt nur auf dem Gerät */
  name: string;
  schoolType: string;
  grade: number;
}

export interface Task {
  number: number;
  question: string;
  type: string;
  options?: string[];
  pairs?: { left: string; right: string }[];
  points: number;
  answer: string;
  acceptedAnswers?: string[];
}

export interface SheetResult {
  data: { title: string; introduction: string; tasks: Task[] };
  filename: string;
  pdfBase64: string;
}

export interface Question {
  type: "multiple-choice" | "lueckentext";
  prompt: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  acceptedAnswers?: string[];
  explanation: string;
}

export interface GameResult {
  game: {
    gameTitle: string;
    subject: string;
    levels: { id: number; title: string; difficulty: string; questions: Question[] }[];
    /** Neue, schwerere Fragen für die Boss-Runde (ältere Spiele haben keine). */
    boss?: Question[];
  };
}

export interface PodcastResult {
  title: string;
  script: string;
  filename: string;
  audioBase64: string;
}

export type GenerateResult =
  | ({ format: "worksheet" | "test" } & SheetResult)
  | ({ format: "game" } & GameResult)
  | ({ format: "podcast" } & PodcastResult);

export type TestFormat = "written" | "oral" | "vocabulary" | "multiple-choice" | "presentation" | "other";

export interface PlanSession {
  dayIndex: number;
  minutes: number;
  kind: "learn" | "practice" | "game" | "podcast" | "checkpoint" | "review";
  format: MaterialFormat;
  topic: string;
  title: string;
  focus: string;
  tip?: string;
}

export interface StudyPlan {
  title: string;
  summary: string;
  feasibility: "realistic" | "ambitious" | "very-ambitious";
  feasibilityNote: string;
  topics: string[];
  sessions: PlanSession[];
}

export interface PlanGoal {
  subject: string;
  testFormat: TestFormat;
  // Früher abgefragt, jetzt optional: ohne Angabe plant die KI auf sicheres Beherrschen des Stoffs.
  targetGrade?: string;
  currentGrade?: string;
  testDate: string; // YYYY-MM-DD, lokales Datum
  minutesPerDay: number;
  topics?: string;
}

export interface StoredSession extends PlanSession {
  id: string;
}

export interface QuizOutcome {
  correct: number;
  total: number;
  missed: string[];
}

/** Der aktive Lernplan, nur auf dem Gerät gespeichert. */
export interface ActivePlan {
  id: string;
  plan: Omit<StudyPlan, "sessions">;
  sessions: StoredSession[];
  goal: PlanGoal;
  startDate: string; // YYYY-MM-DD, Tag 0 des Plans
  done: string[]; // Session-IDs
  results: Record<string, QuizOutcome>;
  hasFiles: boolean;
}
