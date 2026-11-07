"use client";

import { MathText } from "@/components/ui/MathText";
import { splitLanguageNote } from "@/lib/answer-match";

// Satz bauen und Reihenfolge im Lernspiel: Kärtchen unten antippen → sie wandern nach oben (Satzzeile bzw.
// nummerierte Liste); oben antippen schickt sie zurück. Wie in der App (mobile/src/TileBoard.tsx).

export function TileCard({
  mode,
  prompt,
  tiles,
  picked,
  onPick,
  solved,
  ok,
  retry,
  onSubmit,
  locale,
}: {
  mode: "sentence" | "order";
  prompt: string;
  tiles: string[];
  picked: number[];
  onPick: (next: number[]) => void;
  solved: boolean;
  ok: boolean;
  retry: boolean;
  onSubmit: () => void;
  locale: string;
}) {
  const de = locale === "de";
  const sentence = mode === "sentence";
  const { text, note } = splitLanguageNote(prompt);
  const hint = sentence
    ? de ? "Tippe die Wörter in der richtigen Reihenfolge an. Nochmal tippen nimmt ein Wort zurück." : "Tap the words in the right order. Tap a word again to take it back."
    : de ? "Tippe die Karten in der richtigen Reihenfolge an. Oben antippen nimmt eine Karte zurück." : "Tap the cards in the right order. Tap a card at the top to take it back.";
  const empty = sentence ? (de ? "Hier entsteht dein Satz …" : "Your sentence appears here …") : de ? "Tippe unten die erste Karte an …" : "Tap the first card below …";
  const box = solved ? (ok ? "border-solid border-lime-600 bg-lime-50" : "border-solid border-orange-500 bg-orange-50") : "border-dashed border-zinc-300 bg-zinc-50";
  const wordTile = (inLine: boolean) =>
    `min-h-11 rounded-xl border-2 border-b-4 px-3.5 py-2 text-[17px] font-extrabold transition active:scale-95 disabled:active:scale-100 ${inLine ? "border-[#1fd6ea] bg-cyan-50" : "border-zinc-200 bg-white hover:border-zinc-400"}`;
  const orderTile = (inLine: boolean) =>
    `flex min-h-12 w-full items-center gap-2.5 rounded-2xl border-2 border-b-4 px-3.5 py-2 text-left text-base font-extrabold transition active:scale-[0.98] disabled:active:scale-100 ${inLine ? "border-[#1fd6ea] bg-cyan-50" : "border-zinc-200 bg-white hover:border-zinc-400"}`;

  return (
    <div className="rounded-[28px] bg-white p-5 text-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.25)] sm:p-6">
      {note && <h2 className="mb-2 text-sm font-extrabold text-zinc-500">🌐 {note}</h2>}
      <p className="mb-3 text-[22px] font-extrabold leading-snug"><MathText text={text} /></p>
      {!solved && <p className="mb-2.5 text-xs font-semibold text-zinc-500">{hint}</p>}
      <div className={`min-h-16 rounded-2xl border-2 p-2.5 ${box} ${sentence ? "flex flex-wrap items-center gap-2" : "flex flex-col gap-2"}`} aria-live="polite">
        {picked.length === 0 && <span className="px-1 text-sm font-bold text-zinc-400">{empty}</span>}
        {picked.map((ti, pos) => (
          <button key={`${ti}-${pos}`} type="button" disabled={solved} onClick={() => onPick(picked.filter((_, i) => i !== pos))} className={sentence ? wordTile(true) : orderTile(true)}>
            {!sentence && <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-zinc-900 text-sm font-black text-white">{pos + 1}</span>}
            <MathText text={tiles[ti]} />
          </button>
        ))}
      </div>
      {!solved && (
        <>
          <div className={`mt-3 ${sentence ? "flex flex-wrap justify-center gap-2" : "flex flex-col gap-2"}`}>
            {tiles.map((w, ti) =>
              picked.includes(ti) ? (
                sentence ? <span key={ti} className={`${wordTile(false)} invisible`} aria-hidden="true">{w}</span> : null
              ) : (
                <button key={ti} type="button" onClick={() => onPick([...picked, ti])} className={sentence ? wordTile(false) : orderTile(false)}>
                  <MathText text={w} />
                </button>
              )
            )}
          </div>
          {retry && <p className="mt-3 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 px-4 py-3 text-[15px] font-black text-orange-900">{de ? "Nicht ganz – der richtige Anfang bleibt stehen, versuch's nochmal!" : "Not quite – the right start stays, try again!"}</p>}
          <button type="button" disabled={picked.length !== tiles.length} onClick={onSubmit} className="mt-3 w-full rounded-[20px] bg-zinc-900 px-5 py-4 text-[17px] font-extrabold text-white transition active:scale-[0.98] disabled:bg-zinc-200 disabled:text-zinc-500">
            {retry ? (de ? "Nochmal prüfen" : "Check again") : de ? "Prüfen" : "Check"}
          </button>
        </>
      )}
    </div>
  );
}
