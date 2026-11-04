"use client";

import { useState } from "react";
import { ProfileForm } from "@/components/form/ProfileForm";
import { FileUpload } from "@/components/form/FileUpload";
import { FormatSelector } from "@/components/form/FormatSelector";
import { GameShell } from "@/components/game/GameShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ShareButton } from "@/components/ui/ShareButton";
import { PdfPreview } from "@/components/pdf/PdfPreview";
import { InteractiveWorksheet } from "@/components/worksheet/InteractiveWorksheet";
import { SpellingDiagnosticPlayer } from "@/components/spelling/SpellingDiagnosticPlayer";
import { useLanguage } from "@/lib/i18n/language-context";
import { MAX_TOTAL_SIZE } from "@/lib/files/extract-input";
import type { GameData, OutputFormat, Profile, SpellingDiagnostic, SpellingItem, WorksheetData } from "@/types/generation";
import type { WebMaterial } from "@/lib/webapp/store";
import { deviceId } from "@/lib/webapp/groups";

type Step =
  | "input"
  | "loading"
  | "result-file"
  | "result-game"
  | "result-podcast"
  | "spelling-diagnostic"
  | "spelling-summary"
  | "error";
type ResultTab = "preview" | "practice";
type PodcastTab = "listen" | "transcript";

interface SpellingResult {
  missed: SpellingItem[];
  correctCount: number;
  total: number;
}

interface DownloadInfo {
  url: string;
  filename: string;
  blob: Blob;
  data: WorksheetData;
}

