"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { APP_TEXT } from "./text";

export const useAppText = () => {
  const { locale } = useLanguage();
  return APP_TEXT[locale];
};

const PATHS: Record<string, string> = {
  camera: "M3 7h3l2-3h8l2 3h3v13H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  calendar: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
  home: "M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5",
  folder: "M3 6h6l2 2h10v11H3z",
  punch: "M9 3h5a5 5 0 0 1 5 5v4a4 4 0 0 1-4 4H9.5A4.5 4.5 0 0 1 5 11.5V7a4 4 0 0 1 4-4zM5 9.5H4a2 2 0 0 0 0 4h1.4M8 16v5h8.5v-5M11 8.5h5",
  chevron: "M9 6l6 6-6 6",
  back: "M15 18l-6-6 6-6",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  check: "M5 12l5 5 9-10",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  play: "M7 4l12 8-12 8z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  download: "M12 4v12M7 11l5 5 5-5M4 20h16",
  share: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v4h16v-4",
  sheet: "M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h6",
  test: "M9 11l3 3 8-8M20 12v7H4V5h11",
  game: "M6 9h4M8 7v4M15 10h.01M18 8h.01M3 6h18v10a3 3 0 0 1-5 2l-2-2h-4l-2 2a3 3 0 0 1-5-2z",
  heart: "M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6C19 16.5 12 21 12 21z",
};

export function AppIcon({ name, size = 20, stroke = 2 }: { name: keyof typeof PATHS | string; size?: number; stroke?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}

/** Die bunten Pixel aus dem Logo, klein. */
// Bildmarke wie in der App: aufgeschlagenes Buch, aus dem bunte Pixel gestanzt werden.
// Das Buch nimmt die Textfarbe an (weiß auf dunklem, schwarz auf hellem Grund), die Pixel bleiben bunt.
const MARK_PIXELS: [number, number, string][] = [
  [114, 44, "#1FD6EA"], [118, 72, "#1FD6EA"], [124, 28, "#F23A8E"], [132, 86, "#A8E43A"],
  [134, 56, "#F23A8E"], [150, 46, "#A8E43A"], [150, 74, "#F23A8E"], [150, 92, "#1FD6EA"],
  [148, 14, "#A8E43A"], [160, 30, "#F23A8E"], [170, 56, "#1FD6EA"], [172, 82, "#F23A8E"],
];

export function BrandMark({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg className={className} viewBox="14 6 180 112" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M92 30C78 20 58 17 40 19V88C58 86 78 89 92 98Z" />
        <path d="M32 26V94C52 92 74 94 92 104" />
        <path d="M24 33V100C48 98 72 100 92 110" />
        <path d="M92 30C100 24 108 21 114 20" />
        <path d="M92 98C98 94 104 92 110 91" />
        <path d="M92 30V98" />
        <path d="M52 38C64 37 74 39 82 43" />
        <path d="M52 52C64 51 74 53 82 57" />
        <path d="M52 66C62 65 70 67 78 70" />
      </g>
      {MARK_PIXELS.map(([x, y, c], i) => (
        <rect key={i} x={x} y={y} width="13" height="13" fill={c} />
      ))}
    </svg>
  );
}

const COLORS = {
  teal: "bg-[#1fd6ea] text-[#041b1e]",
  pink: "bg-[#f23a8e] text-[#2a0516]",
  green: "bg-[#a8e43a] text-[#172405]",
};

/** Großer Weg-Knopf wie in der App (Icon-Quadrat, Titel, Unterzeile, Pfeil). card = hohe Karte für Desktop. */
export function WayButton({ href, icon, color, title, sub, main, badge, card }: { href: string; icon: string; color: keyof typeof COLORS; title: string; sub: string; main?: boolean; badge?: string; card?: boolean }) {
  const base = main ? "bg-zinc-100 text-zinc-950" : "bg-[#15171b] text-zinc-100 ring-1 ring-white/[0.06]";
  if (card) {
    return (
      <Link href={href} className={`flex min-h-[220px] flex-col justify-between rounded-[28px] p-6 transition active:scale-[0.98] hover:brightness-110 ${base}`}>
        <span className={`grid h-14 w-14 place-items-center rounded-2xl ${COLORS[color]}`}><AppIcon name={icon} size={28} stroke={2.2} /></span>
        <span className="flex flex-col gap-2">
          <b className="flex items-center gap-2 text-[22px] leading-tight tracking-tight">{title}{badge && <Badge>{badge}</Badge>}</b>
          <span className={`text-sm font-semibold leading-snug ${main ? "text-zinc-600" : "text-zinc-400"}`}>{sub}</span>
        </span>
      </Link>
    );
  }
  return (
    <Link href={href} className={`flex min-h-[86px] items-center gap-3.5 rounded-3xl p-4 transition active:scale-[0.98] ${base} ${main ? "min-h-[98px]" : ""}`}>
      <span className={`grid h-[52px] w-[52px] flex-none place-items-center rounded-2xl ${COLORS[color]}`}><AppIcon name={icon} size={24} stroke={2.2} /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <b className="flex items-center gap-2 text-lg leading-tight tracking-tight">{title}{badge && <Badge>{badge}</Badge>}</b>
        <span className={`text-[13px] font-semibold leading-snug ${main ? "text-zinc-600" : "text-zinc-400"}`}>{sub}</span>
      </span>
      <AppIcon name="chevron" size={18} stroke={2.6} />
    </Link>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-md border border-zinc-600 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-zinc-400">{children}</span>;
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-zinc-500">{children}</span>
      {right}
    </div>
  );
}

/** Weiterempfehlen: Teilen-Menü mit Link zu PaperPunch; ohne Teilen-Menü (Computer) wird der Link kopiert. */
export function RecommendButton({ className }: { className: string }) {
  const tx = useAppText();
  const [copied, setCopied] = useState(false);
  async function recommend() {
    const url = "https://paper-punch.com";
    const text = tx.recommendText;
    try {
      if (navigator.share) {
        await navigator.share({ title: "PaperPunch", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // abgebrochen
    }
  }
  return (
    <button type="button" onClick={() => void recommend()} className={className}>
      <AppIcon name="heart" />
      {copied ? tx.linkCopied : tx.recommend}
    </button>
  );
}
