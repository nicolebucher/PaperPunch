import {
  studyPlanSchema,
  type CheckpointResult,
  type PlanGoal,
  type PlanSession,
  type Profile,
  type StudyPlan,
} from "@/types/generation";
import { generateStructuredOutput } from "@/lib/ai/structured-output";
import { buildPlanAdjustSystemPrompt, buildStudyPlanSystemPrompt } from "@/lib/ai/prompts/study-plan.prompt";
import { isMockMode } from "@/lib/env";
import type { ClaudeFileBlock } from "@/lib/files/extract-input";
import type { Locale } from "@/lib/i18n/translations";

/** Sorts sessions and drops any that fall outside the allowed day range. */
function tidySessions(sessions: PlanSession[], firstDay: number, daysUntilTest: number): PlanSession[] {
  return sessions
    .filter((s) => s.dayIndex >= firstDay && s.dayIndex < daysUntilTest)
    .sort((a, b) => a.dayIndex - b.dayIndex);
}

/** Deterministic plan for AI_MOCK=true, so the app flow works without an API key. */
function mockPlan(goal: PlanGoal, locale: Locale, firstDay = 0): StudyPlan {
  const de = locale === "de";
  const topics = de ? ["Grundlagen", "Rechenwege", "Anwendungsaufgaben"] : ["Basics", "Methods", "Word problems"];
  const sessions: PlanSession[] = [];
  const last = goal.daysUntilTest - 1;
  const checkpoints = goal.daysUntilTest >= 5 ? [Math.floor(last / 2), Math.max(last - 1, 1)] : goal.daysUntilTest >= 2 ? [last] : [];
  for (let day = firstDay; day <= last; day++) {
    const topic = topics[Math.min(Math.floor((day / Math.max(last, 1)) * topics.length), topics.length - 1)];
    if (checkpoints.includes(day)) {
      sessions.push({
        dayIndex: day, minutes: Math.min(goal.minutesPerDay, 20), kind: "checkpoint", format: "game", topic,
        title: de ? "Zwischentest" : "Progress check",
        focus: de ? `Gemischte Fragen zu allen bisherigen Themen in ${goal.subject}.` : `Mixed questions on all topics so far in ${goal.subject}.`,
      });
      continue;
    }
    const format = (["podcast", "worksheet", "game", "worksheet"] as const)[day % 4];
    sessions.push({
      dayIndex: day, minutes: goal.minutesPerDay, kind: day % 4 === 0 ? "learn" : "practice", format, topic,
      title: `${goal.subject}: ${topic}`,
      focus: de ? `Übe ${topic} in ${goal.subject}, mittlere Schwierigkeit.` : `Practise ${topic} in ${goal.subject}, medium difficulty.`,
      tip: de ? "Erst die Beispiele anschauen, dann selbst rechnen." : "Look at the examples first, then try on your own.",
    });
  }
  return {
    title: de ? `${goal.subject}-Test` : `${goal.subject} test`,
    summary: de
      ? "Erst die Grundlagen, dann die Rechenwege, zum Schluss gemischte Aufgaben wie im Test. Zwei Zwischentests zeigen, ob du auf Kurs bist."
      : "Basics first, then methods, then mixed test-style tasks. Two progress checks show whether you're on track.",
    feasibility: goal.daysUntilTest >= 7 ? "realistic" : "ambitious",
    feasibilityNote: de ? "Mit täglicher Übung gut machbar." : "Very doable if you practise every day.",
    topics,
    sessions,
  };
}

export async function generateStudyPlan(
  profile: Profile,
  goal: PlanGoal,
  fileBlocks: ClaudeFileBlock[],
  locale: Locale
): Promise<StudyPlan> {
  const plan = isMockMode()
    ? mockPlan(goal, locale)
    : await generateStructuredOutput({
        system: buildStudyPlanSystemPrompt(profile, goal, locale, fileBlocks.length > 0),
        userContent: [
          ...fileBlocks,
          { type: "text", text: fileBlocks.length > 0 ? "Create the study plan for this material." : "Create the study plan for this goal." },
        ],
        schema: studyPlanSchema,
        toolName: "create_study_plan",
        toolDescription: "Creates a day-by-day study plan with learning sessions and progress checks towards a target grade.",
        maxTokens: 12000,
      });
  return { ...plan, sessions: tidySessions(plan.sessions, 0, goal.daysUntilTest) };
}

export async function adjustStudyPlan(
  profile: Profile,
  goal: PlanGoal,
  locale: Locale,
  previousPlan: StudyPlan,
  result: CheckpointResult
): Promise<StudyPlan> {
  const firstDay = result.dayIndex + 1;
  const plan = isMockMode()
    ? mockPlan(goal, locale, firstDay)
    : await generateStructuredOutput({
        system: buildPlanAdjustSystemPrompt(profile, goal, locale, previousPlan, result),
        userContent: [{ type: "text", text: "Revise the remaining study plan based on the intermediate test." }],
        schema: studyPlanSchema,
        toolName: "revise_study_plan",
        toolDescription: "Returns the revised remaining sessions of a study plan after an intermediate test.",
        maxTokens: 12000,
      });
  return { ...plan, sessions: tidySessions(plan.sessions, firstDay, goal.daysUntilTest) };
}
