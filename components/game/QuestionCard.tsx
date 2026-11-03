"use client";

import { MathText } from "@/components/ui/MathText";
import type { Question } from "@/types/generation";

export function QuestionCard({
  question,
  selected,
  onSelect,
}: {
  question: Question;
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  // QuestionCard is only ever rendered for "multiple-choice" questions (LevelPlayer branches on
  // question.type), where "options"/"correctIndex" are guaranteed by the schema's own refine -
  // the optional typing here only reflects the other question type ("lueckentext").
  const options = question.options ?? [];
  const correctIndex = question.correctIndex ?? -1;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="mb-4 font-medium"><MathText text={question.prompt} /></p>
      <div className="flex flex-col gap-2">
        {options.map((option, i) => {
          const isSelected = selected === i;
          const isCorrect = i === correctIndex;
          let stateClass = "border-zinc-700 hover:border-brand-400";
          if (selected !== null) {
            if (isCorrect) stateClass = "border-green-400 bg-green-400/10";
            else if (isSelected) stateClass = "border-orange-400 bg-orange-400/10";
            else stateClass = "border-zinc-800 text-zinc-600";
          }
          return (
            <button
              key={i}
              type="button"
              disabled={selected !== null}
              onClick={() => onSelect(i)}
              className={`rounded-lg border px-4 py-2 text-left text-sm transition ${stateClass}`}
            >
              <MathText text={option} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
