import { after, NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { cleanupOldJobs, jobsEnabled, saveJob } from "@/lib/jobs";
import { z } from "zod";
import { track } from "@vercel/analytics/server";
import { profileSchema, outputFormats, spellingItemSchema, type OutputFormat } from "@/types/generation";
import { ALLOWED_MIME_TYPES, MAX_FILES, MAX_TOTAL_SIZE, filesToClaudeBlocks } from "@/lib/files/extract-input";
import { generateWorksheet } from "@/lib/generators/worksheet";
import { generateTest } from "@/lib/generators/test";
import { generateGameLevels } from "@/lib/generators/game-levels";
import { generatePodcastScript } from "@/lib/generators/podcast";
import { generateSpellingDiagnostic } from "@/lib/generators/spelling-diagnostic";
import { generateSpellingFollowup } from "@/lib/generators/spelling-followup";
import { synthesizeSpeech } from "@/lib/ai/tts/elevenlabs";
import { renderWorksheetPdf } from "@/lib/pdf/render-worksheet-pdf";
import { renderTestPdf } from "@/lib/pdf/render-test-pdf";
import { checkRateLimit } from "@/lib/rate-limit";
import { slugify } from "@/lib/slugify";
import { locales, t, type Locale } from "@/lib/i18n/translations";
import { preflight, withCors } from "@/lib/cors";

export const runtime = "nodejs";
// Lernspiel (viele Level/Fragen) und Podcast (Skript + sequenzielle TTS-Chunks) brauchen bei
// umfangreichem Material deutlich länger als 2 Minuten - bei 120s brach Vercel die Anfrage ab.
export const maxDuration = 300;

function isOutputFormat(value: unknown): value is OutputFormat {
  return typeof value === "string" && (outputFormats as readonly string[]).includes(value);
}

function nullToUndefined(value: FormDataEntryValue | null): FormDataEntryValue | undefined {
  if (value === null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

function parseLocale(value: FormDataEntryValue | null): Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value) ? (value as Locale) : "en";
}

// Die Android-App ruft diese Route von einer anderen Origin auf (siehe lib/cors.ts).
export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function POST(request: NextRequest) {
  return withCors(request, await handleGenerate(request));
}

async function handleGenerate(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: t("en").serverErrors.invalidRequest }, { status: 400 });
  }

  const locale = parseLocale(formData.get("locale"));
  const messages = t(locale).serverErrors;

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: messages.tooManyRequests }, { status: 429 });
  }

  const format = formData.get("format");
  const files = formData.getAll("file").filter((entry): entry is File => entry instanceof File);

  if (!isOutputFormat(format)) {
    return NextResponse.json({ error: messages.invalidFormat }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: messages.tooManyFiles }, { status: 400 });
  }
  if (files.some((file) => !ALLOWED_MIME_TYPES.has(file.type))) {
    return NextResponse.json({ error: messages.fileTypeInvalid }, { status: 400 });
  }
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return NextResponse.json({ error: messages.fileTooLarge }, { status: 400 });
  }

  const profileResult = profileSchema.safeParse({
    schoolType: nullToUndefined(formData.get("schoolType")),
    country: nullToUndefined(formData.get("country")),
    grade: nullToUndefined(formData.get("grade")),
    subject: nullToUndefined(formData.get("subject")),
    notes: nullToUndefined(formData.get("notes")),
  });
  if (!profileResult.success) {
    return NextResponse.json({ error: messages.invalidProfile }, { status: 400 });
  }
  const profile = profileResult.data;

  // Ohne Upload braucht die KI ein Thema (Fach oder Notiz), aus dem sie den Inhalt ableitet.
  // Nur "spelling" kommt ganz ohne aus: die Diagnose selbst deckt die Rechtschreibprobleme auf.
  if (files.length === 0 && format !== "spelling" && !profile.subject && !profile.notes) {
    return NextResponse.json({ error: messages.missingTopic }, { status: 400 });
  }

  const run = async (): Promise<NextResponse> => {
    try {
      const fileBlocks = await filesToClaudeBlocks(files);

      if (format === "worksheet") {
        const data = await generateWorksheet(profile, fileBlocks, locale);
        const pdf = await renderWorksheetPdf(data, profile);
        const filename = `${slugify(data.title)}.pdf`;
        await track("Material generated", { format });
        return NextResponse.json({ data, filename, pdfBase64: Buffer.from(pdf).toString("base64") });
      }

      if (format === "test") {
        const data = await generateTest(profile, fileBlocks, locale);
        const pdf = await renderTestPdf(data, profile);
        const filename = `${slugify(data.title)}.pdf`;
        await track("Material generated", { format });
        return NextResponse.json({ data, filename, pdfBase64: Buffer.from(pdf).toString("base64") });
      }

      if (format === "game") {
        const game = await generateGameLevels(profile, fileBlocks, locale);
        await track("Material generated", { format });
        return NextResponse.json({ game });
      }

      if (format === "podcast") {
        const podcast = await generatePodcastScript(profile, fileBlocks, locale);
        const audio = await synthesizeSpeech(podcast.script);
        const filename = `${slugify(podcast.title)}.mp3`;
        await track("Material generated", { format });
        return NextResponse.json({
          title: podcast.title,
          script: podcast.script,
          filename,
          audioBase64: Buffer.from(audio).toString("base64"),
        });
      }

      // "spelling" has two phases. Nothing is persisted between them, so the client resends the
      // same files plus - for the follow-up - the diagnostic items the student got wrong.
      if (formData.get("phase") === "followup") {
        let missedItems;
        try {
          missedItems = z.array(spellingItemSchema).parse(JSON.parse(String(formData.get("missed") ?? "[]")));
        } catch {
          return NextResponse.json({ error: messages.invalidRequest }, { status: 400 });
        }
        if (missedItems.length === 0) {
          return NextResponse.json({ error: messages.invalidRequest }, { status: 400 });
        }
        const data = await generateSpellingFollowup(profile, fileBlocks, locale, missedItems);
        const pdf = await renderWorksheetPdf(data, profile);
        const filename = `${slugify(data.title)}.pdf`;
        await track("Material generated", { format: "spelling-followup" });
        return NextResponse.json({ data, filename, pdfBase64: Buffer.from(pdf).toString("base64") });
      }

      const diagnostic = await generateSpellingDiagnostic(profile, fileBlocks, locale);
      await track("Material generated", { format: "spelling-diagnostic" });
      return NextResponse.json({ diagnostic });
    } catch (error) {
      console.error("Generation failed:", error instanceof Error ? error.message : error);
      return NextResponse.json({ error: messages.generationFailed }, { status: 500 });
    }
  };

  // Hintergrund-Modus (App): sofort eine Job-ID zurückgeben und weiterarbeiten, auch wenn das Handy
  // gesperrt wird. Das Ergebnis holt die App über /api/jobs/<id> ab.
  if (formData.get("async") === "1" && jobsEnabled()) {
    const jobId = randomUUID();
    after(async () => {
      await cleanupOldJobs();
      try {
        const res = await run();
        const body = (await res.json()) as Record<string, unknown>;
        await saveJob(
          jobId,
          res.ok ? { status: "done", result: body } : { status: "error", error: String(body.error ?? messages.generationFailed) }
        );
      } catch (error) {
        console.error("[jobs] generation failed:", error instanceof Error ? error.message : error);
        await saveJob(jobId, { status: "error", error: messages.generationFailed }).catch(() => undefined);
      }
    });
    return NextResponse.json({ jobId }, { status: 202 });
  }

  return run();
}
