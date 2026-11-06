import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { preflight, withCors } from "@/lib/cors";
import { recordCountry, recordVisit, userSubject } from "@/lib/usage-stats";

// Besuchsdauer und Absprünge fürs Kosten-Dashboard: Website (components/VisitBeacon.tsx) und App
// (mobile/src/visitBeacon.ts) melden beim Verlassen einmal {src, pages, seconds, device}. Gespeichert werden nur
// Tagessummen in Upstash (stat:visit:<Tag>); die Geräte-ID (dieselbe zufällige ID wie fürs Kontingent) nur als
// eigener Hash in einem HyperLogLog, um eindeutige Nutzer:innen je Quelle zu zählen (siehe lib/usage-stats.ts).
// Die App schickt außerdem rem/pushDelivered/pushTapped für die Push-Statistik und die Rückkehrquote.

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
  let body: { src?: unknown; pages?: unknown; seconds?: unknown; device?: unknown; rem?: unknown; pushDelivered?: unknown; pushTapped?: unknown } = {};
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
    await recordVisit(src, pages, seconds, userSubject(body.device), {
      rem: body.rem === true,
      delivered: Number(body.pushDelivered) || 0,
      tapped: Number(body.pushTapped) || 0,
    });
    // Land nur als Tageszähler (Vercel-Header, keine IP gespeichert)
    await recordCountry(src, request.headers.get("x-vercel-ip-country"));
  }
  return new NextResponse(null, { status: 204 });
}
