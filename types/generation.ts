import { z } from "zod";

export const schoolTypes = [
  "Grundschule",
  "Hauptschule",
  "Realschule",
  "Gesamtschule",
  "Gymnasium",
  "Berufsschule",
] as const;

// Länder der Android-App (Schulsystem, Klassenbezeichnung, Notenskala). Die Web-App sendet keins.
export const countries = ["DE", "AT", "CH", "GB", "IE", "US", "CA", "AU", "OTHER"] as const;
export type Country = (typeof countries)[number];

const COUNTRY_NAMES: Record<Country, string> = {
  DE: "Germany", AT: "Austria", CH: "Switzerland", GB: "the United Kingdom", IE: "Ireland",
  US: "the United States", CA: "Canada", AU: "Australia", OTHER: "an unspecified country",
};

export const outputFormats = ["worksheet", "test", "game", "podcast", "spelling"] as const;
export type OutputFormat = (typeof outputFormats)[number];

// Alle Profilangaben sind bewusst optional - das Lernmaterial im Upload trägt den
// eigentlichen Inhalt, Alter/Klasse/Schulart/Fach dienen nur der Feinabstimmung.
export const profileSchema = z.object({
  // Freitext statt fester Liste: Die App schickt länderabhängige Schularten (inkl. "Sonstiges"/"Other").
  schoolType: z.string().trim().min(1).max(60).optional(),
  country: z.enum(countries).optional(),
  grade: z.coerce.number().int().min(1).max(13).optional(),
  subject: z.string().trim().min(2).max(60).optional(),
  notes: z.string().trim().min(1).max(300).optional(),
});
export type Profile = z.infer<typeof profileSchema>;

// Nur für den (englischen) System-Prompt gedacht - beschreibt die Zielgruppe fürs Modell,
// unabhängig von der später gewählten Ausgabesprache des generierten Inhalts. Wenn Angaben
// fehlen: Oberschule (allgemeine Sekundarstufe) als Standardannahme, Klasse aus dem Material schätzen.
export function describeProfile(profile: Profile, hasMaterial = true): string {
  const parts: string[] = [];
  if (profile.country) parts.push(`school system of ${COUNTRY_NAMES[profile.country]}`);
  parts.push(
    profile.schoolType
      ? profile.schoolType
      : "no school type given - assume a general secondary school (\"Oberschule\") student"
  );
  parts.push(
    profile.grade !== undefined
      ? `grade ${profile.grade}`
      : hasMaterial
        ? "grade not given - estimate the appropriate grade level yourself from the complexity/topic of the uploaded material"
        : "grade not given - estimate the appropriate grade level yourself from the topic"
  );
  if (profile.subject) parts.push(`subject: ${profile.subject}`);
  if (profile.notes) parts.push(`the student's own note/request: "${profile.notes}" (take this into account for topic focus and content selection, as long as it doesn't conflict with the instructions above)`);
  return parts.join(", ");
}

// Nutzersichtbare Meta-Zeile auf dem PDF - die Wortwahl kommt von der KI (data.labels.grade),
// passend zur Sprache des generierten Inhalts statt zur UI-Sprache.
export function formatProfileMeta(profile: Profile, gradeLabel: string): string {
  return [profile.subject, profile.schoolType, profile.grade !== undefined ? `${gradeLabel} ${profile.grade}` : undefined]
    .filter((part): part is string => !!part)
    .join(" · ");
}

export const taskSchema = z
  .object({
    number: z.number(),
    question: z.string(),
    type: z.enum(["offen", "multiple-choice", "lueckentext", "unterstreichen", "zuordnen"]),
    // multiple-choice: die Antwortoptionen. unterstreichen: die Wörter/Phrasen zum Ankreuzen/Unterstreichen.
    options: z.array(z.string()).optional(),
    // nur für type "zuordnen": linke/rechte Spalte zum Zuordnen (rechte Spalte wird beim Rendern gemischt).
    pairs: z.array(z.object({ left: z.string(), right: z.string() })).optional(),
    points: z.number(),
    answer: z.string(),
    // Weitere richtige Schreibweisen/Synonyme für die Online-Prüfung (z. B. "GCF", "ggT", "0,75").
    acceptedAnswers: z.array(z.string()).max(8).optional(),
    // Kurze Erklärung (Regel/Merkhilfe), nur beim Online-Lösen nach dem Antworten sichtbar – nicht im PDF.
    explanation: z.string().optional(),
  })
  // Verhindert eine Lösung, die nicht zur Aufgabe passt: bei multiple-choice/unterstreichen muss
  // "answer" wortgleich eine der "options" sein, statt z.B. ein Buchstabe oder eine Umschreibung -
  // sonst schlägt die Validierung fehl und der Retry in structured-output.ts fordert eine Korrektur an.
  .refine(
    (task) => {
      if (task.type === "multiple-choice" || task.type === "unterstreichen") {
        return !!task.options && task.options.includes(task.answer);
      }
      return true;
    },
    {
      message:
        'For a "multiple-choice" or "unterstreichen" task, "answer" must be an exact, verbatim copy of one of the "options" strings - not a letter, index, or paraphrase.',
      path: ["answer"],
    }
  );
