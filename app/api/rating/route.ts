import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { preflight, withCors } from "@/lib/cors";

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
 * Bewertung eines Lernmaterials (Sterne + optionaler Text). Wird an ein Google Sheet weitergereicht
 * (Apps-Script-Webhook in RATINGS_WEBHOOK_URL). Ohne Webhook landet sie nur in den Vercel-Logs.
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
  if (!checkRateLimit(`rating:${ip}`, 20)) {
    return NextResponse.json({ error: "too many" }, { status: 429 });
  }

  const row = {
    submittedAt: new Date().toISOString(),
    ...body,
    text: body.text.trim(),
    score: body.score ? `${body.score.correct}/${body.score.total}` : "",
  };

  const webhook = process.env.RATINGS_WEBHOOK_URL;
  if (!webhook) {
    console.log("[rating]", JSON.stringify(row));
    return NextResponse.json({ ok: true, stored: false });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`webhook ${res.status}`);
  } catch (error) {
    console.error("[rating] webhook failed:", error instanceof Error ? error.message : error, JSON.stringify(row));
    return NextResponse.json({ ok: true, stored: false });
  }
  return NextResponse.json({ ok: true, stored: true });
}
