import { NextRequest, NextResponse } from "next/server";
import { track } from "@vercel/analytics/server";
import {
  checkpointResultSchema,
  planGoalSchema,
  profileSchema,
  studyPlanSchema,
} from "@/types/generation";
import { ALLOWED_MIME_TYPES, MAX_FILES, MAX_TOTAL_SIZE, filesToClaudeBlocks } from "@/lib/files/extract-input";
import { adjustStudyPlan, generateStudyPlan } from "@/lib/generators/study-plan";
import { checkRateLimit } from "@/lib/rate-limit";
import { locales, t, type Locale } from "@/lib/i18n/translations";
import { preflight, withCors } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 120;

function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function parseJson(value: string | undefined): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function POST(request: NextRequest) {
  return withCors(request, await handlePlan(request));
}

/**
 * Erstellt einen Lernplan ("create", Standard) oder passt die restlichen Einheiten nach einem
 * Zwischentest an ("adjust"). Nichts wird gespeichert: Beim Anpassen schickt die App den bisherigen
 * Plan selbst mit.
 */
async function handlePlan(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: t("en").serverErrors.invalidRequest }, { status: 400 });
  }

  const localeValue = field(formData, "locale");
  const locale: Locale = localeValue && (locales as readonly string[]).includes(localeValue) ? (localeValue as Locale) : "en";
  const messages = t(locale).serverErrors;

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!(await checkRateLimit(`plan:${ip}`, 20)) || !(await checkRateLimit(`plan-day:${ip}`, 100, 86400))) {
    return NextResponse.json({ error: messages.tooManyRequests }, { status: 429 });
  }

  const profileResult = profileSchema.safeParse({
    schoolType: field(formData, "schoolType"),
    country: field(formData, "country"),
    grade: field(formData, "grade"),
    subject: field(formData, "subject"),
  });
  const goalResult = planGoalSchema.safeParse({
    subject: field(formData, "subject"),
    testFormat: field(formData, "testFormat"),
    targetGrade: field(formData, "targetGrade"),
    currentGrade: field(formData, "currentGrade"),
    daysUntilTest: field(formData, "daysUntilTest"),
    minutesPerDay: field(formData, "minutesPerDay"),
    topics: field(formData, "topics"),
  });
  if (!profileResult.success || !goalResult.success) {
    return NextResponse.json({ error: messages.invalidProfile }, { status: 400 });
  }
  const profile = profileResult.data;
  const goal = goalResult.data;

  try {
    if (field(formData, "mode") === "adjust") {
      const previous = studyPlanSchema.safeParse(parseJson(field(formData, "previousPlan")));
      const result = checkpointResultSchema.safeParse(parseJson(field(formData, "checkpoint")));
      if (!previous.success || !result.success) {
        return NextResponse.json({ error: messages.invalidRequest }, { status: 400 });
      }
      const plan = await adjustStudyPlan(profile, goal, locale, previous.data, result.data);
      await track("Study plan adjusted");
      return NextResponse.json({ plan });
    }

    const files = formData.getAll("file").filter((entry): entry is File => entry instanceof File);
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: messages.tooManyFiles }, { status: 400 });
    }
    if (files.some((file) => !ALLOWED_MIME_TYPES.has(file.type))) {
      return NextResponse.json({ error: messages.fileTypeInvalid }, { status: 400 });
    }
    if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_SIZE) {
      return NextResponse.json({ error: messages.fileTooLarge }, { status: 400 });
    }

    const plan = await generateStudyPlan(profile, goal, await filesToClaudeBlocks(files), locale);
    await track("Study plan created", { days: goal.daysUntilTest });
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Study plan failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: messages.generationFailed }, { status: 500 });
  }
}
