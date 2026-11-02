import { describeProfile, type CheckpointResult, type PlanGoal, type Profile, type StudyPlan } from "@/types/generation";
import type { Locale } from "@/lib/i18n/translations";

const LANGUAGE_NAMES: Record<Locale, string> = { en: "English", de: "German" };

const TEST_FORMAT_NAMES: Record<PlanGoal["testFormat"], string> = {
  written: "a written classroom test",
  oral: "an oral exam",
  vocabulary: "a vocabulary test",
  "multiple-choice": "a multiple-choice test",
  presentation: "a presentation",
  other: "a test (format not specified)",
};

function describeGoal(goal: PlanGoal): string {
  return [
    `subject: ${goal.subject}`,
    `the test is ${TEST_FORMAT_NAMES[goal.testFormat]}`,
    `the test is in ${goal.daysUntilTest} day(s) (day index ${goal.daysUntilTest}; today is day index 0)`,
    `target grade the student considers "good enough": ${goal.targetGrade}`,
    goal.currentGrade ? `the student's current grade/level in this subject: ${goal.currentGrade}` : undefined,
    `time available per day: about ${goal.minutesPerDay} minutes`,
    goal.topics ? `topics the student says will be covered: "${goal.topics}"` : undefined,
  ]
    .filter(Boolean)
    .join("\n- ");
}

const SESSION_RULES = `Session rules:
- "dayIndex": 0 = today. Never schedule anything on or after the test day; the last session is at
  the latest on the day before the test. Leave a lighter day or a rest day roughly every 4-5 days on
  longer plans, and keep each day within the student's daily minutes (several sessions on one day
  must add up to no more than that).
- "format" decides which material the app generates for the session: "worksheet" (practice sheet
  with answer key), "test" (exam-style test), "game" (quiz levels played in the app), "podcast"
  (audio explanation for listening). Use "podcast" mainly for introducing or revising concepts,
  "worksheet" for practising methods, "test" close to the test date as a dress rehearsal for a
  written test, "game" for quick drills and vocabulary.
- "kind": "learn" (first contact with a topic), "practice", "game", "podcast", "review" (revisit
  earlier topics, spaced repetition), "checkpoint" (an intermediate progress test).
- Checkpoints: every "checkpoint" session MUST use format "game" (the app scores it automatically).
  Plans of 5+ days get 2 checkpoints (around the middle and a few days before the test); plans of
  2-4 days get 1 checkpoint; a 1-day plan gets none. A checkpoint covers all topics learned so far.
- "focus": one or two concrete sentences telling the material generator exactly what this session
  covers (topic, sub-skills, difficulty). It is sent verbatim as the student's note to the
  generator, so write it as an instruction, e.g. "Practise adding fractions with different
  denominators, medium difficulty, include word problems."
- Sequence topics sensibly: foundations first, then harder material, mixed review towards the end.
- Map the target grade to effort: a modest target needs solid coverage of the core topics; a top
  grade needs the harder tasks and more mixed practice.`;

export function buildStudyPlanSystemPrompt(profile: Profile, goal: PlanGoal, locale: Locale, hasMaterial: boolean): string {
  return `You are an experienced teacher and learning coach. Build a realistic day-by-day study plan
that gets a student from where they are now to their target grade in a specific upcoming test.

Student: ${describeProfile(profile, hasMaterial)}.
Goal:
- ${describeGoal(goal)}

${hasMaterial
    ? "The attached files are the student's study material for this test (notes, textbook pages, worksheets). Derive the topics from them."
    : "No material was attached. Derive the topics from the subject and the topics the student named, using standard school-curriculum content at the student's level for that school system."}

${SESSION_RULES}

Also return:
- "title": a short name for the plan, e.g. "Fractions test - target 2".
- "summary": two or three sentences on how the plan gets the student to the target.
- "feasibility": "realistic", "ambitious" or "very-ambitious", judged honestly from the time left,
  daily minutes, the amount of material and the gap between current and target grade.
  "feasibilityNote": one or two sentences explaining that judgement and, if it is ambitious, what
  would help (e.g. more minutes per day). Be encouraging but honest; never promise a grade.
- "topics": the list of topics the plan covers, in learning order.

Write every text field (title, summary, feasibilityNote, topics, session titles, focus, tip) in
${LANGUAGE_NAMES[locale]}, unless the subject is a foreign language, in which case the focus text
may name the target-language items the way a textbook would.`;
}

export function buildPlanAdjustSystemPrompt(
  profile: Profile,
  goal: PlanGoal,
  locale: Locale,
  previousPlan: StudyPlan,
  result: CheckpointResult
): string {
  const percent = Math.round((result.correct / result.total) * 100);
  const remaining = previousPlan.sessions.filter((s) => s.dayIndex > result.dayIndex);
  return `${buildStudyPlanSystemPrompt(profile, goal, locale, false)}

ADJUSTMENT MODE. The student is already following a plan and has just taken an intermediate test.
Today is day index ${result.dayIndex} of the plan; the test is on day index ${goal.daysUntilTest}.

Intermediate test "${result.title}": ${result.correct} of ${result.total} correct (${percent}%).
Questions the student got wrong:
${result.missed.length ? result.missed.map((m) => `- ${m}`).join("\n") : "- none"}

The remaining sessions of the current plan are:
${JSON.stringify(remaining)}

Return the revised plan. Rules for the revision:
- "sessions" contains ONLY sessions with dayIndex greater than ${result.dayIndex} (completed days are
  kept by the app). If no days are left before the test, return a single short review session on
  day index ${Math.min(result.dayIndex + 1, goal.daysUntilTest - 1)}.
- Shift time towards the weak areas shown by the wrong answers; shorten or drop sessions on topics
  the student clearly masters. Keep the daily minutes limit.
- Re-judge "feasibility" and "feasibilityNote" with this result in mind.
- Keep "title" and "topics" unless the result shows a topic is missing.`;
}
