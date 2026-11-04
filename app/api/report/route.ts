import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storeFeedback } from "@/lib/feedback-store";
import { checkRateLimit } from "@/lib/rate-limit";
import { preflight, withCors } from "@/lib/cors";

// "Fehler melden" an einer Frage (Website und App): landet wie Bewertungen im privaten Blob Store
// und im Google Sheet (Spalte kind = "report") und wird bei der wöchentlichen Feedback-Runde durchgesehen.

export const runtime = "nodejs";

const s = (max: number) => z.string().max(max).optional();
const bodySchema = z.object({
  source: z.string().max(40),
  reason: z.enum(["unclear", "wrong-solution", "my-answer-right", "other"]),
  note: s(1000),
  question: z.string().min(1).max(1000),
  expected: s(400),
  options: z.array(z.string().max(200)).max(6).optional(),
  given: s(300),
  title: s(200),
  subject: s(80),
  level: s(120),
  lang: s(5),
});

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function POST(request: NextRequest) {
  return withCors(request, await handle(request));
}

async function handle(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`report:${ip}`, 10)) return NextResponse.json({ error: "rate" }, { status: 429 });
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { options, ...rest } = body;
  const { stored } = await storeFeedback("report", { ...rest, options: options?.join(" | ") });
  return stored ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "failed" }, { status: 500 });
}
