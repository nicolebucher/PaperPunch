"use client";

import { FOREIGN_LANGUAGES, type ForeignLanguage } from "@/lib/answer-match";

// Fremdsprache + Lernjahr beim Erstellen (Klasse ≠ Sprachniveau). Gleiches Prinzip wie in der App (Capture).

export function LangYearPicker({
  locale,
  lang,
  year,
  onLang,
  onYear,
}: {
  locale: string;
  lang: ForeignLanguage | null;
  year: number;
  onLang: (l: ForeignLanguage | null) => void;
  onYear: (y: number) => void;
}) {
  const de = locale === "de";
  const chip = (on: boolean) => `h-10 rounded-full px-3.5 text-sm font-bold ${on ? "bg-zinc-100 text-zinc-950" : "bg-[#22252b] text-zinc-100"}`;
  const langs = FOREIGN_LANGUAGES.filter((l) => !(l.key === "en" && locale === "en"));
  return (
    <div className="flex flex-col gap-2 rounded-[20px] bg-[#15171b] p-4 ring-1 ring-white/[0.06]">
      <span className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">{de ? "Fremdsprache?" : "Foreign language?"}</span>
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={!lang} onClick={() => onLang(null)} className={chip(!lang)}>{de ? "Nein" : "No"}</button>
        {langs.map((l) => (
          <button key={l.key} type="button" aria-pressed={lang === l.key} onClick={() => onLang(l.key)} className={chip(lang === l.key)}>{de ? l.de : l.en}</button>
        ))}
      </div>
      {lang && (
        <>
          <span className="mt-1 text-xs font-extrabold uppercase tracking-wide text-zinc-500">{de ? "Lernjahr" : "Year of learning"}</span>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((y) => (
              <button key={y} type="button" aria-pressed={year === y} onClick={() => onYear(y)} className={`${chip(year === y)} min-w-11`}>{y === 5 ? "5+" : y}</button>
            ))}
          </div>
          <span className="text-xs font-semibold text-zinc-500">{de ? "Wie lange lernst du die Sprache schon? 1 = erstes Jahr. Danach richten sich Wörter und Grammatik." : "How long have you been learning it? 1 = first year. Words and grammar are pitched to this."}</span>
        </>
      )}
    </div>
  );
}
