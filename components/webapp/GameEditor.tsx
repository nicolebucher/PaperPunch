"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { GameData, Question } from "@/types/generation";
import { track } from "@/lib/analytics";
import { getMaterial, newId, saveMaterial, type WebMaterial } from "@/lib/webapp/store";
import { AppIcon, useAppText } from "./ui";

/**
 * Lernspiel anpassen (für Lehrkräfte vor dem Teilen in einer Lerngruppe): Fragen nach Level ansehen,
 * einzelne Fragen von der KI ersetzen lassen oder löschen, ein ganzes Level zu einem neuen Unterthema
 * neu erstellen. Bearbeitet wird eine Kopie ("… (bearbeitet)"), das Original bleibt erhalten.
 */

type Tab = number | "boss";
type Diff = "easier" | "same" | "harder";
type NewLevel = { title: string; difficulty: "leicht" | "mittel" | "schwer"; questions: Question[] };
type Dialog =
  | { kind: "q"; tab: Tab; index: number; wishes: string[]; note: string; busy: boolean; error: boolean; result?: Question }
  | { kind: "level"; tab: Tab; subtopic: string; diff: Diff; count: number; busy: boolean; error: boolean; result?: NewLevel };

const MIN_LEVEL = 3;
const MIN_BOSS = 4;

function questionsOf(game: GameData, tab: Tab): Question[] {
  return tab === "boss" ? ((game.boss ?? []) as Question[]) : game.levels[tab]?.questions ?? [];
}

function withQuestions(game: GameData, tab: Tab, questions: Question[]): GameData {
  if (tab === "boss") return { ...game, boss: questions };
  return { ...game, levels: game.levels.map((l, i) => (i === tab ? { ...l, questions } : l)) };
}

function answerOf(q: Question): { right: string; others: string[] } {
  if (q.type === "zuordnen") return { right: (q.pairs ?? []).map((p) => `${p.left} = ${p.right}`).join(" · "), others: [] };
  if (q.type === "multiple-choice") {
    const opts = q.options ?? [];
    return { right: opts[q.correctIndex ?? 0] ?? "", others: opts.filter((_, i) => i !== q.correctIndex) };
  }
  return { right: q.correctAnswer ?? "", others: q.acceptedAnswers ?? [] };
}

