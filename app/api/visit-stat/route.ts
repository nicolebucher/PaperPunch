import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { preflight, withCors } from "@/lib/cors";
import { recordVisit } from "@/lib/usage-stats";

// Besuchsdauer und Absprünge fürs Kosten-Dashboard: Website (components/VisitBeacon.tsx) und App
// (mobile/src/visitBeacon.ts) melden beim Verlassen einmal {src, pages, seconds}. Keine Kennung, kein Cookie,
// nichts auf dem Gerät gespeichert – nur Tagessummen in Upstash (stat:visit:<Tag>).

export const runtime = "nodejs";

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function POST(request: NextRequest) {
  return withCors(request, await handle(request));
}

async function handle(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`visit:${ip}`, 20)) return new NextResponse(null, { status: 204 });
  let body: { src?: unknown; pages?: unknown; seconds?: unknown } = {};
  try {
    // sendBeacon schickt text/plain – deshalb selbst parsen
    body = JSON.parse(await request.text()) as typeof body;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const src = body.src === "app" ? "app" : body.src === "web" ? "web" : null;
  const pages = Number(body.pages);
  const seconds = Number(body.seconds);
  if (src && Number.isFinite(pages) && Number.isFinite(seconds) && pages >= 1 && seconds >= 0) {
    await recordVisit(src, pages, seconds);
  }
  return new NextResponse(null, { status: 204 });
}
