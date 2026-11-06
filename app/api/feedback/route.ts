import { NextRequest, NextResponse } from "next/server";
import { locales, t, type Locale } from "@/lib/i18n/translations";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

import { storeFeedback } from "@/lib/feedback-store";

// Feedback-Formular der Website: Sicherung im Blob Store + Google Sheet (lib/feedback-store.ts).

function parseLocale(value: unknown): Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value) ? (value as Locale) : "en";
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!(await checkRateLimit(`feedback:${ip}`, 5)) || !(await checkRateLimit(`feedback-day:${ip}`, 30, 86400))) {
    return NextResponse.json({ error: t("en").serverErrors.tooManyRequests }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("en").serverErrors.invalidRequest }, { status: 400 });
  }

  const { name, email, message, locale } = (body ?? {}) as Record<string, unknown>;
  const messages = t(parseLocale(locale)).feedback;

  if (typeof message !== "string" || message.trim().length < 3) {
    return NextResponse.json({ error: messages.error }, { status: 400 });
  }

  const entry = {
    name: typeof name === "string" && name.trim() ? name.trim().slice(0, 200) : null,
    email: typeof email === "string" && email.trim() ? email.trim().slice(0, 200) : null,
    message: message.trim().slice(0, 4000),
  };

  const { stored } = await storeFeedback("feedback", { ...entry, lang: parseLocale(locale) });
  if (!stored) {
    return NextResponse.json({ error: messages.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
