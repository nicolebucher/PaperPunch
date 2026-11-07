import type { NextConfig } from "next";

// Security-Header für alle Seiten und API-Antworten (Security-Review M7).
// Die Content-Security-Policy läuft vorerst nur im Report-Only-Modus: Der Browser blockiert nichts, meldet
// Verstöße aber in der Konsole. Wenn dort nach ein paar Tagen nichts Unerwartetes auftaucht, kann der Header
// in "Content-Security-Policy" umbenannt werden. Erlaubt sind Google Analytics (nur nach Einwilligung geladen),
// Google Fonts, der PDF-Worker von unpkg und Vercel Analytics (gleiche Origin).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://unpkg.com",
  "worker-src 'self' blob: https://unpkg.com",
  "media-src 'self' data: blob:",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' mailto:",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
