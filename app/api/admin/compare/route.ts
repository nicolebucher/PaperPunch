import { NextRequest, NextResponse } from "next/server";
import type { Profile } from "@/types/generation";
import { generateWorksheet } from "@/lib/generators/worksheet";
import { generateTest } from "@/lib/generators/test";
import { generateGameLevels } from "@/lib/generators/game-levels";
import { runWithModel, usageSummary, type ModelVariant } from "@/lib/ai/model-context";
import type { Locale } from "@/lib/i18n/translations";

export const runtime = "nodejs";
export const maxDuration = 300;

// Interner Modellvergleich (Sonnet vs. Haiku) mit festen Beispielthemen. Nur mit MODEL_COMPARE_KEY nutzbar,
// für Nutzer unsichtbar. Ein Aufruf = ein Format × ein Beispiel × ein Modell.
const SAMPLES: { profile: Profile; locale: Locale }[] = [
  { locale: "de", profile: { country: "DE", schoolType: "Gymnasium", grade: 6, subject: "Mathe", notes: "Brüche kürzen und erweitern, gleichnamig machen" } },
  { locale: "de", profile: { country: "DE", schoolType: "Realschule", grade: 7, subject: "Englisch", notes: "Simple past vs. present perfect, Signalwörter" } },
  { locale: "de", profile: { country: "DE", schoolType: "Gymnasium", grade: 8, subject: "Biologie", notes: "Fotosynthese: Ausgangsstoffe, Produkte, Ort in der Zelle" } },
  { locale: "de", profile: { country: "DE", schoolType: "Gymnasium", grade: 6, subject: "Physik", notes: "Licht und Schatten, Kernschatten und Halbschatten, Mondphasen" } },
  { locale: "en", profile: { country: "GB", schoolType: "Secondary school", grade: 8, subject: "History", notes: "Causes of the First World War: alliances, militarism, imperialism, nationalism" } },
];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const key = process.env.MODEL_COMPARE_KEY;
  if (!key || params.get("key") !== key) return NextResponse.json({ error: "not found" }, { status: 404 });

  const format = params.get("format") ?? "worksheet";
  const sample = SAMPLES[Number(params.get("sample") ?? "0")];
  const variant = (params.get("model") === "haiku" ? "haiku" : "sonnet") as ModelVariant;
  if (!sample || !["worksheet", "test", "game"].includes(format)) return NextResponse.json({ error: "bad params" }, { status: 400 });

  const started = Date.now();
  try {
    const result = await runWithModel(variant, async () => {
      const output =
        format === "game"
          ? await generateGameLevels(sample.profile, [], sample.locale)
          : format === "test"
            ? await generateTest(sample.profile, [], sample.locale)
            : await generateWorksheet(sample.profile, [], sample.locale);
      return { output, usage: usageSummary() };
    });
    return NextResponse.json({ format, sample: sample.profile, ms: Date.now() - started, ...result });
  } catch (error) {
    return NextResponse.json(
      { format, sample: sample.profile, variant, ms: Date.now() - started, error: error instanceof Error ? error.message : String(error), usage: null },
      { status: 500 }
    );
  }
}
