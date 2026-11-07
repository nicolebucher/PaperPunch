import { NextResponse } from "next/server";

// Die Android-App (Capacitor) lädt ihre Oberfläche lokal und ruft die API von einer anderen
// Origin auf. Erlaubt sind die Capacitor-Origins plus die Domains aus APP_ALLOWED_ORIGINS
// (kommagetrennt, z.B. die Vercel-Vorschau der App).
// https://localhost ist die Origin der Android-App (Capacitor 7), capacitor://localhost die von iOS.
// http://localhost und der Vite-Dev-Server gelten nur außerhalb der Produktion (Security-Review L3).
const APP_ORIGINS = ["capacitor://localhost", "https://localhost"];
const DEV_ORIGINS = ["http://localhost", "http://localhost:5173"];
const BUILT_IN = [...APP_ORIGINS, ...DEV_ORIGINS];

function allowedOrigins(): string[] {
  const extra = (process.env.APP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const builtIn = process.env.VERCEL_ENV === "production" ? APP_ORIGINS : BUILT_IN;
  return [...builtIn, ...extra];
}

// Vorschau-Deployments der App (eigenes Vercel-Projekt "paperpunch-app") haben wechselnde Adressen.
function isAppPreview(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === "https:" && hostname.startsWith("paperpunch-app") && hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

/** true, wenn die Anfrage von der Android-App kommt (Capacitor-Origin oder App-Vorschau), sonst Website. */
export function isAppOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return BUILT_IN.includes(origin) || isAppPreview(origin);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !(allowedOrigins().includes(origin) || isAppPreview(origin))) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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
