import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { readCountries, readStats } from "@/lib/usage-stats";

// Zahlen fürs Kosten-Dashboard (Claude-Kosten, Anfragen, erstellte Materialien, aktive Ersteller:innen,
// Cookie-Banner). Nur mit Schlüssel (Vercel-Variable STATS_KEY), per Header x-stats-key oder ?key=.

export const runtime = "nodejs";

function allowed(request: NextRequest): boolean {
  const expected = process.env.STATS_KEY ?? "";
  const given = request.headers.get("x-stats-key") ?? request.nextUrl.searchParams.get("key") ?? "";
  if (expected.length < 16 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function GET(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const days = Number(request.nextUrl.searchParams.get("days") ?? "30") || 30;
  const stats = await readStats(days);
  if (!stats) return NextResponse.json({ error: "no store" }, { status: 503 });
  const res = NextResponse.json({ generatedAt: new Date().toISOString(), ...stats, countries: await readCountries(days) });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