async function callEdit(body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch("/api/edit-game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as Record<string, unknown>;
}

const chip = (on: boolean) => `h-10 rounded-full px-4 text-sm font-bold ${on ? "bg-zinc-100 text-zinc-950" : "bg-[#22252b] text-zinc-100"}`;
const seg = (on: boolean) => `h-10 flex-1 rounded-xl text-sm font-bold ${on ? "bg-zinc-100 text-zinc-950" : "bg-[#22252b] text-zinc-100"}`;
const label = "text-xs font-extrabold uppercase tracking-wide text-zinc-500";

export function GameEditor({ id, next }: { id: string; next?: string }) {
  const tx = useAppText();
  const router = useRouter();
  const [mat, setMat] = useState<WebMaterial | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>(0);
  const [marked, setMarked] = useState<Record<string, true>>({});
  const [undo, setUndo] = useState<{ tab: Tab; index: number; q: Question } | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMat(getMaterial(id) ?? null);
    track("edit_open", { next: next ?? "" });
  }, [id, next]);

  if (mat === undefined) return null;
  if (!mat) return <p className="mx-auto max-w-md pt-10 text-center font-semibold text-zinc-400">{tx.editNotFound}</p>;
  if (!mat.game) return <p className="mx-auto max-w-md pt-10 text-center font-semibold text-zinc-400">{tx.editNoGame}</p>;
  const game = mat.game;
  const material = mat;

  const tabs: { key: Tab; label: string }[] = [
    ...game.levels.map((_, i) => ({ key: i as Tab, label: tx.editLevelLabel(i + 1) })),
    ...((game.boss?.length ?? 0) > 0 ? [{ key: "boss" as Tab, label: tx.editBoss }] : []),
  ];
  const current = tabs.some((t) => t.key === tab) ? tab : 0;
  const questions = questionsOf(game, current);
  const level = current === "boss" ? null : game.levels[current];
  const levelTitle = level ? level.title : tx.editBoss;
  const tabLabel = tabs.find((t) => t.key === current)?.label ?? "";
  const min = current === "boss" ? MIN_BOSS : MIN_LEVEL;
  const doneHref = next === "group" ? `/app/groups/new?game=${material.id}` : `/app/materials?id=${material.id}`;

  /** Änderung speichern – beim ersten Mal als Kopie, das Original bleibt unverändert. */
  function commit(nextGame: GameData) {
    if (material.editedFrom) {
      const updated = { ...material, game: nextGame };
      saveMaterial(updated);
      setMat(updated);
      return;
    }
    const copy: WebMaterial = { ...material, id: newId(), createdAt: Date.now(), title: material.title + tx.editSuffix, game: nextGame, editedFrom: material.id, rating: undefined };
    saveMaterial(copy);
    setMat(copy);
    router.replace(`/app/edit?id=${copy.id}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  function remove(index: number) {
    if (questions.length <= min) return;
    const q = questions[index];
    commit(withQuestions(game, current, questions.filter((_, i) => i !== index)));
    setUndo({ tab: current, index, q });
    track("edit_question_deleted");
  }

  function restore() {
    if (!undo) return;
    const list = [...questionsOf(game, undo.tab)];
    list.splice(undo.index, 0, undo.q);
    commit(withQuestions(game, undo.tab, list));
    setUndo(null);
  }

  async function runQuestion(d: Extract<Dialog, { kind: "q" }>) {
    setDialog({ ...d, busy: true, error: false, result: undefined });
    try {
      const lv = questionsOf(game, d.tab);
      const out = await callEdit({
        mode: "question",
        subject: game.subject,
        gameTitle: game.gameTitle,
        level: { title: d.tab === "boss" ? tx.editBoss : game.levels[d.tab].title, difficulty: d.tab === "boss" ? "schwer" : game.levels[d.tab].difficulty, questions: lv },
        question: lv[d.index],
        wishes: d.wishes,
        note: d.note.trim(),
      });
      setDialog({ ...d, busy: false, error: false, result: out.question as Question });
    } catch {
      setDialog({ ...d, busy: false, error: true });
    }
  }

  async function runLevel(d: Extract<Dialog, { kind: "level" }>) {
    setDialog({ ...d, busy: true, error: false, result: undefined });
    try {
      const out = await callEdit({
        mode: "level",
        subject: game.subject,
        gameTitle: game.gameTitle,
        level: { title: levelTitleOf(d.tab), difficulty: d.tab === "boss" ? "schwer" : game.levels[d.tab].difficulty, questions: questionsOf(game, d.tab) },
        otherLevels: game.levels.filter((_, i) => i !== d.tab).map((l) => ({ title: l.title, difficulty: l.difficulty, questions: l.questions.slice(0, 8) })),
        subtopic: d.subtopic.trim(),
        difficulty: d.diff,
        count: d.count,
      });
      setDialog({ ...d, busy: false, error: false, result: out.level as NewLevel });
    } catch {
      setDialog({ ...d, busy: false, error: true });
    }
  }

  function levelTitleOf(t: Tab) {
    return t === "boss" ? tx.editBoss : game.levels[t].title;
  }

  function applyQuestion(d: Extract<Dialog, { kind: "q" }>) {
    if (!d.result) return;
    const list = questionsOf(game, d.tab).map((q, i) => (i === d.index ? d.result! : q));
    commit(withQuestions(game, d.tab, list));
    setMarked((m) => ({ ...m, [`${d.tab}:${d.index}`]: true }));
    setDialog(null);
    setUndo(null);
    track("edit_question_replaced", { wishes: d.wishes.length, note: !!d.note.trim() });
  }

  function applyLevel(d: Extract<Dialog, { kind: "level" }>) {
    if (!d.result) return;
    const nl = d.result;
    const nextGame =
      d.tab === "boss"
        ? { ...game, boss: nl.questions }
        : { ...game, levels: game.levels.map((l, i) => (i === d.tab ? { ...l, title: nl.title, difficulty: nl.difficulty, questions: nl.questions } : l)) };
    commit(nextGame);
    const marks: Record<string, true> = {};
    nl.questions.forEach((_, i) => (marks[`${d.tab}:${i}`] = true));
    setMarked((m) => ({ ...Object.fromEntries(Object.entries(m).filter(([k]) => !k.startsWith(`${d.tab}:`))), ...marks }));
    setDialog(null);
    setUndo(null);
    track("edit_level_replaced", { diff: d.diff, count: d.count });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 pb-28">
      <div className="mt-2 flex items-center gap-3 lg:mt-0">
        <Link href={doneHref} aria-label={tx.back} className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[#15171b] ring-1 ring-white/[0.06]"><AppIcon name="back" /></Link>
        <div className="flex min-w-0 flex-col">
          <h1 className="text-xl font-extrabold tracking-tight lg:text-2xl">{tx.editTitle}</h1>
          <span className="truncate text-[13px] font-semibold text-zinc-400">{material.title} · {game.levels.reduce((s, l) => s + l.questions.length, 0) + (game.boss?.length ?? 0)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button key={String(t.key)} type="button" onClick={() => setTab(t.key)} className={chip(t.key === current)}>{t.label}</button>
        ))}
        <button
          type="button"
          onClick={() => setDialog({ kind: "level", tab: current, subtopic: levelTitle, diff: "same", count: questions.length >= 9 ? 10 : questions.length >= 7 ? 8 : 6, busy: false, error: false })}
          className="ml-auto h-10 rounded-full px-4 text-sm font-extrabold text-[#1fd6ea] ring-1 ring-[#1fd6ea]"
        >
          ↻ {tx.editReplaceLevel(tabLabel)}
        </button>
      </div>

      <div className="flex items-baseline gap-2 px-1">
        <b className="text-lg">{levelTitle}</b>
        <span className="text-[13px] font-semibold text-zinc-500">{questions.length}</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {questions.map((q, i) => {
          const a = answerOf(q);
          const isMarked = marked[`${current}:${i}`];
          return (
            <div key={`${current}-${i}-${q.prompt.slice(0, 20)}`} className={`flex flex-wrap items-center gap-3 rounded-[18px] p-3.5 ${isMarked ? "bg-[#1a1219] ring-1 ring-[#f23a8e]" : "bg-[#15171b] ring-1 ring-white/[0.06]"}`}>
              <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-[#22252b] text-[13px] font-extrabold text-zinc-400">{i + 1}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-1" style={{ flexBasis: 260 }}>
                <span className="flex flex-wrap items-center gap-2">
                  <b className="text-[15px] leading-snug">{q.prompt}</b>
                  {isMarked && <span className="rounded-md bg-[#3a1328] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-pink-300">{tx.editReplaced}</span>}
                </span>
                <span className="text-[13px] font-semibold text-zinc-400">
                  {q.type === "lueckentext" ? `${tx.editGap} · ` : ""}{tx.editCorrect}: <span className="text-[#a8e43a]">{a.right}</span>
                  {a.others.length > 0 && ` · ${tx.editOthers}: ${a.others.join(", ")}`}
                </span>
              </span>
              <span className="ml-auto flex gap-2">
                <button type="button" onClick={() => setDialog({ kind: "q", tab: current, index: i, wishes: [], note: "", busy: false, error: false })} className="h-10 rounded-xl bg-[#0f2a2e] px-3.5 text-sm font-extrabold text-[#1fd6ea]">↻ {tx.editReplace}</button>
                <button type="button" onClick={() => remove(i)} disabled={questions.length <= min} aria-label={tx.editDelete} title={questions.length <= min ? tx.editMin(min) : tx.editDelete} className="grid h-10 w-10 place-items-center rounded-xl bg-[#22252b] text-zinc-400 disabled:opacity-40"><AppIcon name="trash" size={16} /></button>
              </span>
            </div>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#1d2026] bg-black/95 px-4 py-3 backdrop-blur lg:left-[250px]">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3">
          {undo ? (
            <span className="flex items-center gap-3 rounded-xl bg-zinc-100 px-3.5 py-2 text-sm font-bold text-zinc-950">
              {tx.editDeleted}
              <button type="button" onClick={restore} className="font-extrabold text-[#0b7f8d]">{tx.editUndo}</button>
            </span>
          ) : (
            <span className="text-[13px] font-semibold text-zinc-500">{material.editedFrom ? tx.editSaved : tx.editCopyNote}</span>
          )}
          <Link href={doneHref} className="ml-auto rounded-2xl bg-[#1fd6ea] px-5 py-3 font-extrabold text-black">{next === "group" ? tx.editNextGroup : tx.editDone}</Link>
        </div>
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" role="dialog" aria-modal="true">
          <div className="flex max-h-[92dvh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-t-[26px] bg-[#15171b] p-5 ring-1 ring-white/[0.08] sm:rounded-[26px] sm:p-6">
            {dialog.kind === "q" ? (
              <QuestionDialog d={dialog} original={questionsOf(game, dialog.tab)[dialog.index]} onChange={setDialog} onRun={runQuestion} onApply={applyQuestion} onClose={() => setDialog(null)} />
            ) : (
              <LevelDialog d={dialog} label={tabs.find((t) => t.key === dialog.tab)?.label ?? ""} oldTitle={levelTitleOf(dialog.tab)} oldCount={questionsOf(game, dialog.tab).length} onChange={setDialog} onRun={runLevel} onApply={applyLevel} onClose={() => setDialog(null)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionPreview({ q, tone }: { q: Question; tone: "old" | "new" }) {
  const tx = useAppText();
  const a = answerOf(q);
  const opts = q.type === "multiple-choice" ? q.options ?? [] : [a.right, ...a.others];
  return (
    <div className={`flex flex-col gap-2 rounded-2xl p-3.5 ${tone === "new" ? "bg-[#0f2226] ring-2 ring-[#1fd6ea]" : "ring-1 ring-[#2a2e35]"}`}>
      <span className={`text-[11px] font-extrabold uppercase tracking-wide ${tone === "new" ? "text-[#1fd6ea]" : "text-zinc-500"}`}>{tone === "new" ? tx.editAfter : tx.editBefore}</span>
      <b className={`text-[15px] leading-snug ${tone === "old" ? "text-zinc-500 line-through decoration-zinc-600" : ""}`}>{q.prompt}</b>
      {tone === "new" && (
        <span className="flex flex-wrap gap-1.5">
          {opts.map((o, i) => (
            <span key={`${o}-${i}`} className={`rounded-lg px-2.5 py-1 text-[13px] font-bold ring-1 ${o === a.right ? "text-[#a8e43a] ring-[#a8e43a]/60" : "text-zinc-300 ring-zinc-700"}`}>{o === a.right ? `✓ ${o}` : o}</span>
          ))}
        </span>
      )}
    </div>
  );
}

function Busy({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-black/40 p-4 text-sm font-bold text-zinc-300">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1fd6ea] border-t-transparent" aria-hidden="true" />
      {text}
    </div>
  );
}

function QuestionDialog({
  d,
  original,
  onChange,
  onRun,
  onApply,
  onClose,
}: {
  d: Extract<Dialog, { kind: "q" }>;
  original: Question;
  onChange: (d: Dialog) => void;
  onRun: (d: Extract<Dialog, { kind: "q" }>) => void;
  onApply: (d: Extract<Dialog, { kind: "q" }>) => void;
  onClose: () => void;
}) {
  const tx = useAppText();
  const toggle = (w: string) => onChange({ ...d, wishes: d.wishes.includes(w) ? d.wishes.filter((x) => x !== w) : [...d.wishes, w].slice(-3) });
  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-extrabold tracking-tight">{tx.editQTitle(d.index + 1)}</h2>
        {!d.result && <p className="text-sm font-semibold text-zinc-400">{original.prompt}</p>}
      </div>
      {d.result ? (
        <>
          <QuestionPreview q={original} tone="old" />
          <QuestionPreview q={d.result} tone="new" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-[#22252b] px-4 font-extrabold">{tx.editDiscard}</button>
            <button type="button" onClick={() => onRun(d)} className="h-12 rounded-2xl bg-[#22252b] px-4 font-extrabold">{tx.editAgain}</button>
            <button type="button" onClick={() => onApply(d)} className="ml-auto h-12 rounded-2xl bg-[#1fd6ea] px-5 font-extrabold text-black">{tx.editApply}</button>
          </div>
        </>
      ) : (
        <>
          <span className={label}>{tx.editWhat}</span>
          <div className="flex flex-wrap gap-2">
            {tx.editWishes.map((w) => (
              <button key={w} type="button" aria-pressed={d.wishes.includes(w)} onClick={() => toggle(w)} className={chip(d.wishes.includes(w))}>{w}</button>
            ))}
          </div>
          <label className={`flex flex-col gap-2 ${label}`}>
            {tx.editOwnWish}
            <textarea rows={2} maxLength={300} value={d.note} placeholder={tx.editOwnPh} onChange={(e) => onChange({ ...d, note: e.target.value })} className="resize-none rounded-xl border border-zinc-700 bg-black p-3 text-[15px] font-semibold normal-case tracking-normal text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#1fd6ea]" />
          </label>
          {d.busy && <Busy text={tx.editWorking} />}
          {d.error && <p className="text-sm font-bold text-orange-400">{tx.editError}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-[#22252b] px-4 font-extrabold">{tx.editCancel}</button>
            <button type="button" disabled={d.busy} onClick={() => onRun(d)} className="ml-auto h-12 rounded-2xl bg-[#1fd6ea] px-5 font-extrabold text-black disabled:opacity-50">{tx.editCreate}</button>
          </div>
        </>
      )}
      <span className="text-center text-xs font-semibold text-zinc-500">{tx.editFree}</span>
    </>
  );
}

function LevelDialog({
  d,
  label: tabLabel,
  oldTitle,
  oldCount,
  onChange,
  onRun,
  onApply,
  onClose,
}: {
  d: Extract<Dialog, { kind: "level" }>;
  label: string;
  oldTitle: string;
  oldCount: number;
  onChange: (d: Dialog) => void;
  onRun: (d: Extract<Dialog, { kind: "level" }>) => void;
  onApply: (d: Extract<Dialog, { kind: "level" }>) => void;
  onClose: () => void;
}) {
  const tx = useAppText();
  if (d.result) {
    return (
      <>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h2 className="text-xl font-extrabold tracking-tight">{tx.editLevelNew(d.result.title)}</h2>
          <span className="text-[13px] font-bold text-zinc-500">{tx.editLevelInstead(oldTitle)}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {d.result.questions.map((q, i) => {
            const a = answerOf(q);
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-[#0f2226] px-3 py-2.5 ring-1 ring-[#1d4a52]">
                <span className="w-5 text-[13px] font-extrabold text-zinc-500">{i + 1}</span>
                <span className="min-w-0 flex-1 text-[14px] font-bold leading-snug">{q.prompt}</span>
                <span className="max-w-[35%] text-right text-[13px] font-bold text-[#a8e43a]">{a.right}</span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-[#22252b] px-4 font-extrabold">{tx.editDiscard}</button>
          <button type="button" onClick={() => onRun(d)} className="h-12 rounded-2xl bg-[#22252b] px-4 font-extrabold">{tx.editLevelAgain}</button>
          <button type="button" onClick={() => onApply(d)} className="ml-auto h-12 rounded-2xl bg-[#1fd6ea] px-5 font-extrabold text-black">{tx.editLevelApply}</button>
        </div>
        <span className="text-center text-xs font-semibold text-zinc-500">{tx.editFree}</span>
      </>
    );
  }
  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-extrabold tracking-tight">{tx.editReplaceLevel(tabLabel)}</h2>
        <p className="text-sm font-semibold text-zinc-400">{tx.editLevelSub(oldTitle, oldCount)}</p>
      </div>
      <label className={`flex flex-col gap-2 ${label}`}>
        {tx.editSubtopic}
        <input value={d.subtopic} maxLength={120} placeholder={tx.editSubtopicPh} onChange={(e) => onChange({ ...d, subtopic: e.target.value })} className="h-12 rounded-xl border-2 border-[#1fd6ea] bg-black px-3.5 text-base font-bold normal-case tracking-normal text-zinc-100 outline-none" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className={label}>{tx.editDifficulty}</span>
          <div className="flex gap-1.5">
            {(["easier", "same", "harder"] as Diff[]).map((k) => (
              <button key={k} type="button" aria-pressed={d.diff === k} onClick={() => onChange({ ...d, diff: k })} className={seg(d.diff === k)}>{tx.editDiff[k]}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className={label}>{tx.editCount}</span>
          <div className="flex gap-1.5">
            {[6, 8, 10].map((n) => (
              <button key={n} type="button" aria-pressed={d.count === n} onClick={() => onChange({ ...d, count: n })} className={seg(d.count === n)}>{n}</button>
            ))}
          </div>
        </div>
      </div>
      {d.busy && <Busy text={tx.editWorkingLevel} />}
      {d.error && <p className="text-sm font-bold text-orange-400">{tx.editError}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-[#22252b] px-4 font-extrabold">{tx.editCancel}</button>
        <button type="button" disabled={d.busy || d.subtopic.trim().length < 2} onClick={() => onRun(d)} className="ml-auto h-12 rounded-2xl bg-[#1fd6ea] px-5 font-extrabold text-black disabled:opacity-50">{tx.editLevelCreate}</button>
      </div>
      <span className="text-center text-xs font-semibold text-zinc-500">{tx.editFree}</span>
    </>
  );
}
