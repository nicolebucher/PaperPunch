import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sharedGameSchema } from "@/types/generation";
import { checkRateLimit } from "@/lib/rate-limit";
import { preflight, withCors } from "@/lib/cors";
import { challengeUrl, challengesEnabled, cleanName, cleanupOldChallenges, saveChallenge } from "@/lib/challenges";

export const runtime = "nodejs";
export const maxDuration = 15;

const bodySchema = z.object({
  game: sharedGameSchema,
  name: z.string().max(60),
  pct: z.number().int().min(0).max(100).optional(),
  lang: z.enum(["de", "en"]).optional().default("de"),
});

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

/** Neue Challenge anlegen: gibt Code und Link zurück. */
export async function POST(request: NextRequest) {
  return withCors(request, await create(request));
}

async function create(request: NextRequest) {
  if (!challengesEnabled()) return NextResponse.json({ error: "challenges disabled" }, { status: 503 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`challenge:${ip}`, 10)) return NextResponse.json({ error: "rate limit" }, { status: 429 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const name = cleanName(body.name) || (body.lang === "en" ? "A friend" : "Jemand");
  try {
    const record = await saveChallenge({ lang: body.lang, game: body.game, from: { name, pct: body.pct } });
    void cleanupOldChallenges();
    return NextResponse.json({ code: record.code, url: challengeUrl(record.code) });
  } catch (error) {
    console.error("[challenges] save failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }
}
