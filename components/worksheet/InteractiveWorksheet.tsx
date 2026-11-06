"use client";

import { track } from "@/lib/analytics";
import { useMemo, useState } from "react";
import type { Task, WorksheetData } from "@/types/generation";
import { useLanguage } from "@/lib/i18n/language-context";
import { addPunches, SHEET_ANSWER_PUNCHES } from "@/lib/webapp/punches";
import { ReportProblem } from "@/components/ReportProblem";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const AWARDED_KEY = "paperpunch-web-sheets-awarded";
const sheetKey = (d: WorksheetData) => `${d.title}|${d.tasks[0]?.question ?? ""}`.slice(0, 200);
function alreadyAwarded(d: WorksheetData): boolean {
  try {
    return (JSON.parse(localStorage.getItem(AWARDED_KEY) ?? "[]") as string[]).includes(sheetKey(d));
  } catch {
    return false;
  }
}
function markAwarded(d: WorksheetData) {
  try {
    const list = JSON.parse(localStorage.getItem(AWARDED_KEY) ?? "[]") as string[];
    localStorage.setItem(AWARDED_KEY, JSON.stringify([...list, sheetKey(d)].slice(-200)));
  } catch {
    // ohne Speicher egal
  }
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Automatisch prüfbare Aufgaben, die richtig gelöst sind (offene Aufgaben zählen nicht). */
function isTaskCorrect(task: Task, value: string): boolean {
  if (!value) return false;
  if (task.type === "multiple-choice" || task.type === "unterstreichen") {
    const option = task.options?.[Number(value)];
    return option !== undefined && option.trim() === task.answer.trim();
  }
  if (task.type === "zuordnen" && task.pairs) {
    try {
      const answers = JSON.parse(value) as Record<number, string>;
      return task.pairs.every((p, i) => answers[i] === p.right);
    } catch {
      return false;
    }
  }
  if (task.type === "lueckentext") return norm(value) === norm(task.answer);
  return false;
}

/** Farben für verbundene Paare (wie in der App). */
const MATCH_COLORS = ["#1FD6EA", "#F23A8E", "#A8E43A", "#F59E0B", "#8B5CF6", "#14B8A6", "#EF4444", "#3B82F6"];

/** Zuordnen durch Antippen: links tippen, dann rechts (oder umgekehrt) – das Paar bekommt eine Farbe; nochmal tippen löst es. */
function MatchBoard({ lefts, rights, answers, onChange }: { lefts: string[]; rights: string[]; answers: Record<number, string>; onChange: (a: Record<number, string>) => void }) {
  const { locale } = useLanguage();
  const [selLeft, setSelLeft] = useState<number | null>(null);
  const [selRight, setSelRight] = useState<number | null>(null);
  const ownerOf = (r: number) => Object.keys(answers).map(Number).find((l) => answers[l] === rights[r]);
  function connect(l: number, r: number) {
    const next: Record<number, string> = {};
    for (const k of Object.keys(answers).map(Number)) if (k !== l && answers[k] !== rights[r]) next[k] = answers[k];
    next[l] = rights[r];
    onChange(next);
    setSelLeft(null);
    setSelRight(null);
  }
  function tapLeft(l: number) {
    if (selRight !== null) return connect(l, selRight);
    if (answers[l] !== undefined) {
      const next = { ...answers };
      delete next[l];
      onChange(next);
      setSelLeft(l);
      return;
    }
    setSelLeft((s) => (s === l ? null : l));
  }
  function tapRight(r: number) {
    if (selLeft !== null) return connect(selLeft, r);
    const owner = ownerOf(r);
    if (owner !== undefined) {
      const next = { ...answers };
      delete next[owner];
      onChange(next);
      setSelRight(r);
      return;
    }
    setSelRight((s) => (s === r ? null : r));
  }
  const item = (sel: boolean, color: string | undefined) =>
    `min-h-12 w-full rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold leading-snug text-zinc-900 transition active:scale-[0.98] ${sel ? "ring-4 ring-zinc-900/10" : ""} ${color ? "" : sel ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-zinc-50 hover:border-zinc-400"}`;
  const style = (color: string | undefined) => (color ? { borderColor: color, background: `color-mix(in srgb, ${color} 16%, #ffffff)` } : undefined);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-zinc-500">
        {locale === "de" ? "Tippe links, dann rechts – so verbindest du ein Paar. Nochmal tippen löst es." : "Tap left, then right to connect a pair. Tap again to undo."}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          {lefts.map((l, i) => {
            const color = answers[i] !== undefined ? MATCH_COLORS[i % MATCH_COLORS.length] : undefined;
            return (
              <button key={i} type="button" aria-pressed={selLeft === i} onClick={() => tapLeft(i)} className={item(selLeft === i, color)} style={style(color)}>
                {l}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2">
          {rights.map((r, j) => {
            const owner = ownerOf(j);
            const color = owner !== undefined ? MATCH_COLORS[owner % MATCH_COLORS.length] : undefined;
            return (
              <button key={j} type="button" aria-pressed={selRight === j} onClick={() => tapRight(j)} className={item(selRight === j, color)} style={style(color)}>
                {r}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
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
    if (revealed) {
      return (
        <div className="flex flex-col gap-2">
          {task.pairs.map((pair, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-[10rem]">{pair.left}</span>
              <span className="text-zinc-500">→</span>
              <span>{answers[i] ?? "–"}</span>
              <span className={answers[i] === pair.right ? "text-green-400" : "text-orange-400"}>
                {answers[i] === pair.right ? "✓" : `→ ${pair.right}`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return <MatchBoard lefts={task.pairs.map((p) => p.left)} rights={rightOptions} answers={answers} onChange={(a) => onChange(JSON.stringify(a))} />;
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
  // Punches gibt es einmal pro Blatt, beim ersten Prüfen – Nachbessern nach dem Aufdecken zählt nicht.
  const [earned, setEarned] = useState<number | null>(null);
  const labels = data.labels;

  function toggleReveal() {
    if (!revealed && earned === null) {
      const correct = data.tasks.filter((task) => isTaskCorrect(task, answers[task.number] ?? "")).length;
      // Pro Blatt nur einmal – auch nach Neuladen der Seite (Merker im Browser).
      const amount = alreadyAwarded(data) ? 0 : correct * SHEET_ANSWER_PUNCHES;
      track("answers_checked", { correct, total: data.tasks.length, answered: Object.keys(answers).length });
      if (amount > 0) {
        addPunches(amount);
        markAwarded(data);
      }
      setEarned(amount);
    }
    setRevealed((r) => !r);
  }

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
            {revealed && (
              <ReportProblem
                tone="light"
                context={{ source: "web-sheet", title: data.title, question: task.question, expected: task.answer, options: task.options, given: answers[task.number] || undefined }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleReveal}
          className="rounded-full bg-brand-500 px-6 py-3 font-medium text-black hover:bg-brand-400"
        >
          {revealed ? t.practice.hideAnswers : t.practice.checkAnswers}
        </button>
        {revealed && earned !== null && earned > 0 && (
          <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-bold text-[#1fd6ea]">+{earned} Punches</span>
        )}
      </div>
    </div>
  );
}
