"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { PdfPreview } from "@/components/pdf/PdfPreview";
import { InteractiveWorksheet } from "@/components/worksheet/InteractiveWorksheet";
import { buildStandaloneGameHtml } from "@/lib/game/build-standalone-game-html";
import { useLanguage } from "@/lib/i18n/language-context";
import { shareOrDownloadFile } from "@/lib/share";
import { slugify } from "@/lib/slugify";
import type { WebMaterial } from "@/lib/webapp/store";
import { AppIcon, useAppText } from "./ui";

function base64ToBlob(base64: string, type: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

const CONFETTI: [number, number, number, string, number][] = [
  [6, 8, 12, "#1fd6ea", 12], [88, 4, 10, "#f23a8e", -20], [82, 42, 14, "#a8e43a", 30], [12, 52, 9, "#f23a8e", 45],
  [72, 16, 8, "#1fd6ea", -10], [24, 26, 7, "#a8e43a", 20], [92, 70, 8, "#1fd6ea", 15], [3, 80, 10, "#a8e43a", -25],
];

/** Ergebnis wie in der App (E3): Erfolgsmoment, dann "Wie willst du üben?" mit großen Optionen. */
export function ResultView({ material }: { material: WebMaterial }) {
  const tx = useAppText();
  const { locale } = useLanguage();
  const [view, setView] = useState<"home" | "practice" | "pdf" | "play">("home");
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [nick, setNick] = useState(() => {
    try {
      return localStorage.getItem("paperpunch-nickname") ?? "";
    } catch {
      return "";
    }
  });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const pdf = useMemo(() => {
    if (!material.sheet) return null;
    const blob = base64ToBlob(material.sheet.pdfBase64, "application/pdf");
    return { blob, url: URL.createObjectURL(blob), filename: material.sheet.filename };
  }, [material.sheet]);

  const formatName = tx.formats[material.format];
  const tasks = material.sheet?.data.tasks.length ?? 0;
  const questions = material.game?.levels.reduce((s, l) => s + l.questions.length, 0) ?? 0;
  const minutes = material.sheet ? Math.max(5, Math.round((tasks * 1.5) / 5) * 5) : Math.max(3, Math.round(questions / 3));
  const meta = [material.sheet ? tx.tasks(tasks) : tx.questions(questions), tx.approxMin(minutes), material.game?.subject].filter(Boolean).join(" · ");

  const back = (
    <button type="button" onClick={() => setView("home")} aria-label={tx.back} className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-[#15171b] ring-1 ring-white/[0.06]">
      <AppIcon name="back" />
    </button>
  );
  if (view === "practice" && material.sheet) return <div>{back}<InteractiveWorksheet data={material.sheet.data} /></div>;
  if (view === "pdf" && pdf) return <div>{back}<PdfPreview url={pdf.url} label={tx.download} /></div>;
  if (view === "play" && material.game) {
    return (
      <div>
        {back}
        <GameShell game={material.game} />
      </div>
    );
  }

  async function share() {
    if (pdf) await shareOrDownloadFile(new File([pdf.blob], pdf.filename, { type: "application/pdf" }), material.title);
    else if (material.game) {
      const html = buildStandaloneGameHtml(material.game, locale);
      await shareOrDownloadFile(new File([html], `${slugify(material.game.gameTitle)}.html`, { type: "text/html" }), material.title);
    }
  }

  async function challenge() {
    if (!material.game || busy) return;
    setBusy(true);
    setNote("");
    try {
      if (nick.trim()) localStorage.setItem("paperpunch-nickname", nick.trim());
    } catch {
      // ignorieren
    }
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: material.game, name: nick.trim(), lang: locale }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { url } = (await res.json()) as { url: string };
      const text = locale === "de" ? `Spiel „${material.title}“ gegen mich – wer schafft mehr? ⚔️` : `Play “${material.title}” against me – who gets more right? ⚔️`;
      if (navigator.share) {
        try {
          await navigator.share({ text, url });
        } catch {
          // abgebrochen
        }
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setNote(tx.linkCopied);
      }
    } catch {
      setNote(tx.genError);
    } finally {
      setBusy(false);
    }
  }

  const option = (icon: string, title: string, sub: string, onClick: () => void, main = false) => (
    <button
      key={title}
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3.5 rounded-[22px] p-4 text-left transition active:scale-[0.98] ${main ? "bg-zinc-100 text-zinc-950" : "bg-[#15171b] text-zinc-100 ring-1 ring-white/[0.06]"}`}
    >
      <span className={`grid h-[46px] w-[46px] flex-none place-items-center rounded-[14px] ${main ? "bg-zinc-950 text-[#1fd6ea]" : "bg-[#22252b]"}`}><AppIcon name={icon} size={22} /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <b className="text-[17px]">{title}</b>
        <span className={`text-[13px] font-semibold ${main ? "text-zinc-600" : "text-zinc-400"}`}>{sub}</span>
      </span>
      <AppIcon name="chevron" size={18} stroke={2.6} />
    </button>
  );

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <div className="relative flex min-h-[280px] flex-1 items-center justify-center px-4 py-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {CONFETTI.map(([x, y, s, c, r], i) => (
            <i key={i} className="absolute rounded-[3px] opacity-85" style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, background: c, transform: `rotate(${r}deg)` }} />
          ))}
        </div>
        <div className="relative z-10 flex flex-col items-center gap-2.5 text-center">
          <span className="mb-1.5 grid h-[76px] w-[76px] place-items-center rounded-[26px] bg-[#1fd6ea] text-[#062a2f] shadow-[0_0_0_8px_rgba(31,214,234,0.12)]"><AppIcon name="check" size={36} stroke={2.6} /></span>
          <span className="text-[13px] font-extrabold text-zinc-400">{tx.ready(formatName)}</span>
          <h1 className="text-[30px] font-black leading-tight tracking-tight">{material.title}</h1>
          <span className="text-[15px] font-bold text-zinc-400">{meta}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="px-1 text-[13px] font-extrabold text-zinc-400">{tx.howPractice}</span>
        {material.sheet && option("play", tx.solveOnline, tx.solveSub, () => setView("practice"), true)}
        {material.game && option("play", tx.playGame, tx.solveSub, () => setView("play"), true)}
        {material.sheet && option("eye", tx.viewPdf, tx.viewPdfSub, () => setView("pdf"))}
        {pdf && (
          <a href={pdf.url} download={pdf.filename} className="flex w-full items-center gap-3.5 rounded-[22px] bg-[#15171b] p-4 text-left ring-1 ring-white/[0.06]">
            <span className="grid h-[46px] w-[46px] flex-none place-items-center rounded-[14px] bg-[#22252b]"><AppIcon name="download" size={22} /></span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5"><b className="text-[17px]">{tx.download}</b><span className="text-[13px] font-semibold text-zinc-400">{tx.downloadSub}</span></span>
            <AppIcon name="chevron" size={18} stroke={2.6} />
          </a>
        )}
        {material.game && option("punch", tx.challenge, tx.challengeSub, () => setChallengeOpen((v) => !v))}
        {challengeOpen && material.game && (
          <div className="flex flex-col gap-2.5 rounded-[22px] bg-[#15171b] p-4 ring-1 ring-white/[0.06]">
            <label className="flex flex-col gap-1.5 text-xs font-extrabold text-zinc-400">
              {tx.nickname}
              <input value={nick} maxLength={20} placeholder={tx.nicknamePh} onChange={(e) => setNick(e.target.value)} className="h-12 rounded-xl border border-zinc-700 bg-black px-4 text-base font-semibold text-zinc-100 outline-none focus:border-[#1fd6ea]" />
            </label>
            <button type="button" disabled={busy} onClick={() => void challenge()} className="rounded-2xl bg-[#1fd6ea] px-5 py-3.5 font-extrabold text-black disabled:opacity-60">{tx.challengeSend}</button>
          </div>
        )}
        {option("share", tx.share, material.game ? tx.shareGameSub : tx.shareSub, () => void share())}
        {note && <p className="text-center text-sm font-semibold text-zinc-400">{note}</p>}
      </div>

      <div className="mt-6 flex items-center justify-between px-1 text-xs font-semibold text-zinc-500">
        <span>{tx.aiShort}</span>
        <Link href="/app" className="font-extrabold text-[#1fd6ea]">{tx.newMaterial}</Link>
      </div>
    </div>
  );
}
