import { NextResponse } from "next/server";

// Die Android-App (Capacitor) lädt ihre Oberfläche lokal und ruft die API von einer anderen
// Origin auf. Erlaubt sind die Capacitor-Origins plus die Domains aus APP_ALLOWED_ORIGINS
// (kommagetrennt, z.B. die Vercel-Vorschau der App).
const BUILT_IN = ["capacitor://localhost", "https://localhost", "http://localhost", "http://localhost:5173"];

function allowedOrigins(): string[] {
  const extra = (process.env.APP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return [...BUILT_IN, ...extra];
}

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !allowedOrigins().includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function preflight(request: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

/** Adds the CORS headers for the request's origin to a response. */
export function withCors<T extends Response>(request: Request, response: T): T {
  for (const [key, value] of Object.entries(corsHeaders(request.headers.get("origin")))) {
    response.headers.set(key, value);
  }
  return response;
}
