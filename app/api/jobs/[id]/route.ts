import { NextRequest, NextResponse } from "next/server";
import { deleteJob, isJobId, jobStatus, readJob } from "@/lib/jobs";
import { preflight, withCors } from "@/lib/cors";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

/** Stand eines Hintergrund-Jobs: running | done (mit Ergebnis) | error. */
export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isJobId(id)) return withCors(request, NextResponse.json({ error: "invalid" }, { status: 400 }));
  try {
    const job = await readJob(id);
    const response = NextResponse.json(jobStatus(job));
    response.headers.set("Cache-Control", "no-store");
    return withCors(request, response);
  } catch (error) {
    console.error("[jobs] read failed:", error instanceof Error ? error.message : error);
    return withCors(request, NextResponse.json({ status: "running" }));
  }
}

/** Die App hat das Ergebnis gespeichert – Blob löschen. */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isJobId(id)) return withCors(request, NextResponse.json({ error: "invalid" }, { status: 400 }));
  try {
    await deleteJob(id);
  } catch (error) {
    console.error("[jobs] delete failed:", error instanceof Error ? error.message : error);
  }
  return withCors(request, NextResponse.json({ ok: true }));
}
