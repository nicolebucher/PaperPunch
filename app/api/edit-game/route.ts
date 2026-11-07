import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { questionSchema, type Question } from "@/types/generation";
import { generateStructuredOutput } from "@/lib/ai/structured-output";
import { buildReplaceLevelPrompt, buildReplaceQuestionPrompt } from "@/lib/ai/prompts/game-edit.prompt";
import { checkRateLimit } from "@/lib/rate-limit";
import { isMockMode } from "@/lib/env";
import { shuffleQuestionOptions } from "@/lib/shuffle-options";
import { preflight, withCors } from "@/lib/cors";

// Lernspiel anpassen (Lehrkräfte vor dem Teilen): eine Frage ersetzen oder ein ganzes Level neu erstellen.
// Zählt nicht zum Wochen-Kontingent – nur ein IP-Limit gegen Missbrauch.

export const runtime = "nodejs";
export const maxDuration = 120;

const str = (max: number) => z.string().max(max);
// Eingehende Fragen nur grob prüfen (sie stammen aus dem eigenen Spiel), Längen begrenzen.
const inQuestion = z.object({
  type: z.enum(["multiple-choice", "lueckentext", "zuordnen"]),
  prompt: str(600),
  pairs: z.array(z.object({ left: str(120), right: str(120) })).max(6).optional(),
  options: z.array(str(200)).max(6).optional(),
  correctIndex: z.number().int().min(0).max(5).optional(),
  correctAnswer: str(200).optional(),
  acceptedAnswers: z.array(str(120)).max(10).optional(),
  explanation: str(800).optional().default(""),
});
const inLevel = z.object({ title: str(120), difficulty: str(20).optional(), questions: z.array(inQuestion).max(16) });

const bodySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("question"),
    subject: str(80),
    gameTitle: str(160),
    level: inLevel,
    question: inQuestion,
    wishes: z.array(str(40)).max(4).default([]),
    note: str(300).default(""),
  }),
  z.object({
    mode: z.literal("level"),
    subject: str(80),
    gameTitle: str(160),
    level: inLevel,
    otherLevels: z.array(inLevel).max(5).default([]),
    subtopic: str(120),
    difficulty: z.enum(["easier", "same", "harder"]).default("same"),
    count: z.number().int().min(4).max(10).default(8),
  }),
]);

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function POST(request: NextRequest) {
  return withCors(request, await handle(request));
}

const describeQ = (q: z.infer<typeof inQuestion>) =>
  q.type === "zuordnen"
    ? `${q.prompt} | pairs: ${(q.pairs ?? []).map((p) => `${p.left} = ${p.right}`).join(" / ")}`
    : q.type === "multiple-choice"
    ? `${q.prompt} | options: ${(q.options ?? []).join(" / ")} | correct: ${(q.options ?? [])[q.correctIndex ?? 0] ?? "?"}`
    : `${q.prompt} | answer: ${q.correctAnswer ?? "?"}`;

async function handle(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!(await checkRateLimit(`edit:${ip}`, 15)) || !(await checkRateLimit(`edit-day:${ip}`, 80, 86400))) return NextResponse.json({ error: "rate" }, { status: 429 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    if (body.mode === "question") {
      if (isMockMode()) {
        return NextResponse.json({ question: { ...body.question, prompt: `${body.question.prompt} (neu)` } });
      }
      const levelText = body.level.questions.map((q, i) => `${i + 1}. ${describeQ(q)}`).join("\n");
      const wishes = [...body.wishes, body.note.trim()].filter(Boolean).join("; ") || "a different question on the same sub-topic";
      const out = await generateStructuredOutput({
        system: buildReplaceQuestionPrompt(),
        userContent: [{ type: "text", text: `Subject: ${body.subject}\nGame: ${body.gameTitle}\nLevel: ${body.level.title}${body.level.difficulty ? ` (${body.level.difficulty})` : ""}\n\nQuestions of this level:\n${levelText}\n\nQuestion to replace (type ${body.question.type}):\n${describeQ(body.question)}\n\nTeacher's wishes: ${wishes}` }],
        schema: z.object({ question: questionSchema }),
        toolName: "replace_question",
        toolDescription: "Returns the new question that replaces the old one.",
        maxTokens: 2000,
      });
      const [question] = shuffleQuestionOptions([out.question as Question]);
      return NextResponse.json({ question });
    }

    // ganzes Level
    const count = body.count;
    const levelOut = z.object({
      title: z.string(),
      difficulty: z.enum(["leicht", "mittel", "schwer"]),
      questions: z.array(questionSchema).min(Math.max(3, count - 2)).max(count + 2),
    });
    if (isMockMode()) {
      return NextResponse.json({ level: { title: body.subtopic, difficulty: "mittel", questions: body.level.questions.slice(0, count) } });
    }
    const others = body.otherLevels.map((l) => `## ${l.title}\n${l.questions.map((q) => `- ${describeQ(q)}`).join("\n")}`).join("\n\n");
    const diff = { easier: "easier than the current level", same: "the same difficulty as the current level", harder: "harder than the current level" }[body.difficulty];
    const out = await generateStructuredOutput({
      system: buildReplaceLevelPrompt(count),
      userContent: [{ type: "text", text: `Subject: ${body.subject}\nGame: ${body.gameTitle}\n\nOther levels (do not repeat):\n${others || "-"}\n\nCurrent level to replace: ${body.level.title}${body.level.difficulty ? ` (${body.level.difficulty})` : ""}\n${body.level.questions.map((q) => `- ${describeQ(q)}`).join("\n")}\n\nNew sub-topic: ${body.subtopic}\nDifficulty: ${diff}\nNumber of questions: ${count}` }],
      schema: levelOut,
      toolName: "replace_level",
      toolDescription: "Returns the new level that replaces the old one.",
      maxTokens: 12000,
    });
    return NextResponse.json({ level: { ...out, questions: shuffleQuestionOptions(out.questions as Question[]).slice(0, count) } });
  } catch (error) {
    console.error("[edit-game] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
