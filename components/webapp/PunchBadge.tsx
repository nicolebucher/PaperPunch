"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { learnedToday, levelFor, LEVELS_CHANGED_NOTE_UNTIL, PUNCHES_EVENT, streakDays, totalPunches } from "@/lib/webapp/punches";
import { useAppText } from "./ui";

/** Level-Ring + Punches oben rechts (wie in der App). Klick zeigt Stufe und was bis zur nächsten fehlt. */
export function PunchBadge() {
  const tx = useAppText();
  const { locale } = useLanguage();
  const [total, setTotal] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [today, setToday] = useState(false);
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => {
      setTotal(totalPunches());
      setStreak(streakDays());
      setToday(learnedToday());
    };
    refresh();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      refresh();
      setBump(true);
      clearTimeout(timer);
      timer = setTimeout(() => setBump(false), 600);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "paperpunch-web-punches") refresh();
    };
    window.addEventListener(PUNCHES_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(PUNCHES_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const value = total ?? 0;
  const lvl = levelFor(value);
  const pct = Math.round(lvl.progress * 100);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={tx.punchesAria(lvl.number, value)}
        aria-expanded={open}
        className={`flex h-11 items-center gap-2 rounded-full bg-[#15171b] py-1 pl-1 pr-3.5 text-sm font-extrabold tabular-nums ring-1 ring-white/[0.06] transition-transform ${bump ? "scale-110" : ""}`}
        style={{ visibility: total === null ? "hidden" : "visible" }}
      >
        <span
          className="grid h-9 w-9 place-items-center rounded-full"
          style={{ background: `conic-gradient(#1fd6ea ${pct}%, #2a2e36 0)` }}
        >
          <span className="grid h-[28px] w-[28px] place-items-center rounded-full bg-[#15171b] text-[13px]">{lvl.number}</span>
        </span>
        {value.toLocaleString(locale)}
        {streak > 0 && (
          <span className={`ml-0.5 flex items-center gap-0.5 ${today ? "text-orange-400" : "text-orange-400/60"}`}>
            <Flame /> {streak}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-[52px] z-30 flex w-[260px] flex-col gap-2 rounded-2xl bg-[#15171b] p-4 text-left shadow-2xl ring-1 ring-white/[0.08]">
          <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">{tx.punchesTitle}</span>
          <b className="text-lg leading-tight">{tx.punchesLevel(lvl.number, lvl.name)}</b>
          <div className="h-2 overflow-hidden rounded-full bg-[#2a2e36]">
            <div className="h-full rounded-full bg-[#1fd6ea]" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-semibold text-zinc-300">
            {lvl.toNext !== undefined && lvl.nextName ? tx.punchesToNext(lvl.toNext, lvl.nextName) : tx.punchesMax}
          </span>
          {streak > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-bold text-orange-400">
              <Flame /> {tx.streak(streak)}
              {!today && <span className="font-semibold text-zinc-500">· {tx.streakKeep}</span>}
            </span>
          )}
          {value > 0 && new Date().toISOString().slice(0, 10) <= LEVELS_CHANGED_NOTE_UNTIL && (
            <span className="rounded-xl bg-[#1fd6ea]/10 px-3 py-2 text-xs font-bold leading-snug text-[#7eeaf5] ring-1 ring-[#1fd6ea]/30">{tx.punchesNewLevels}</span>
          )}
          <span className="text-xs font-semibold leading-snug text-zinc-500">{tx.punchesHow}</span>
        </div>
      )}
    </div>
  );
}

function Flame() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3c.5 3.5 4.5 5.5 4.5 10a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5.3 1.5 1 2.5 2 3 0-3-1-5.5.5-8.5z" />
    </svg>
  );
}
