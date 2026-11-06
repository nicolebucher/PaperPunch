import { NextRequest, NextResponse } from "next/server";
import { berlinDay, bumpCounter } from "@/lib/quota";
import { checkRateLimit } from "@/lib/rate-limit";

// Zählt anonym, wie oft das Cookie-Banner gezeigt, akzeptiert oder abgelehnt wurde (nur Tagessummen,
// keine Kennung, kein Cookie). Damit lässt sich erklären, warum Google Analytics weniger Besuche zeigt
// als Vercel Web Analytics: GA zählt nur, wer zustimmt. Ablesbar in Upstash: stat:consent:<Tag>:<event>.

export const runtime = "nodejs";

const EVENTS = new Set(["shown", "granted", "denied"]);

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!(await checkRateLimit(`consent:${ip}`, 60))) return new NextResponse(null, { status: 204 });
  let event = "";
  try {
    event = String(((await request.json()) as { event?: unknown }).event ?? "");
  } catch {
    // leer
  }
  if (EVENTS.has(event)) await bumpCounter(`consent:${berlinDay()}:${event}`);
  return new NextResponse(null, { status: 204 });
}
