import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sharedGameSchema } from "@/types/generation";
import { checkRateLimit } from "@/lib/rate-limit";
import { preflight, withCors } from "@/lib/cors";
import { cleanupOldGroups, createGroup, groupUrl, groupsEnabled, isDeviceId, submitResult, teacherUrl } from "@/lib/groups";

export const runtime = "nodejs";
export const maxDuration = 15;

const resultSchema = z.object({
  pct: z.number().min(0).max(100),
  correct: z.number().int().min(0).max(500),
  total: z.number().int().min(1).max(500),
  ms: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional().default(0),
});

const bodySchema = z.object({
  game: sharedGameSchema,
  name: z.string().max(80).optional().default(""),
  by: z.string().max(60).optional().default(""),
  lang: z.enum(["de", "en"]).optional().default("de"),
  endsAt: z.string().max(40).nullable().optional().default(null),
  /** Hausaufgabe (braucht ein Enddatum): Rangliste nur für die Lehrkraft. */
  homework: z.boolean().optional().default(false),
  device: z.string().max(64).optional(),
  /** Ergebnis der Person, die die Gruppe startet (wenn sie das Spiel schon gespielt hat). */
  result: resultSchema.optional(),
});

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

/** Neue Lerngruppe anlegen: gibt Code und Link zurück. */
export async function POST(request: NextRequest) {
  return withCors(request, await create(request));
}

async function create(request: NextRequest) {
  if (!groupsEnabled()) return NextResponse.json({ error: "groups disabled" }, { status: 503 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit(`group:${ip}`, 10))) return NextResponse.json({ error: "rate limit" }, { status: 429 });
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    // Grund mitloggen (nur Feldpfade, keine Inhalte), damit gemeldete Fehler nachvollziehbar sind
    const issues = error instanceof z.ZodError ? error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.code}`).join("; ") : "bad json";
    console.warn("[groups] invalid body:", issues);
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  try {
    const meta = await createGroup({ name: body.name, by: body.by, lang: body.lang, endsAt: body.endsAt, game: body.game, homework: body.homework });
    if (body.result && body.device && isDeviceId(body.device)) {
      await submitResult(meta.code, body.device, { name: meta.by, ...body.result });
    }
    void cleanupOldGroups();
    // teacherUrl nur an die Person, die die Gruppe anlegt – der Schlüssel steht nirgends sonst im Klartext.
    return NextResponse.json({ code: meta.code, url: groupUrl(meta.code), name: meta.name, endsAt: meta.endsAt, homework: !!meta.homework, teacherKey: meta.teacherKey, teacherUrl: teacherUrl(meta.code, meta.teacherKey) });
  } catch (error) {
    console.error("[groups] create failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }
}
