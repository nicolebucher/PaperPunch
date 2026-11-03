import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { CLAUDE_MODEL } from "./claude-client";

// A/B-Test der Modelle: Jedes Gerät (clientId aus App bzw. Browser) landet fest in einer Gruppe.
// Die Gruppe gilt für die ganze Anfrage und wird über AsyncLocalStorage an generateStructuredOutput
// durchgereicht, ohne alle Generatoren umzubauen. Nebenbei werden die echten Tokens mitgezählt.

export const MODELS = {
  sonnet: CLAUDE_MODEL,
  haiku: "claude-haiku-5-5",
} as const;
export type ModelVariant = keyof typeof MODELS;

// US-Dollar pro 1 Mio. Tokens (Stand Nov. 2026; Haiku-Preis gilt für Anfragen unter 100k Tokens)
const PRICES: Record<ModelVariant, { in: number; out: number }> = {
  sonnet: { in: 2, out: 10 },
  haiku: { in: 0.1, out: 0.5 },
};

interface ModelContext {
  variant: ModelVariant;
  model: string;
  inputTokens: number;
  outputTokens: number;
  calls: number;
}

const storage = new AsyncLocalStorage<ModelContext>();

/** Anteil der Geräte, die Haiku bekommen (0–100). Vercel-Variable AB_HAIKU_PERCENT, Standard 50. 0 beendet den Test. */
function haikuPercent(): number {
  const raw = Number(process.env.AB_HAIKU_PERCENT ?? "50");
  return Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 50;
}

/** Feste Gruppe pro Gerät; ohne clientId zufällig. */
export function chooseVariant(clientId: string | null | undefined): ModelVariant {
  const pct = haikuPercent();
  if (pct <= 0) return "sonnet";
  if (pct >= 100) return "haiku";
  const bucket = clientId
    ? parseInt(createHash("sha256").update(`pp-ab-1:${clientId}`).digest("hex").slice(0, 8), 16) % 100
    : Math.floor(Math.random() * 100);
  return bucket < pct ? "haiku" : "sonnet";
}

export function runWithModel<T>(variant: ModelVariant, fn: () => Promise<T>): Promise<T> {
  return storage.run({ variant, model: MODELS[variant], inputTokens: 0, outputTokens: 0, calls: 0 }, fn);
}

export function currentModel(): string {
  return storage.getStore()?.model ?? CLAUDE_MODEL;
}

export function recordUsage(inputTokens: number, outputTokens: number) {
  const ctx = storage.getStore();
  if (!ctx) return;
  ctx.inputTokens += inputTokens;
  ctx.outputTokens += outputTokens;
  ctx.calls += 1;
}

/** Zusammenfassung der Anfrage für Logs und Antwort. */
export function usageSummary() {
  const ctx = storage.getStore();
  if (!ctx) return null;
  const p = PRICES[ctx.variant];
  const costUsd = (ctx.inputTokens * p.in + ctx.outputTokens * p.out) / 1e6;
  return {
    variant: ctx.variant,
    model: ctx.model,
    inputTokens: ctx.inputTokens,
    outputTokens: ctx.outputTokens,
    attempts: ctx.calls,
    costUsd: Math.round(costUsd * 100000) / 100000,
  };
}
