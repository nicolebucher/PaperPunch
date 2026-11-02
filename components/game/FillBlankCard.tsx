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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
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
                ? "border-green-400 text-green-300"
                : "border-orange-400 text-orange-300"
              : "border-brand-400"
          }`}
        />
        <span>{after}</span>
      </p>
      {!checked && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={value.trim() === ""}
          className="mt-4 rounded-full bg-brand-400 px-5 py-2 text-sm font-medium text-black hover:bg-brand-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {t.game.check}
        </button>
      )}
    </div>
  );
}
