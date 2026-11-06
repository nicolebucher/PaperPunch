import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { preflight, withCors } from "@/lib/cors";
import { storeFeedback } from "@/lib/feedback-store";

export const runtime = "nodejs";
export const maxDuration = 15;

const bodySchema = z.object({
  stars: z.number().int().min(1).max(5),
  text: z.string().max(1000).optional().default(""),
  format: z.enum(["worksheet", "test", "game", "podcast"]),
  title: z.string().max(200).optional().default(""),
  subject: z.string().max(80).optional(),
  lang: z.string().max(5).optional(),
  country: z.string().max(5).optional(),
  schoolType: z.string().max(80).optional(),
  grade: z.number().int().min(0).max(20).optional(),
  role: z.enum(["student", "parent", "teacher"]).optional(),
  score: z.object({ correct: z.number().int().min(0), total: z.number().int().min(0) }).optional(),
  source: z.enum(["app", "web"]).optional().default("web"),
});

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function POST(request: NextRequest) {
  return withCors(request, await handleRating(request));
}

/**
 * Bewertung eines Lernmaterials (Sterne + optionaler Text). Wird im Blob Store gesichert und an ein
 * Google Sheet weitergereicht (lib/feedback-store.ts).
 * Es werden keine Fotos und keine Namen übertragen.
 */
async function handleRating(request: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!(await checkRateLimit(`rating:${ip}`, 60))) {
    return NextResponse.json({ error: "too many" }, { status: 429 });
  }

  const row = {
    ...body,
    text: body.text.trim(),
    score: body.score ? `${body.score.correct}/${body.score.total}` : "",
  };
  const { stored } = await storeFeedback("rating", row);
  return NextResponse.json({ ok: true, stored });
}
