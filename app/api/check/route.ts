import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { answerCheckSchema } from "@/types/generation";
import { generateStructuredOutput } from "@/lib/ai/structured-output";
import { buildAnswerCheckSystemPrompt } from "@/lib/ai/prompts/answer-check.prompt";
import { answerMatches } from "@/lib/answer-match";
import { isMockMode } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { locales, t, type Locale } from "@/lib/i18n/translations";
import { preflight, withCors } from "@/lib/cors";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  question: z.string().trim().min(1).max(600),
  expected: z.string().trim().min(1).max(300),
  accepted: z.array(z.string().max(120)).max(8).optional(),
  given: z.string().trim().min(1).max(300),
  locale: z.enum(locales as [Locale, ...Locale[]]).optional(),
});

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function POST(request: NextRequest) {
  return withCors(request, await handleCheck(request));
}

/**
 * Prüft eine Freitext-Antwort, die der einfache Vergleich in der App nicht als richtig erkannt hat.
 * Kurzer, günstiger KI-Aufruf; nichts wird gespeichert.
 */
async function handleCheck(request: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: t("en").serverErrors.invalidRequest }, { status: 400 });
  }
  const locale = body.locale ?? "en";

  if (answerMatches(body.given, body.expected, body.accepted, body.question)) {
    return NextResponse.json({ correct: true, feedback: "" });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!(await checkRateLimit(`check:${ip}`, 200)) || !(await checkRateLimit(`check-day:${ip}`, 2000, 86400))) {
    return NextResponse.json({ error: t(locale).serverErrors.tooManyRequests }, { status: 429 });
  }

  if (isMockMode()) {
    return NextResponse.json({ correct: false, feedback: locale === "de" ? "Fast – schau dir den Begriff nochmal genau an." : "Close – take another look at the term." });
  }

  try {
    const result = await generateStructuredOutput({
      system: buildAnswerCheckSystemPrompt(locale),
      userContent: [
        {
          type: "text",
          text: `Question: ${body.question}\nExpected answer: ${body.expected}${body.accepted?.length ? `\nAlso accepted: ${body.accepted.join("; ")}` : ""}\nStudent's answer: ${body.given}`,
        },
      ],
      schema: answerCheckSchema,
      toolName: "check_answer",
      toolDescription: "Returns whether the student's answer is correct in substance, with one short feedback sentence.",
      maxTokens: 300,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Answer check failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: t(locale).serverErrors.generationFailed }, { status: 500 });
  }
}
