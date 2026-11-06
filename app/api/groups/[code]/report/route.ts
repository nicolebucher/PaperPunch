import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isGroupCode, teacherReport } from "@/lib/groups";

// Auswertung einer Lerngruppe für die Lehrkraft. Schlüssel kommt im Header x-teacher-key
// (steht im Lehrkraft-Link hinter dem #, landet also nie in Server-Logs oder Referrern).

export const runtime = "nodejs";
export const maxDuration = 15;

type Ctx = { params: Promise<{ code: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { code } = await params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit(`group-report:${ip}`, 30))) return NextResponse.json({ error: "rate limit" }, { status: 429 });
  if (!isGroupCode(code)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const key = request.headers.get("x-teacher-key") ?? "";
  try {
    const report = await teacherReport(code, key);
    if (report === null) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (report === "denied") return NextResponse.json({ error: "denied" }, { status: 403 });
    const res = NextResponse.json(report);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error) {
    console.error("[groups] report failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "read failed" }, { status: 500 });
  }
}
