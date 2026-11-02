"use client";

import { useMemo, useState } from "react";
import type { Task, WorksheetData } from "@/types/generation";
import { useLanguage } from "@/lib/i18n/language-context";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function TaskInput({
  task,
  revealed,
  value,
  onChange,
}: {
  task: Task;
  revealed: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  const rightOptions = useMemo(() => shuffle(task.pairs?.map((p) => p.right) ?? []), [task.pairs]);

  if (task.type === "multiple-choice" || task.type === "unterstreichen") {
    const options = task.options ?? [];
    return (
      <div className="flex flex-col gap-2">
        {options.map((option, i) => {
          const selected = value === String(i);
          const isCorrectOption = revealed && option.trim() === task.answer.trim();
          let stateClass = "border-zinc-700 hover:border-brand-400";
          if (selected && !revealed) stateClass = "border-brand-400 bg-brand-400/10";
          if (revealed) {
            if (isCorrectOption) stateClass = "border-green-400 bg-green-400/10";
            else if (selected) stateClass = "border-orange-400 bg-orange-400/10";
            else stateClass = "border-zinc-800 text-zinc-600";
          }
          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              onClick={() => onChange(String(i))}
              className={`rounded-lg border px-4 py-2 text-left text-sm transition ${stateClass}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    );
  }

  if (task.type === "zuordnen" && task.pairs) {
    const answers: Record<number, string> = value ? JSON.parse(value) : {};
    return (
      <div className="flex flex-col gap-2">
        {task.pairs.map((pair, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-[10rem]">{pair.left}</span>
            <select
              disabled={revealed}
              value={answers[i] ?? ""}
              onChange={(e) => onChange(JSON.stringify({ ...answers, [i]: e.target.value }))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-70"
            >
              <option value="">{t.practice.chooseOption}</option>
              {rightOptions.map((option, j) => (
                <option key={j} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {revealed && (
              <span
                className={answers[i] === pair.right ? "text-green-400" : "text-orange-400"}
              >
                {answers[i] === pair.right ? "✓" : `→ ${pair.right}`}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // "offen" und "lueckentext"
  return (
    <input
      type="text"
      disabled={revealed}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t.practice.yourAnswerPlaceholder}
      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 disabled:opacity-70"
    />
  );
}

export function InteractiveWorksheet({ data }: { data: WorksheetData }) {
  const { t } = useLanguage();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState(false);
  const labels = data.labels;

  return (
    <div className="rounded-lg bg-white p-4 text-left text-zinc-900 sm:p-6">
      <h3 className="mb-1 text-lg font-semibold">{data.title}</h3>
      <p className="mb-6 text-sm text-zinc-600">{data.introduction}</p>

      <div className="flex flex-col gap-6">
        {data.tasks.map((task) => (
          <div key={task.number} className="border-b border-zinc-200 pb-5 last:border-none">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
              <span className="font-semibold text-zinc-700">
                {labels.task} {task.number}
              </span>
              <span>
                {task.points} {labels.points}
              </span>
            </div>
            <p className="mb-3 text-sm font-medium">{task.question}</p>
            <TaskInput
              task={task}
              revealed={revealed}
              value={answers[task.number] ?? ""}
              onChange={(value) => setAnswers((prev) => ({ ...prev, [task.number]: value }))}
            />
            {revealed && (task.type === "offen" || task.type === "lueckentext") && (
              <p className="mt-2 text-sm text-green-600">
                {t.practice.correctAnswerLabel} {task.answer}
              </p>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="mt-4 rounded-full bg-brand-500 px-6 py-3 font-medium text-black hover:bg-brand-400"
      >
        {revealed ? t.practice.hideAnswers : t.practice.checkAnswers}
      </button>
    </div>
  );
}
