import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { preflight, withCors } from "@/lib/cors";
import { isDeviceId, isGroupCode, myTag, readBoard, submitResult } from "@/lib/groups";

export const runtime = "nodejs";
export const maxDuration = 15;

type Ctx = { params: Promise<{ code: string }> };

const bodySchema = z.object({
  device: z.string().max(64),
  name: z.string().max(60),
  pct: z.number().min(0).max(100),
  correct: z.number().int().min(0).max(500),
  total: z.number().int().min(1).max(500),
  ms: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional().default(0),
});

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

/** Ergebnis eintragen (erster Versuch pro Gerät) und die aktuelle Rangliste zurückgeben. */
export async function POST(request: NextRequest, { params }: Ctx) {
  const { code } = await params;
  if (!isGroupCode(code)) return withCors(request, NextResponse.json({ error: "invalid" }, { status: 400 }));
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`group-result:${ip}`, 20)) return withCors(request, NextResponse.json({ error: "rate limit" }, { status: 429 }));
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return withCors(request, NextResponse.json({ error: "invalid" }, { status: 400 }));
  }
  if (!isDeviceId(body.device)) return withCors(request, NextResponse.json({ error: "invalid" }, { status: 400 }));
  try {
    const outcome = await submitResult(code, body.device, body);
    if (outcome === "missing") return withCors(request, NextResponse.json({ error: "not found" }, { status: 404 }));
    const board = await readBoard(code);
    return withCors(request, NextResponse.json({ outcome, ...board, me: await myTag(body.device) }));
  } catch (error) {
    console.error("[groups] submit failed:", error instanceof Error ? error.message : error);
    return withCors(request, NextResponse.json({ error: "save failed" }, { status: 500 }));
  }
}
