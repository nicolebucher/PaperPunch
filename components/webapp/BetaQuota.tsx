"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deviceId } from "@/lib/webapp/groups";
import { useAppText } from "./ui";

// Beta-Kontingent in der Web-App: einmaliger Hinweis beim ersten Erstellen, Zähler mit 10 Balken
// und Hinweis, wenn die Woche aufgebraucht ist. Gezählt wird auf dem Server (/api/quota).

const INTRO_KEY = "paperpunch-beta-intro";
const DEFAULT_LIMIT = 10;

export interface Quota {
  enforced: boolean;
  limit: number;
  used: number;
  remaining: number;
}

export function useQuota(): Quota | null {
  const [quota, setQuota] = useState<Quota | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/quota?device=${encodeURIComponent(deviceId())}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((q: Quota | null) => alive && q && setQuota(q))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return quota;
}

function Bars({ total, filled }: { total: number; filled: number }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2 rounded-full ${i < filled ? "bg-[#1fd6ea]" : "bg-zinc-800"}`} />
      ))}
    </div>
  );
}

/** Einmaliger Beta-Hinweis (Bottom-Sheet auf dem Handy, zentriertes Fenster am Desktop). */
export function BetaIntro({ limit }: { limit?: number }) {
  const tx = useAppText();
  const [open, setOpen] = useState(false);
  const n = limit ?? DEFAULT_LIMIT;
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(INTRO_KEY)) setOpen(true);
    } catch {
      // ohne Speicher kein Hinweis
    }
  }, []);
  if (!open) return null;
  const close = () => {
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      // egal
    }
    setOpen(false);
  };
  const [a, b, c] = tx.betaText(n);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="beta-title">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-t-[28px] bg-[#15171b] px-5 pb-7 pt-3.5 text-center ring-1 ring-white/[0.08] sm:rounded-[28px] sm:pt-6">
        <span className="mx-auto h-[5px] w-11 rounded bg-zinc-700 sm:hidden" aria-hidden="true" />
        <span className="mx-auto mt-1.5 rounded-full bg-[#f23a8e] px-4 py-2 text-sm font-black tracking-[0.14em] text-[#0b0c0f]">BETA</span>
        <h2 id="beta-title" className="text-2xl font-black tracking-tight">{tx.betaTitle}</h2>
        <p className="text-base font-semibold leading-relaxed text-zinc-400">
          {a}<b className="font-extrabold text-zinc-100">{b}</b>{c}
        </p>
        <div className="mt-1 flex flex-col gap-1.5">
          <Bars total={n} filled={n} />
          <div className="flex justify-between text-[13px] font-extrabold text-zinc-500"><span>{tx.betaPerWeek(n)}</span><span>↻ {tx.betaMonday}</span></div>
        </div>
        <button type="button" onClick={close} autoFocus className="rounded-[20px] bg-[#1fd6ea] px-6 py-4 text-[17px] font-extrabold text-black">{tx.betaOk}</button>
      </div>
    </div>
  );
}

/** Kleine Zeile "Beta · noch 7 von 10 diese Woche" mit Balken (nur wenn auf dem Server gezählt wird). */
export function QuotaLine({ quota }: { quota: Quota | null }) {
  const tx = useAppText();
  if (!quota?.enforced) return null;
  return (
    <div className="flex flex-col gap-1.5 px-1">
      <span className="text-xs font-extrabold text-zinc-500">{tx.quotaLine(quota.remaining, quota.limit)}</span>
      <Bars total={quota.limit} filled={quota.remaining} />
    </div>
  );
}

/** Statt des Erstellen-Buttons, wenn die Woche aufgebraucht ist. */
export function QuotaEmpty({ limit }: { limit: number }) {
  const tx = useAppText();
  return (
    <div className="mt-6 flex flex-col gap-2 rounded-[22px] bg-[#15171b] p-5 text-center ring-1 ring-white/[0.06]">
      <p className="text-[15px] font-semibold leading-relaxed text-zinc-300">{tx.quotaEmpty(limit)}</p>
      <Link href="/feedback" className="text-sm font-extrabold text-[#1fd6ea]">{tx.quotaFeedback} →</Link>
    </div>
  );
}
