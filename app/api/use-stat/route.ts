import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { preflight, withCors } from "@/lib/cors";
import { recordUse } from "@/lib/usage-stats";

// Drucken vs. online lösen fürs Kosten-Dashboard: Website (lib/webapp/use-stat.ts) und App
// (mobile/src/useStat.ts) melden {src, action, format}. Keine Kennung, kein Cookie – nur Tageszähler
// in Upstash (stat:use:<Tag>).

export const runtime = "nodejs";

const ACTIONS = new Set(["print", "online"]);

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function POST(request: NextRequest) {
  return withCors(request, await handle(request));
}

async function handle(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit(`use:${ip}`, 120))) return new NextResponse(null, { status: 204 });
  let body: { src?: unknown; action?: unknown; format?: unknown } = {};
  try {
    body = JSON.parse(await request.text()) as typeof body;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const src = body.src === "app" ? "app" : body.src === "web" ? "web" : null;
  const action = typeof body.action === "string" && ACTIONS.has(body.action) ? (body.action as "print" | "online") : null;
  const format = typeof body.format === "string" && /^[a-z-]{1,20}$/.test(body.format) ? body.format : null;
  if (src && action && format) await recordUse(src, action, format);
  return new NextResponse(null, { status: 204 });
}