export type Task = z.infer<typeof taskSchema>;

// Von der KI in derselben Sprache wie der restliche Inhalt zurückgegebene Beschriftungen -
// dadurch passen die PDF-Überschriften zur Dokumentsprache, unabhängig vom UI-Sprachschalter.
export const pdfLabelsSchema = z.object({
  task: z.string(),
  points: z.string(),
  totalPoints: z.string(),
  solutions: z.string(),
  name: z.string(),
  date: z.string(),
  grade: z.string(),
});
export type PdfLabels = z.infer<typeof pdfLabelsSchema>;

// Arbeitsblatt: bewusst umfangreich (mind. 3 PDF-Seiten gewünscht).
export const worksheetSchema = z.object({
  title: z.string(),
  introduction: z.string(),
  tasks: z.array(taskSchema).min(16).max(24),
  labels: pdfLabelsSchema,
});
export type WorksheetData = z.infer<typeof worksheetSchema>;

// Testarbeit bleibt in realistischer Klassenarbeits-Länge (separates Schema, gleiche Form).
export const testSchema = z.object({
  title: z.string(),
  introduction: z.string(),
  tasks: z.array(taskSchema).min(6).max(10),
  labels: pdfLabelsSchema,
});

const questionBaseSchema = z.object({
    type: z.enum(["multiple-choice", "lueckentext"]),
    prompt: z.string(),
    // nur "multiple-choice":
    options: z.array(z.string()).min(2).max(5).optional(),
    correctIndex: z.number().int().min(0).optional(),
    // nur "lueckentext": "prompt" enthält eine "___"-Lücke, der Schüler tippt die Antwort.
    correctAnswer: z.string().optional(),
    // nur "lueckentext": weitere richtige Schreibweisen/Synonyme/Abkürzungen.
    acceptedAnswers: z.array(z.string()).max(8).optional(),
    explanation: z.string(),
  });

export const questionSchema = questionBaseSchema
  // Verhindert eine Lösung, die nicht zur Aufgabe passt (fehlende/inkonsistente Felder je Typ).
  .refine(
    (q) => {
      if (q.type === "multiple-choice") {
        return !!q.options && q.correctIndex !== undefined && q.correctIndex < q.options.length;
      }
      return !!q.correctAnswer && q.correctAnswer.trim() !== "" && q.prompt.includes("___");
    },
    {
      message:
        'A "multiple-choice" question needs "options" and a valid "correctIndex"; a "lueckentext" question needs "correctAnswer" and a "___" gap in "prompt".',
    }
  );
export type Question = z.infer<typeof questionSchema>;

// Level bewusst länger (mind. 8 Aufgaben je Level), aber gedeckelt, damit die Generierung
// auch bei umfangreichem Material innerhalb des Server-Zeitlimits fertig wird.
export const levelSchema = z.object({
  id: z.number(),
  title: z.string(),
  difficulty: z.enum(["leicht", "mittel", "schwer"]),
  questions: z.array(questionSchema).min(8).max(12),
});
export type Level = z.infer<typeof levelSchema>;

export const gameSchema = z.object({
  gameTitle: z.string(),
  subject: z.string(),
  levels: z.array(levelSchema).min(2).max(4),
  // Boss-Runde der App: neue, schwerere Fragen zum selben Thema (keine Wiederholung aus den Leveln).
  // Optional, damit ältere Spiele und Challenges weiter gültig sind.
  // Bewusst ohne Einzelprüfung: eine fehlerhafte Boss-Frage soll nicht das ganze Spiel scheitern lassen –
  // der Generator behält nur gültige Fragen (lib/generators/game-levels.ts).
  boss: z.array(questionBaseSchema).max(10).optional(),
});
export type GameData = z.infer<typeof gameSchema>;

// Zum Teilen (Lerngruppe, Challenge) bewusst großzügiger als beim Erstellen: Lehrkräfte passen Spiele
// vorher an (Fragen löschen bis auf 3, Level mit 6 Fragen neu erstellen). Mit dem strengen Erstell-Schema
// scheiterte das Anlegen der Gruppe dann mit "invalid". Längen bleiben gedeckelt.
export const sharedGameSchema = z.object({
  gameTitle: z.string().max(200),
  subject: z.string().max(100),
  levels: z
    .array(
      z.object({
        id: z.number(),
        title: z.string().max(200),
        difficulty: z.enum(["leicht", "mittel", "schwer"]),
        questions: z.array(questionSchema).min(1).max(20),
      })
    )
    .min(1)
    .max(6),
  boss: z.array(questionBaseSchema).max(12).optional(),
});

// Ein-Sprecher-Skript (bewusst kein Multi-Speaker-Dialog, damit kein Audio-Mixing/ffmpeg
// nötig ist). "script" enthält die vollständige Erzählung, in Absätze gegliedert.
export const podcastScriptSchema = z.object({
  title: z.string(),
  script: z.string(),
});
export type PodcastScript = z.infer<typeof podcastScriptSchema>;

