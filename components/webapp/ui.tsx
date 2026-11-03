"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
};

export function AppIcon({ name, size = 20, stroke = 2 }: { name: keyof typeof PATHS | string; size?: number; stroke?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}

/** Die bunten Pixel aus dem Logo, klein. */
export function Pixels() {
  return (
    <span aria-hidden="true" className="grid grid-cols-3 gap-[3px]">
      <i className="h-[7px] w-[7px] rounded-[2px] bg-[#1fd6ea]" />
      <i />
      <i className="h-[7px] w-[7px] rounded-[2px] bg-[#f23a8e]" />
      <i />
      <i className="h-[7px] w-[7px] rounded-[2px] bg-[#a8e43a]" />
      <i className="h-[7px] w-[7px] rounded-[2px] bg-[#1fd6ea]" />
    </span>
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
