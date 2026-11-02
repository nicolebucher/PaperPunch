"use client";

import { useEffect, useRef, useState } from "react";
import type { SpellingDiagnostic, SpellingItem } from "@/types/generation";
import { useLanguage } from "@/lib/i18n/language-context";
import { splitBlank } from "@/lib/split-blank";

export function SpellingDiagnosticPlayer({
  diagnostic,
  onComplete,
}: {
  diagnostic: SpellingDiagnostic;
  onComplete: (missed: SpellingItem[], correctCount: number) => void;
}) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [missed, setMissed] = useState<SpellingItem[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  // Same guard pattern as the game's LevelPlayer: a tap that changes the layout (revealing
  // feedback, or advancing to the next item) can produce a second, slightly delayed click/touch
  // event that lands on whatever the new layout shows next - so the check/next actions stay
  // locked for a short cooldown after every item change, not just within one synchronous tick.
  const checkedRef = useRef(false);
  const advancingRef = useRef(false);
  const readyAtRef = useRef(0);

  const item = diagnostic.items[index];
  const isLast = index === diagnostic.items.length - 1;
  const isCorrect = checked && value.trim() === item.correctSpelling;
  const [before, after] = splitBlank(item.sentence);

  useEffect(() => {
    readyAtRef.current = Date.now() + 400;
  }, [index]);

  function handleCheck() {
    if (checkedRef.current || Date.now() < readyAtRef.current || value.trim() === "") return;
    checkedRef.current = true;
    setChecked(true);
    if (value.trim() === item.correctSpelling) {
      setCorrectCount((c) => c + 1);
    } else {
      setMissed((m) => [...m, item]);
    }
  }

  function handleNext() {
    if (advancingRef.current) return;
    advancingRef.current = true;
    if (isLast) {
      onComplete(missed, correctCount);
    } else {
      setValue("");
      setChecked(false);
      checkedRef.current = false;
      advancingRef.current = false;
      setIndex((i) => i + 1);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{diagnostic.title}</h2>
        <span className="text-sm text-zinc-500">{t.game.questionOf(index + 1, diagnostic.items.length)}</span>
      </div>
      <p className="mb-2 text-sm text-brand-300">
        <span className="font-semibold">{t.spelling.hintLabel}</span> {item.hint}
      </p>
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <p className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
          <span>{before}</span>
          <input
            type="text"
            value={value}
            disabled={checked}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCheck();
            }}
            placeholder={t.spelling.inputPlaceholder}
            autoFocus
            className={`min-w-[8rem] rounded-md border-b-2 bg-transparent px-1 py-0.5 text-center outline-none ${
              checked
                ? isCorrect
                  ? "border-green-400 text-green-300"
                  : "border-orange-400 text-orange-300"
                : "border-brand-400"
            }`}
          />
          <span>{after}</span>
        </p>
      </div>
      {checked && !isCorrect && (
        <div className="mt-4 rounded-lg bg-orange-400/10 p-4 text-sm text-orange-300">
          {t.spelling.correctAnswerWas(item.correctSpelling)}
        </div>
      )}
      <div className="mt-4">
        {!checked ? (
          <button
            type="button"
            onClick={handleCheck}
            disabled={value.trim() === ""}
            className="rounded-full bg-brand-400 px-5 py-2 font-medium text-black hover:bg-brand-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {t.spelling.check}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-full bg-brand-400 px-5 py-2 font-medium text-black hover:bg-brand-300"
          >
            {isLast ? t.spelling.seeResults : t.spelling.next}
          </button>
        )}
      </div>
    </div>
  );
}
