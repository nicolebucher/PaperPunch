"use client";

import { splitBlank } from "@/lib/split-blank";
import { useLanguage } from "@/lib/i18n/language-context";

export function FillBlankCard({
  prompt,
  value,
  checked,
  isCorrect,
  onChange,
  onSubmit,
}: {
  prompt: string;
  value: string;
  checked: boolean;
  isCorrect: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const { t } = useLanguage();
  const [before, after] = splitBlank(prompt);

  return (
    <div className="rounded-[28px] bg-white p-5 text-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.25)] sm:p-6">
      <p className="flex flex-wrap items-center gap-2 text-xl font-bold leading-relaxed">
        <span>{before}</span>
        <input
          type="text"
          value={value}
          disabled={checked}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          placeholder={t.game.typeAnswerPlaceholder}
          autoFocus
          className={`min-w-[8rem] rounded-md border-b-2 bg-transparent px-1 py-0.5 text-center outline-none ${
            checked
              ? isCorrect
                ? "border-[#1fd6ea] text-[#0e6f7b]"
                : "border-amber-500 text-amber-700"
              : "border-[#1fd6ea]"
          }`}
        />
        <span>{after}</span>
      </p>
      {!checked && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={value.trim() === ""}
          className="mt-5 w-full rounded-[18px] bg-zinc-900 px-5 py-3.5 text-base font-extrabold text-white disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
        >
          {t.game.check}
        </button>
      )}
    </div>
  );
}
