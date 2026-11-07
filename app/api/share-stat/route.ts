import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { preflight, withCors } from "@/lib/cors";
import { recordShare, type ShareKind } from "@/lib/usage-stats";

// Weiterempfehlen fürs Dashboard: Website (lib/webapp/share-stat.ts) und App (mobile/src/useStat.ts) melden
// {src, kind}: click = geteilt, arrive = über Einladungslink gekommen, create = danach selbst etwas erstellt.
// Keine Kennung, kein Cookie – nur Tageszähler in Upstash (stat:share:<Tag>).

export const runtime = "nodejs";

const KINDS = new Set<ShareKind>(["click", "arrive", "create"]);

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function POST(request: NextRequest) {
  return withCors(request, await handle(request));
}

async function handle(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit(`share:${ip}`, 60))) return new NextResponse(null, { status: 204 });
  let body: { src?: unknown; kind?: unknown } = {};
  try {
    body = JSON.parse(await request.text()) as typeof body;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const src = body.src === "app" ? "app" : body.src === "web" ? "web" : null;
  const kind = typeof body.kind === "string" && KINDS.has(body.kind as ShareKind) ? (body.kind as ShareKind) : null;
  if (src && kind) await recordShare(src, kind);
  return new NextResponse(null, { status: 204 });
}