interface PodcastInfo {
  url: string;
  filename: string;
  blob: Blob;
  title: string;
  script: string;
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/**
 * Erstellen auf der Website. Ohne Props wie bisher unter /create. In der Web-App (/app) mit
 * mode "upload" | "topic", Vorbelegung (z. B. aus einem Lernplan), onSaved zum Speichern im Browser
 * und saved, um ein gespeichertes Material direkt im Ergebnis zu öffnen.
 */
export function CreationWizard({
  mode,
  initialSubject,
  initialNotes,
  initialFormat,
  saved,
  onSaved,
  onNew,
}: {
  mode?: "upload" | "topic";
  initialSubject?: string;
  initialNotes?: string;
  initialFormat?: OutputFormat;
  saved?: WebMaterial;
  onSaved?: (material: WebMaterial) => void;
  onNew?: () => void;
} = {}) {
  const { locale, t } = useLanguage();
  const [profile, setProfile] = useState<Partial<Profile>>(() => ({ subject: initialSubject, notes: initialNotes }));
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<OutputFormat | null>(() => saved?.format ?? initialFormat ?? null);
  const [step, setStep] = useState<Step>(() => (saved?.game ? "result-game" : saved?.sheet ? "result-file" : "input"));
  const [resultTab, setResultTab] = useState<ResultTab>("preview");
  const [podcastTab, setPodcastTab] = useState<PodcastTab>("listen");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(() => {
    if (!saved?.sheet) return null;
    const blob = base64ToBlob(saved.sheet.pdfBase64, "application/pdf");
    return { url: URL.createObjectURL(blob), filename: saved.sheet.filename, blob, data: saved.sheet.data };
  });
  const [podcastInfo, setPodcastInfo] = useState<PodcastInfo | null>(null);
  const [game, setGame] = useState<GameData | null>(() => saved?.game ?? null);
  const [diagnostic, setDiagnostic] = useState<SpellingDiagnostic | null>(null);
  const [spellingResult, setSpellingResult] = useState<SpellingResult | null>(null);
  const [loadingTitle, setLoadingTitle] = useState<string | undefined>(undefined);

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  // Without an upload, the subject or note becomes the topic the AI builds from. "spelling" needs
  // neither - the diagnostic itself is what surfaces the student's actual gaps.
  const hasTopic = !!profile.subject?.trim() || !!profile.notes?.trim();
  const canSubmit =
    (files.length > 0 || hasTopic || format === "spelling") && !!format && totalSize <= MAX_TOTAL_SIZE;

  async function handleSubmit() {
    if (!canSubmit || !format) return;
    setLoadingTitle(undefined);
    setStep("loading");
    setErrorMessage("");

    const body = new FormData();
    if (profile.grade !== undefined) body.set("grade", String(profile.grade));
    if (profile.schoolType) body.set("schoolType", profile.schoolType);
    if (profile.subject) body.set("subject", profile.subject);
    if (profile.notes) body.set("notes", profile.notes);
    body.set("format", format);
    body.set("locale", locale);
    body.set("device", deviceId());
    files.forEach((file) => body.append("file", file));

    try {
      const response = await fetch("/api/generate", { method: "POST", body });
      const json = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(json?.error ?? t.serverErrors.unexpected);
      }

      if (onSaved && (format === "game" || format === "worksheet" || format === "test")) {
        const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
        onSaved(
          format === "game"
            ? { id, createdAt: Date.now(), format, title: json.game.gameTitle, subject: json.game.subject, game: json.game }
            : { id, createdAt: Date.now(), format, title: json.data.title, subject: profile.subject, sheet: { data: json.data, pdfBase64: json.pdfBase64, filename: json.filename } }
        );
      }

      if (format === "game") {
        setGame(json.game);
        setStep("result-game");
      } else if (format === "spelling") {
        setDiagnostic(json.diagnostic);
        setStep("spelling-diagnostic");
      } else if (format === "podcast") {
        const blob = base64ToBlob(json.audioBase64, "audio/mpeg");
        const url = URL.createObjectURL(blob);
        setPodcastInfo({ url, filename: json.filename, blob, title: json.title, script: json.script });
        setPodcastTab("listen");
        setStep("result-podcast");
      } else {
        const blob = base64ToBlob(json.pdfBase64, "application/pdf");
        const url = URL.createObjectURL(blob);
        setDownloadInfo({ url, filename: json.filename, blob, data: json.data });
        setResultTab("preview");
        setStep("result-file");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error.");
      setStep("error");
    }
  }

  function handleDiagnosticComplete(missed: SpellingItem[], correctCount: number) {
    if (!diagnostic) return;
    setSpellingResult({ missed, correctCount, total: diagnostic.items.length });
    setStep("spelling-summary");
  }

  async function handleBuildFollowup() {
    if (!spellingResult || spellingResult.missed.length === 0) return;
    setLoadingTitle(t.spelling.buildingWorksheet);
    setStep("loading");
    setErrorMessage("");

    const body = new FormData();
    if (profile.grade !== undefined) body.set("grade", String(profile.grade));
    if (profile.schoolType) body.set("schoolType", profile.schoolType);
    if (profile.subject) body.set("subject", profile.subject);
    if (profile.notes) body.set("notes", profile.notes);
    body.set("format", "spelling");
    body.set("phase", "followup");
    body.set("missed", JSON.stringify(spellingResult.missed));
    body.set("locale", locale);
    body.set("device", deviceId());
    files.forEach((file) => body.append("file", file));

    try {
      const response = await fetch("/api/generate", { method: "POST", body });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error ?? t.serverErrors.unexpected);
      }
      const blob = base64ToBlob(json.pdfBase64, "application/pdf");
      const url = URL.createObjectURL(blob);
      setDownloadInfo({ url, filename: json.filename, blob, data: json.data });
      setResultTab("preview");
      setStep("result-file");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error.");
      setStep("error");
    }
  }

  function handleRestart() {
    if (onNew) {
      onNew();
      return;
    }
    setStep("input");
    setFiles([]);
    setFormat(null);
    setGame(null);
    setDownloadInfo(null);
    setPodcastInfo(null);
    setDiagnostic(null);
    setSpellingResult(null);
    setErrorMessage("");
  }

  if (step === "loading") {
    return <LoadingState title={loadingTitle} />;
  }

  if (step === "error") {
    return <ErrorState message={errorMessage} onRetry={() => setStep("input")} />;
  }

  if (step === "result-game" && game) {
    return (
      <div>
        <GameShell game={game} />
        <p className="mt-6 text-center text-xs text-zinc-500">{t.wizard.aiNote}</p>
        <div className="mt-6 text-center">
          <button type="button" onClick={handleRestart} className="text-sm text-brand-400 hover:underline">
            {t.wizard.newMaterial}
          </button>
        </div>
      </div>
    );
  }

  if (step === "spelling-diagnostic" && diagnostic) {
    return <SpellingDiagnosticPlayer diagnostic={diagnostic} onComplete={handleDiagnosticComplete} />;
  }

  if (step === "spelling-summary" && spellingResult) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <p className="mb-2 text-lg font-semibold">{t.spelling.summaryTitle}</p>
        <p className="mb-6 text-zinc-400">{t.spelling.summaryScore(spellingResult.correctCount, spellingResult.total)}</p>

        {spellingResult.missed.length === 0 ? (
          <p className="mb-6 text-green-400">{t.spelling.summaryAllCorrect}</p>
        ) : (
          <div className="mb-6 rounded-xl border border-zinc-700 p-4 text-left">
            <p className="mb-2 text-sm font-medium text-zinc-400">{t.spelling.missedHeading}</p>
            <ul className="flex flex-wrap gap-2">
              {spellingResult.missed.map((item, i) => (
                <li key={i} className="rounded-full bg-orange-400/10 px-3 py-1 text-sm text-orange-300">
                  {item.correctSpelling}
                </li>
              ))}
            </ul>
          </div>
        )}

        {spellingResult.missed.length > 0 && (
          <button
            type="button"
            onClick={handleBuildFollowup}
            className="mb-4 w-full rounded-full bg-brand-400 px-6 py-3 font-medium text-black hover:bg-brand-300"
          >
            {t.spelling.buildWorksheet}
          </button>
        )}

        <div>
          <button type="button" onClick={handleRestart} className="text-sm text-brand-400 hover:underline">
            {t.wizard.newMaterial}
          </button>
        </div>
      </div>
    );
  }

  if (step === "result-podcast" && podcastInfo) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-1 text-lg font-semibold">{t.wizard.done}</p>
        <p className="mb-4 text-xs text-zinc-500">{t.wizard.aiNote}</p>

        <div className="sticky top-2 z-10 mb-4 flex flex-wrap items-center justify-center gap-3 rounded-full bg-black/90 p-2 backdrop-blur">
          <a
            href={podcastInfo.url}
            download={podcastInfo.filename}
            className="inline-block rounded-full bg-brand-400 px-6 py-3 font-medium text-black hover:bg-brand-300"
          >
            {t.wizard.downloadPodcast}
          </a>
          <ShareButton
            getFile={() => new File([podcastInfo.blob], podcastInfo.filename, { type: "audio/mpeg" })}
          />
        </div>

        <div className="mb-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setPodcastTab("listen")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              podcastTab === "listen" ? "bg-brand-400 text-black" : "border border-zinc-700 text-zinc-400"
            }`}
          >
            {t.wizard.preview}
          </button>
          <button
            type="button"
            onClick={() => setPodcastTab("transcript")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              podcastTab === "transcript" ? "bg-brand-400 text-black" : "border border-zinc-700 text-zinc-400"
            }`}
          >
            {t.wizard.transcriptTab}
          </button>
        </div>

        {podcastTab === "listen" ? (
          <div className="rounded-2xl border border-zinc-700 p-6">
            <p className="mb-4 font-semibold">{podcastInfo.title}</p>
            <audio controls src={podcastInfo.url} className="w-full" />
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-zinc-700 p-6 text-left text-sm leading-relaxed whitespace-pre-wrap text-zinc-300">
            {podcastInfo.script}
          </div>
        )}

        <div className="mt-6">
          <button type="button" onClick={handleRestart} className="text-sm text-brand-400 hover:underline">
            {t.wizard.newMaterial}
          </button>
        </div>
      </div>
    );
  }

  if (step === "result-file" && downloadInfo && format) {
    const downloadLabel = format === "test" ? t.wizard.downloadTest : t.wizard.downloadWorksheet;
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-1 text-lg font-semibold">{t.wizard.done}</p>
        <p className="mb-4 text-xs text-zinc-500">{t.wizard.aiNote}</p>

        <div className="sticky top-2 z-10 mb-4 flex flex-wrap items-center justify-center gap-3 rounded-full bg-black/90 p-2 backdrop-blur">
          <a
            href={downloadInfo.url}
            download={downloadInfo.filename}
            className="inline-block rounded-full bg-brand-400 px-6 py-3 font-medium text-black hover:bg-brand-300"
          >
            {downloadLabel}
          </a>
          <ShareButton
            getFile={() => new File([downloadInfo.blob], downloadInfo.filename, { type: "application/pdf" })}
          />
        </div>

        <div className="mb-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setResultTab("preview")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              resultTab === "preview" ? "bg-brand-400 text-black" : "border border-zinc-700 text-zinc-400"
            }`}
          >
            {t.wizard.previewTab}
          </button>
          <button
            type="button"
            onClick={() => setResultTab("practice")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              resultTab === "practice" ? "bg-brand-400 text-black" : "border border-zinc-700 text-zinc-400"
            }`}
          >
            {t.wizard.practiceTab}
          </button>
        </div>

        {resultTab === "preview" ? (
          <PdfPreview url={downloadInfo.url} label={downloadLabel} />
        ) : (
          <InteractiveWorksheet data={downloadInfo.data} />
        )}

        <div className="mt-6">
          <button type="button" onClick={handleRestart} className="text-sm text-brand-400 hover:underline">
            {t.wizard.newMaterial}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      {mode !== "topic" && <FileUpload files={files} onChange={setFiles} />}
      {mode !== "topic" && files.length === 0 && <p className="mb-6 -mt-2 text-sm text-zinc-400">{t.upload.noUploadHint}</p>}
      <ProfileForm profile={profile} onChange={setProfile} />
      {format === "spelling" && files.length === 0 && (
        <p className="mb-4 -mt-2 text-sm text-zinc-400">{t.spelling.uploadOptionalHint}</p>
      )}
      <FormatSelector value={format} onChange={setFormat} />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mt-6 w-full rounded-full bg-brand-400 px-6 py-3 font-medium text-black transition hover:bg-brand-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
      >
        {t.wizard.submit}
      </button>
    </div>
  );
}
