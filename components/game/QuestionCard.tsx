"use client";

import { MathText } from "@/components/ui/MathText";
import type { Question } from "@/types/generation";

export function QuestionCard({
  question,
  selected,
  onSelect,
  hidden = [],
}: {
  question: Question;
  selected: number | null;
  onSelect: (index: number) => void;
  /** Vom Joker 50:50 entfernte Antworten. */
  hidden?: number[];
}) {
  // QuestionCard is only ever rendered for "multiple-choice" questions (LevelPlayer branches on
  // question.type), where "options"/"correctIndex" are guaranteed by the schema's own refine -
  // the optional typing here only reflects the other question type ("lueckentext").
  const options = question.options ?? [];
  const correctIndex = question.correctIndex ?? -1;

  return (
    <div className="rounded-[28px] bg-white p-5 text-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.25)] sm:p-6">
      <p className="mb-5 text-[22px] font-extrabold leading-snug"><MathText text={question.prompt} /></p>
      <div className="flex flex-col gap-2.5">
        {options.map((option, i) => {
          const isSelected = selected === i;
          const isCorrect = i === correctIndex;
          const gone = hidden.includes(i) && selected === null;
          let stateClass = "border-zinc-200 bg-slate-50 hover:border-[#1fd6ea]";
          if (selected !== null) {
            if (isCorrect) stateClass = "border-[#1fd6ea] bg-[#cff7fb]";
            else if (isSelected) stateClass = "border-amber-400 bg-orange-100";
            else stateClass = "border-zinc-200 bg-slate-50 text-zinc-400";
          }
          return (
            <button
              key={i}
              type="button"
              disabled={selected !== null || gone}
              aria-hidden={gone || undefined}
              onClick={() => onSelect(i)}
              className={`min-h-[58px] rounded-[18px] border-2 px-4 py-3 text-center text-lg font-extrabold transition active:scale-[0.98] ${gone ? "invisible" : stateClass}`}
            >
              <MathText text={option} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
