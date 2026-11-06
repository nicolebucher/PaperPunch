"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { LOADING_TIPS } from "@/lib/webapp/loading-tips";

// Ladebildschirm wie in der App (mobile/src/screens/Working.tsx): Pixel werden aus dem Buch "gestanzt",
// darunter füllt sich eine Pixel-Leiste, dazu wechselnde Lerntipps. Die API meldet keinen Fortschritt –
// die Anzeige läuft nach Zeit und bleibt kurz vor dem Ende stehen, bis die Antwort da ist.
// Animationen: app/globals.css (.pp-mark-punch, .pp-pixelbar …).

const EXPECTED: Record<string, number> = { plan: 35, adjust: 25, game: 90, worksheet: 60, test: 50 };
const CELLS = 12;
const CYAN = "#1FD6EA";
const PINK = "#F23A8E";
const GREEN = "#A8E43A";
const PIXEL_COLORS = [CYAN, PINK, GREEN];
const PIXELS: { x: number; y: number; c: string }[] = [
  { x: 114, y: 44, c: CYAN },
  { x: 118, y: 72, c: CYAN },
  { x: 124, y: 28, c: PINK },
  { x: 132, y: 86, c: GREEN },
  { x: 134, y: 56, c: PINK },
  { x: 150, y: 46, c: GREEN },
  { x: 150, y: 74, c: PINK },
  { x: 150, y: 92, c: CYAN },
  { x: 148, y: 14, c: GREEN },
  { x: 160, y: 30, c: PINK },
  { x: 170, y: 56, c: CYAN },
  { x: 172, y: 82, c: PINK },
];

const TEXT = {
  de: {
    working: (what: string) => `Ich baue dein ${what} …`,
    plan: "Lernplan wird erstellt …",
    stepRead: (n: number) => (n > 1 ? `${n} Dateien lesen` : n === 1 ? "Datei lesen" : "Thema verstehen"),
    stepThink: "Aufgaben ausdenken",
    stepPlan: "Plan ausdenken",
    stepBuild: "Fertig machen",
    tipLabel: "Lerntipp",
    slow: "Dauert heute etwas länger – gleich geschafft.",
  },
  en: {
    working: (what: string) => `Building your ${what.toLowerCase()} …`,
    plan: "Creating your study plan …",
    stepRead: (n: number) => (n > 1 ? `Reading ${n} files` : n === 1 ? "Reading file" : "Understanding topic"),
    stepThink: "Writing tasks",
    stepPlan: "Planning the days",
    stepBuild: "Finishing",
    tipLabel: "Study tip",
    slow: "Taking a little longer today – almost there.",
  },
};

function PunchMark() {
  return (
    <svg className="pp-mark pp-mark-punch" viewBox="14 6 180 112" role="img" aria-label="PaperPunch">
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M92 30C78 20 58 17 40 19V88C58 86 78 89 92 98Z" />
        <path d="M32 26V94C52 92 74 94 92 104" />
        <path d="M24 33V100C48 98 72 100 92 110" />
        <path d="M92 30C100 24 108 21 114 20" />
        <path d="M92 98C98 94 104 92 110 91" />
        <path d="M92 30V98" />
        <path className="pp-mark-line" d="M52 38C64 37 74 39 82 43" />
        <path className="pp-mark-line" d="M52 52C64 51 74 53 82 57" />
        <path className="pp-mark-line" d="M52 66C62 65 70 67 78 70" />
      </g>
      {PIXELS.map((p, i) => (
        <rect
          key={i}
          className="pp-mark-px"
          x={p.x}
          y={p.y}
          width="13"
          height="13"
          fill={p.c}
          style={{ "--i": i, "--dx": `${(p.x - 92) * 0.35}px`, "--dy": `${(p.y - 60) * 0.35}px`, transformOrigin: `${p.x + 6.5}px ${p.y + 6.5}px` } as CSSProperties}
        />
      ))}
    </svg>
  );
}

/** kind: Format des Materials ("worksheet" | "test" | "game") oder "plan". formatName: angezeigter Name des Formats. */
export function Working({ kind, formatName = "", fileCount = 0 }: { kind: string; formatName?: string; fileCount?: number }) {
  const { locale } = useLanguage();
  const lang = locale === "de" ? "de" : "en";
  const t = TEXT[lang];
  const tips = LOADING_TIPS[lang];
  const [seconds, setSeconds] = useState(0);
  // Jedes Mal an einer zufälligen Stelle anfangen, damit nicht immer dieselben Tipps kommen.
  const [tipStart] = useState(() => Math.floor(Math.random() * 1000));

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const expected = EXPECTED[kind] ?? 60;
  // schnell am Anfang, langsamer gegen Ende, nie ganz voll
  const progress = Math.min(0.94, 1 - Math.exp((-2.2 * seconds) / expected));
  const filled = Math.floor(progress * CELLS);
  const step = progress < 0.25 ? 0 : progress < 0.7 ? 1 : 2;
  const steps = [t.stepRead(fileCount), kind === "plan" ? t.stepPlan : t.stepThink, t.stepBuild];
  const tip = tips[(tipStart + Math.floor(seconds / 8)) % tips.length];
  const title = kind === "plan" ? t.plan : t.working(formatName);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-[22px] py-6">
      <div className="flex flex-1 flex-col justify-center gap-[22px]">
        <div className="relative flex justify-center pb-1 pt-[18px]" aria-hidden="true">
          <span className="pp-glow" />
          <div className="relative w-[min(78%,300px)] text-zinc-100">
            <PunchMark />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2.5 text-center">
          <h1 className="font-brand text-2xl font-medium leading-tight tracking-[-0.01em]" aria-live="polite">{title}</h1>
          <span key={step} className="pp-fadein text-base font-medium text-[#1fd6ea]">{steps[step]} …</span>
        </div>

        <div className="pp-pixelbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={title}>
          {Array.from({ length: CELLS }, (_, i) => (
            <span key={i} className={i < filled ? "on" : i === filled ? "next" : ""} style={{ background: i < filled ? PIXEL_COLORS[i % 3] : undefined }} />
          ))}
        </div>
      </div>

      <div key={tip} className="pp-fadein flex flex-col gap-1.5 rounded-[20px] bg-[#18181b] px-[18px] py-4 ring-1 ring-[#27272a]">
        <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-[#1fd6ea]">{t.tipLabel}</span>
        <p className="text-base font-medium leading-snug text-zinc-100">{seconds > expected * 1.4 ? t.slow : tip}</p>
      </div>
    </div>
  );
}