// Rechtschreib-Diagnose: ein Satz mit Lücke ("___") an der Stelle des zu übenden Worts, plus
// dessen korrekte Schreibweise. Der Schüler tippt die Antwort selbst (Produktion statt bloßer
// Erkennung) - das eigentliche Problem laut Lehrer-Feedback ist ja das Schreiben, nicht das
// Wiedererkennen unter Auswahlmöglichkeiten.
export const spellingItemSchema = z.object({
  number: z.number(),
  sentence: z.string(),
  correctSpelling: z.string(),
  // Macht das gemeinte Wort unmissverständlich (Synonym/Definition/Übersetzung), ohne es
  // vorzuschreiben - die Aufgabe testet die Schreibweise eines bekannten Worts, nicht das
  // Erraten, welches Wort überhaupt gemeint ist.
  hint: z.string(),
});
export type SpellingItem = z.infer<typeof spellingItemSchema>;

export const spellingDiagnosticSchema = z.object({
  title: z.string(),
  items: z.array(spellingItemSchema).min(10).max(15),
});
export type SpellingDiagnostic = z.infer<typeof spellingDiagnosticSchema>;

// ---------------------------------------------------------------------------
// Lernplan (Android-App, MVP). Der Plan wird NICHT auf dem Server gespeichert: Die App hält ihn
// lokal auf dem Gerät und schickt ihn zum Anpassen nach einem Zwischentest zurück.
// ---------------------------------------------------------------------------

export const planSessionKinds = ["learn", "practice", "game", "podcast", "checkpoint", "review"] as const;
export const planMaterialFormats = ["worksheet", "test", "game", "podcast"] as const;
export const testFormats = ["written", "oral", "vocabulary", "multiple-choice", "presentation", "other"] as const;

export const planSessionSchema = z.object({
  // 0 = heute. Die letzte Einheit liegt spätestens am Tag vor dem Test.
  dayIndex: z.number().int().min(0).max(90),
  minutes: z.number().int().min(5).max(120),
  kind: z.enum(planSessionKinds),
  // Welches PaperPunch-Format die Einheit erzeugt. Zwischentests sind immer "game", weil die App sie
  // selbst auswerten kann (offene Testaufgaben lassen sich nicht automatisch bewerten).
  format: z.enum(planMaterialFormats),
  topic: z.string().min(1).max(80),
  title: z.string().min(1).max(80),
  // Wird als Notiz an /api/generate geschickt und steuert, was das Material abdeckt.
  focus: z.string().min(1).max(280),
  tip: z.string().max(200).optional(),
});
export type PlanSession = z.infer<typeof planSessionSchema>;

export const studyPlanSchema = z
  .object({
    title: z.string().min(1).max(80),
    summary: z.string().min(1).max(400),
    feasibility: z.enum(["realistic", "ambitious", "very-ambitious"]),
    feasibilityNote: z.string().min(1).max(300),
    topics: z.array(z.string().min(1).max(80)).min(1).max(10),
    sessions: z.array(planSessionSchema).min(1).max(45),
  })
  .refine((plan) => plan.sessions.every((s) => s.kind !== "checkpoint" || s.format === "game"), {
    message: 'Every "checkpoint" session must use format "game".',
  });
export type StudyPlan = z.infer<typeof studyPlanSchema>;

export const planGoalSchema = z.object({
  subject: z.string().trim().min(2).max(60),
  testFormat: z.enum(testFormats),
  // Freitext in der Skala des Landes, z.B. "2", "11 Punkte", "Grade 7", "B". Die App fragt sie derzeit
  // nicht ab - ohne Angabe plant die KI auf sicheres Beherrschen des Stoffs.
  targetGrade: z.string().trim().min(1).max(30).optional(),
  currentGrade: z.string().trim().min(1).max(30).optional(),
  // Kalendertage bis zum Test, von der App aus dem lokalen Datum berechnet (Zeitzone des Geräts).
  daysUntilTest: z.coerce.number().int().min(1).max(90),
  minutesPerDay: z.coerce.number().int().min(10).max(120),
  topics: z.string().trim().max(500).optional(),
});
export type PlanGoal = z.infer<typeof planGoalSchema>;

export const checkpointResultSchema = z.object({
  title: z.string().max(80),
  correct: z.number().int().min(0),
  total: z.number().int().min(1),
  missed: z.array(z.string().max(300)).max(40),
  // Tage seit Planbeginn, an dem der Zwischentest gemacht wurde.
  dayIndex: z.number().int().min(0).max(90),
});
export type CheckpointResult = z.infer<typeof checkpointResultSchema>;

// Prüfung einer Freitext-Antwort durch die KI, wenn der einfache Vergleich nicht reicht.
export const answerCheckSchema = z.object({
  correct: z.boolean(),
  // kurz, freundlich, in der Sprache der Frage; bei "falsch" ein Hinweis ohne die Lösung zu verraten
  feedback: z.string().max(200),
});
export type AnswerCheck = z.infer<typeof answerCheckSchema>;
