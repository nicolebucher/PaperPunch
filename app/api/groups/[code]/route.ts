import { NextRequest, NextResponse } from "next/server";
import { preflight, withCors } from "@/lib/cors";
import { isDeviceId, isGroupCode, myTag, readBoard } from "@/lib/groups";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

/** Rangliste einer Lerngruppe (ohne das Spiel selbst). ?device=… liefert zusätzlich die eigene Kennung. */
export async function GET(request: NextRequest, { params }: Ctx) {
  const { code } = await params;
  if (!isGroupCode(code)) return withCors(request, NextResponse.json({ error: "invalid" }, { status: 400 }));
  try {
    const board = await readBoard(code);
    if (!board) return withCors(request, NextResponse.json({ error: "not found" }, { status: 404 }));
    const device = request.nextUrl.searchParams.get("device");
    const me = device && isDeviceId(device) ? await myTag(device) : undefined;
    const response = NextResponse.json({ ...board, me });
    response.headers.set("Cache-Control", "no-store");
    return withCors(request, response);
  } catch (error) {
    console.error("[groups] read failed:", error instanceof Error ? error.message : error);
    return withCors(request, NextResponse.json({ error: "read failed" }, { status: 500 }));
  }
}
