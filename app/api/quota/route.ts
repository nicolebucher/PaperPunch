import { NextRequest, NextResponse } from "next/server";
import { preflight, withCors } from "@/lib/cors";
import { getQuota, quotaSubject } from "@/lib/quota";

export const runtime = "nodejs";

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

/** Stand des Wochen-Kontingents fürs Erstellen: ?device=<Geräte-ID> → { enforced, limit, used, remaining, week }. */
export async function GET(request: NextRequest) {
  const subject = quotaSubject(request.nextUrl.searchParams.get("device"), request.headers.get("x-forwarded-for") ?? "unknown");
  const response = NextResponse.json(await getQuota(subject));
  response.headers.set("Cache-Control", "no-store");
  return withCors(request, response);
}
