"use client";

import { useState } from "react";
import { MathText } from "@/components/ui/MathText";
import { splitLanguageNote } from "@/lib/answer-match";

// Zuordnen im Lernspiel: links antippen, dann rechts (oder umgekehrt) – wie beim Online-Lösen (SheetPractice)
// und in der App (mobile/src/MatchBoard.tsx, gleiche Mischung, damit alle dieselbe Reihenfolge sehen).

export interface Pair {
  left: string;
  right: string;
}

const MATCH_COLORS = ["#1FD6EA", "#F23A8E", "#A8E43A", "#F59E0B", "#8B5CF6", "#14B8A6", "#EF4444", "#3B82F6"];
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Rechte Spalte fest je Frage gemischt, höchstens ein Drittel neben seinem Partner (identisch zur App). */
export function matchRights(pairs: Pair[], seedText: string): string[] {
  const rights = pairs.map((p) => p.right);
  if (rights.length < 2) return rights;
  let seed = 2166136261;
  for (const ch of seedText) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const fixed = (a: string[]) => a.filter((v, i) => v === rights[i]).length;
  let out = [...rights];
  for (let tries = 0; tries < 12 && (tries === 0 || fixed(out) > Math.floor(rights.length / 3)); tries++) {
    out = [...rights];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
  }
  if (fixed(out) > Math.floor(rights.length / 3)) out = [...rights.slice(1), rights[0]];
  return out;
}

export function isRightLink(pair: Pair, rights: string[], r: number | undefined): boolean {
  return r !== undefined && norm(rights[r] ?? "") === norm(pair.right);
}

export function MatchCard({
  prompt,
  pairs,
  rights,
  link,
  onLink,
  solved,
  retry,
  onSubmit,
  locale,
}: {
  prompt: string;
  pairs: Pair[];
  rights: string[];
  link: Record<number, number>;
  onLink: (next: Record<number, number>) => void;
  solved: boolean;
  retry: boolean;
  onSubmit: () => void;
  locale: string;
}) {
  const de = locale === "de";
  const [selLeft, setSelLeft] = useState<number | null>(null);
  const [selRight, setSelRight] = useState<number | null>(null);
  const { text, note } = splitLanguageNote(prompt);
  const allLinked = pairs.every((_, i) => link[i] !== undefined);

  function connect(l: number, r: number) {
    const next: Record<number, number> = {};
    for (const [k, v] of Object.entries(link)) if (v !== r && Number(k) !== l) next[Number(k)] = v;
    next[l] = r;
    onLink(next);
    setSelLeft(null);
    setSelRight(null);
  }
  function tapLeft(l: number) {
    if (selRight !== null) return connect(l, selRight);
    if (link[l] !== undefined) {
      const n = { ...link };
      delete n[l];
      onLink(n);
      setSelLeft(l);
      return;
    }
    setSelLeft((s) => (s === l ? null : l));
  }
  function tapRight(r: number) {
    if (selLeft !== null) return connect(selLeft, r);
    const owner = Object.entries(link).find(([, v]) => v === r);
    if (owner) {
      const n = { ...link };
      delete n[Number(owner[0])];
      onLink(n);
      setSelRight(r);
      return;
    }
    setSelRight((s) => (s === r ? null : r));
  }

  const item = (color: string | undefined, sel: boolean) =>
    `min-h-13 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold leading-snug transition active:scale-[0.98] ${sel ? "ring-4 ring-zinc-900/10" : ""} ${color ? "" : sel ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-zinc-50 hover:border-zinc-400"}`;

  return (
    <div className="rounded-[28px] bg-white p-5 text-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.25)] sm:p-6">
      {note && <h2 className="mb-2 text-sm font-extrabold text-zinc-500">🌐 {note}</h2>}
      <p className="mb-4 text-[22px] font-extrabold leading-snug"><MathText text={text} /></p>
      {solved ? (
        <div className="flex flex-col gap-2.5">
          {pairs.map((p, i) => {
            const given = link[i] !== undefined ? rights[link[i]] : undefined;
            const ok = isRightLink(p, rights, link[i]);
            return (
              <div key={i} className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)] items-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm font-bold ${ok ? "border-lime-600 bg-lime-50" : "border-orange-500 bg-orange-50"}`}>
                <span><MathText text={p.left} /></span>
                <span className="text-zinc-400">→</span>
                <span>{ok ? <MathText text={p.right} /> : <><s className="mr-1 text-zinc-400">{given ?? "–"}</s><MathText text={p.right} /></>}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-zinc-500">{de ? "Tippe links, dann rechts – so verbindest du ein Paar. Nochmal tippen löst es." : "Tap left, then right to connect a pair. Tap again to undo."}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-2">
              {pairs.map((p, i) => {
                const color = link[i] !== undefined ? MATCH_COLORS[i % MATCH_COLORS.length] : undefined;
                return (
                  <button key={i} type="button" aria-pressed={selLeft === i} onClick={() => tapLeft(i)} style={color ? { borderColor: color, background: `color-mix(in srgb, ${color} 16%, #ffffff)` } : undefined} className={item(color, selLeft === i)}>
                    <MathText text={p.left} />
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              {rights.map((rv, ri) => {
                const owner = Object.entries(link).find(([, v]) => v === ri);
                const color = owner ? MATCH_COLORS[Number(owner[0]) % MATCH_COLORS.length] : undefined;
                return (
                  <button key={ri} type="button" aria-pressed={selRight === ri} onClick={() => tapRight(ri)} style={color ? { borderColor: color, background: `color-mix(in srgb, ${color} 16%, #ffffff)` } : undefined} className={item(color, selRight === ri)}>
                    <MathText text={rv} />
                  </button>
                );
              })}
            </div>
          </div>
          {retry && <p className="rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 px-4 py-3 text-[15px] font-black text-orange-900">{de ? "Nicht ganz – die richtigen Paare bleiben stehen, versuch's nochmal!" : "Not quite – the right pairs stay, try again!"}</p>}
          <button type="button" disabled={!allLinked} onClick={onSubmit} className="w-full rounded-[20px] bg-zinc-900 px-5 py-4 text-[17px] font-extrabold text-white transition active:scale-[0.98] disabled:bg-zinc-200 disabled:text-zinc-500">
            {retry ? (de ? "Nochmal prüfen" : "Check again") : de ? "Prüfen" : "Check"}
          </button>
        </div>
      )}
    </div>
  );
}
