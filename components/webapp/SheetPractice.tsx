"use client";

import { useMemo, useState } from "react";
import type { Task, WorksheetData } from "@/types/generation";
import { useLanguage } from "@/lib/i18n/language-context";
import { answerHint, answerMatches, isSpellingContext, spellingNote, splitLanguageNote } from "@/lib/answer-match";
import { addPunches, SHEET_ANSWER_PUNCHES } from "@/lib/webapp/punches";
import { MathText } from "@/components/ui/MathText";
import { ReportProblem } from "@/components/ReportProblem";
import { track } from "@/lib/analytics";

// Arbeitsblatt/Test online lösen – genau wie in der App (mobile/src/screens/Practice.tsx): eine Aufgabe nach der
// anderen; Auswahl, Lückentext und Zuordnen werden sofort geprüft (Lückentext tolerant + KI-Prüfung über /api/check,
// Rechtschreib-Übungen streng), beim ersten Fehler ein zweiter Versuch, dann die Lösung. Offene Aufgaben: Lösung
// ansehen und selbst einschätzen. Am Ende Ergebnis und Punches (pro Blatt einmal).

const TEXT = {
  de: {
    task: (n: number) => `Aufgabe ${n}`,
    typeAnswer: "Deine Antwort",
    check: "Prüfen",
    checkAgain: "Nochmal prüfen",
    checking: "Prüfe …",
    showSolution: "Lösung zeigen",
    dontKnow: "Weiß ich nicht – Lösung zeigen",
    tryAgain: "Nicht ganz – versuch's nochmal!",
    right: "Richtig!",
    wrong: (a: string) => `Fast! Richtig ist: ${a}`,
    solution: "Lösung",
    selfCheck: "Hattest du es richtig?",
    selfWrong: "Noch nicht",
    selfRight: "Richtig",
    next: "Weiter",
    finish: "Auswertung",
    checkFailed: "Konnte gerade nicht prüfen – tippe nochmal auf Prüfen.",
    matchHint: "Tippe links, dann rechts – so verbindest du ein Paar. Nochmal tippen löst es.",
    score: "richtig",
    doneAll: "Alles richtig!",
    doneGood: "Stark gemacht!",
    doneStart: "Guter Anfang!",
    missed: "Das übst du nochmal:",
    again: "Nochmal üben",
    back: "Zurück zum Material",
    close: "Schließen",
    spelling: (w: string) => `Achte auf die Schreibweise: ${w}`,
    hintBtn: "💡 Tipp",
    hintLabel: "Tipp:",
    hintNote: "Mit Tipp gibt es die Hälfte der Punches.",
  },
  en: {
    task: (n: number) => `Task ${n}`,
    typeAnswer: "Your answer",
    check: "Check",
    checkAgain: "Check again",
    checking: "Checking …",
    showSolution: "Show answer",
    dontKnow: "I don't know – show answer",
    tryAgain: "Not quite – try again!",
    right: "Correct!",
    wrong: (a: string) => `Almost! The answer is: ${a}`,
    solution: "Answer",
    selfCheck: "Did you get it right?",
    selfWrong: "Not yet",
    selfRight: "Got it",
    next: "Next",
    finish: "See results",
    checkFailed: "Couldn't check right now – tap Check again.",
    matchHint: "Tap left, then right to connect a pair. Tap again to undo.",
    score: "correct",
    doneAll: "All correct!",
    doneGood: "Great job!",
    doneStart: "Good start!",
    missed: "Practise these again:",
    again: "Practise again",
    back: "Back to the material",
    close: "Close",
    spelling: (w: string) => `Watch the spelling: ${w}`,
    hintBtn: "💡 Hint",
    hintLabel: "Hint:",
    hintNote: "With a hint you get half the Punches.",
  },
};

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?]$/, "");
const isChoice = (task: Task) => (task.type === "multiple-choice" || task.type === "unterstreichen") && !!task.options;
const autoCheck = (task: Task) => task.type === "multiple-choice" || task.type === "unterstreichen" || task.type === "lueckentext" || (task.type === "zuordnen" && !!task.pairs?.length);

const MATCH_COLORS = ["#1FD6EA", "#F23A8E", "#A8E43A", "#F59E0B", "#8B5CF6", "#14B8A6", "#EF4444", "#3B82F6"];

/** Rechte Spalte fest je Aufgabe gemischt (wie in der App), höchstens ein Drittel neben seinem Partner. */
function shuffledRights(task: Task): string[] {
  const rights = (task.pairs ?? []).map((p) => p.right);
  if (rights.length < 2) return rights;
  let seed = 2166136261;
  for (const ch of `${task.number}|${task.question}`) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const fixed = (a: string[]) => a.filter((v, i) => v === rights[i]).length;
  let out = [...rights];
  for (let tries = 0; tries < 12 && (tries === 0 || fixed(out) > Math.floor(rights.length / 3)); tries++) {
    out = [...rights];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
  }
  if (fixed(out) > Math.floor(rights.length / 3)) out = [...rights.slice(1), rights[0]];
  return out;
}

// Punches pro Blatt nur einmal (gleicher Merker wie früher beim Prüfen des ganzen Blatts)
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
    /* ohne Speicher egal */
  }
}

async function aiCheck(task: Task, given: string, lang: "de" | "en"): Promise<{ correct: boolean; feedback: string; error?: boolean }> {
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: task.question.slice(0, 600), expected: task.answer.slice(0, 300), accepted: task.acceptedAnswers?.slice(0, 8).map((a) => a.slice(0, 120)), given: given.slice(0, 300), locale: lang }),
      signal: ctrl.signal,
    });
    window.clearTimeout(timer);
    if (!res.ok) return { correct: false, feedback: "", error: true };
    const json = (await res.json()) as { correct?: boolean; feedback?: string };
    return { correct: !!json.correct, feedback: json.feedback ?? "" };
  } catch {
    return { correct: false, feedback: "", error: true };
  }
}

export function SheetPractice({ data, onClose }: { data: WorksheetData; onClose: () => void }) {
  const { locale } = useLanguage();
  const lang = locale === "de" ? "de" : "en";
  const t = TEXT[lang];
  const list = data.tasks;
  const strict = isSpellingContext(data.title);
  const [run, setRun] = useState(0);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [selfChecked, setSelfChecked] = useState<boolean[]>([]);
  const [secondTry, setSecondTry] = useState<boolean[]>([]);
  const [status, setStatus] = useState<"open" | "checking" | "retry">("open");
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [hint, setHint] = useState("");
  const [checkFailedOnce, setCheckFailedOnce] = useState(false);
  const [finished, setFinished] = useState<null | { earned: number }>(null);
  const [link, setLink] = useState<Record<number, number>>({});
  const [selLeft, setSelLeft] = useState<number | null>(null);
  const [selRight, setSelRight] = useState<number | null>(null);
  const [usedHint, setUsedHint] = useState(false);

  const task = list[index];
  const hintText = task.type === "lueckentext" && !strict ? answerHint(task.answer) : null;
  const last = index === list.length - 1;
  const rights = useMemo(() => shuffledRights(task), [task]);
  const match: Record<number, string> = Object.fromEntries(Object.entries(link).map(([l, r]) => [l, rights[r]]));
  const allMatched = !!task.pairs?.length && task.pairs.every((_, i) => link[i] !== undefined);
  const auto = autoCheck(task);
  const answered = results.length > index;
  const ok = results[index];

  function connect(l: number, r: number) {
    setLink((m) => {
      const next: Record<number, number> = {};
      for (const [k, v] of Object.entries(m)) if (v !== r && Number(k) !== l) next[Number(k)] = v;
      next[l] = r;
      return next;
    });
    setSelLeft(null);
    setSelRight(null);
  }
  function tapLeft(l: number) {
    if (selRight !== null) return connect(l, selRight);
    if (link[l] !== undefined) {
      setLink((m) => { const n = { ...m }; delete n[l]; return n; });
      setSelLeft(l);
      return;
    }
    setSelLeft((s) => (s === l ? null : l));
  }
  function tapRight(r: number) {
    if (selLeft !== null) return connect(selLeft, r);
    const owner = Object.entries(link).find(([, v]) => v === r);
    if (owner) {
      setLink((m) => { const n = { ...m }; delete n[Number(owner[0])]; return n; });
      setSelRight(r);
      return;
    }
    setSelRight((s) => (s === r ? null : r));
  }

  function record(right: boolean, self = false, late = false) {
    setResults((r) => [...r.slice(0, index), right]);
    setSelfChecked((r) => [...r.slice(0, index), self]);
    setSecondTry((r) => [...r.slice(0, index), late]);
  }

  function wrongAttempt(feedback = "") {
    setHint(feedback);
    if (status === "retry") {
      if (auto) record(false);
      else setRevealed(true);
      setStatus("open");
    } else setStatus("retry");
  }

  async function submitAnswer(value: string) {
    if (answered || status === "checking" || !value.trim()) return;
    if (isChoice(task)) {
      setPicked(value);
      if (normalize(value) === normalize(task.answer)) record(true, false, status === "retry" || usedHint);
      else {
        setWrongPicks((w) => [...w, value]);
        wrongAttempt();
      }
      return;
    }
    const prev = status;
    // 1. tolerant (oder streng bei Rechtschreibung) vergleichen
    if (answerMatches(value, task.answer, task.acceptedAnswers, task.question, strict)) {
      const note = strict ? null : spellingNote(value, task.answer, task.acceptedAnswers, task.question);
      setHint(note ? t.spelling(note) : "");
      record(true, false, prev === "retry" || usedHint);
      setStatus("open");
      return;
    }
    if (strict) return wrongAttempt();
    // 2. inhaltlich per KI prüfen (Synonyme, andere Formulierung, ganze Sätze)
    setStatus("checking");
    const result = await aiCheck(task, value, lang);
    setStatus(prev);
    if (result.error && !checkFailedOnce) {
      setCheckFailedOnce(true);
      setHint(t.checkFailed);
      return;
    }
    if (result.correct) {
      setHint(result.feedback);
      record(true, false, prev === "retry" || usedHint);
      setStatus("open");
    } else {
      setHint(result.feedback);
      if (prev === "retry") {
        if (auto) record(false);
        else setRevealed(true);
        setStatus("open");
      } else setStatus("retry");
    }
  }

  function checkMatch() {
    if (answered || !task.pairs || !allMatched) return;
    const right = task.pairs.every((p, i) => normalize(match[i] ?? "") === normalize(p.right));
    if (right) {
      record(true, false, status === "retry");
      setStatus("open");
      return;
    }
    if (status === "retry") {
      setRevealed(true);
      record(false);
      setStatus("open");
    } else setStatus("retry");
  }

  function giveUp() {
    if (task.type === "zuordnen") setRevealed(true);
    if (auto) record(false);
    else setRevealed(true);
    setStatus("open");
  }

  function resetTask() {
    setTyped("");
    setLink({});
    setSelLeft(null);
    setSelRight(null);
    setPicked(null);
    setRevealed(false);
    setStatus("open");
    setWrongPicks([]);
    setHint("");
    setCheckFailedOnce(false);
    setUsedHint(false);
  }

  function next() {
    if (last) {
      const autoRight = results.reduce((sum, r, i) => sum + (r && !selfChecked[i] ? (secondTry[i] ? 0.5 : 1) : 0), 0);
      const selfRight = results.filter((r, i) => r && selfChecked[i]).length;
      const amount = alreadyAwarded(data) ? 0 : Math.round(autoRight * SHEET_ANSWER_PUNCHES + selfRight * (SHEET_ANSWER_PUNCHES / 2));
      if (amount > 0) {
        addPunches(amount);
        markAwarded(data);
      }
      track("answers_checked", { correct: results.filter(Boolean).length, total: list.length, mode: "one-by-one" });
      setFinished({ earned: amount });
      return;
    }
    setIndex((i) => i + 1);
    resetTask();
  }

  function restart() {
    setRun((r) => r + 1);
    setIndex(0);
    setResults([]);
    setSelfChecked([]);
    setSecondTry([]);
    setFinished(null);
    resetTask();
  }

  const correct = results.filter(Boolean).length;
  const missed = list.filter((_, i) => results[i] === false).map((x) => x.question);

  const card = "mx-auto flex w-full max-w-xl flex-col gap-5 rounded-[28px] bg-white p-5 text-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.25)] sm:p-7";
  const btnDark = "w-full rounded-[18px] bg-zinc-900 px-5 py-3.5 text-base font-extrabold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500";
  const btnGhost = "rounded-full border-2 border-zinc-200 bg-white px-5 py-2.5 text-sm font-extrabold text-zinc-900 hover:border-zinc-400";

  if (finished) {
    const ratio = correct / list.length;
    return (
      <div className={card} key={`done-${run}`}>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="relative grid h-[170px] w-[170px] place-items-center">
            <svg aria-hidden="true" width="170" height="170" viewBox="0 0 190 190" className="absolute inset-0">
              <circle cx="95" cy="95" r="80" fill="none" stroke="#e4e4e7" strokeWidth="18" />
              <circle cx="95" cy="95" r="80" fill="none" stroke="#1fd6ea" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${Math.round(502 * ratio)} 503`} transform="rotate(-90 95 95)" />
            </svg>
            <span className="flex flex-col items-center">
              <span className="text-4xl font-black leading-none">{correct}/{list.length}</span>
              <span className="text-sm font-bold text-zinc-500">{t.score}</span>
            </span>
          </div>
          <h2 className="text-2xl font-black">{ratio >= 0.99 ? t.doneAll : ratio >= 0.6 ? t.doneGood : t.doneStart}</h2>
          {finished.earned > 0 && <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-bold text-[#1fd6ea]">+{finished.earned} Punches</span>}
        </div>
        {missed.length > 0 && (
          <div className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
            <span className="text-sm font-extrabold text-zinc-500">{t.missed}</span>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm font-bold text-orange-700">
              {missed.slice(0, 6).map((m) => <li key={m}>{m.replace("___", "…")}</li>)}
            </ul>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button type="button" className={btnDark} onClick={onClose}>{t.back}</button>
          <button type="button" className={`${btnGhost} self-center`} onClick={restart}>{t.again}</button>
        </div>
      </div>
    );
  }

  const progress = Math.round(((index + (answered ? 1 : 0)) / list.length) * 100);

  return (
    <div className={card} key={`run-${run}`}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onClose} aria-label={t.close} className="grid h-11 w-11 flex-none place-items-center rounded-full border-2 border-zinc-200 text-zinc-700 hover:border-zinc-400">✕</button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
          <div className="h-full rounded-full bg-[#0e98b5] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm font-extrabold text-zinc-500">{index + 1}/{list.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-extrabold text-[#0e7f97]">{t.task(task.number)} · {data.title}</span>
        {(() => {
          // Sprachhinweis ("auf Spanisch") klein über der Frage statt in der großen Überschrift
          const { text, note } = splitLanguageNote(task.question);
          return (
            <>
              {note && <h2 className="text-sm font-extrabold text-zinc-500">🌐 {note}</h2>}
              <h1 className="text-xl font-black leading-snug sm:text-2xl"><MathText text={text.replace("___", "______")} /></h1>
            </>
          );
        })()}
      </div>

      {isChoice(task) ? (
        <div className="flex flex-col gap-2.5">
          {(task.options ?? []).map((opt) => {
            const tried = wrongPicks.includes(opt);
            const isRight = answered && normalize(opt) === normalize(task.answer);
            const isWrong = tried || (answered && picked === opt && !isRight);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => void submitAnswer(opt)}
                disabled={answered || tried}
                className={`min-h-14 rounded-2xl border-2 px-4 py-3 text-left text-base font-bold transition ${isRight ? "border-lime-600 bg-lime-50" : isWrong ? "border-orange-500 bg-orange-50 text-orange-900" : "border-zinc-200 bg-zinc-50 hover:border-zinc-400"}`}
              >
                <MathText text={opt} />
              </button>
            );
          })}
        </div>
      ) : task.type === "zuordnen" && task.pairs ? (
        <div className="flex flex-col gap-2.5">
          {answered || revealed ? (
            task.pairs.map((p, i) => {
              const okRow = normalize(match[i] ?? "") === normalize(p.right);
              return (
                <div key={i} className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)] items-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm font-bold ${okRow ? "border-lime-600 bg-lime-50" : "border-orange-500 bg-orange-50"}`}>
                  <span><MathText text={p.left} /></span>
                  <span className="text-zinc-400">→</span>
                  <span>{okRow ? <MathText text={p.right} /> : <><s className="mr-1 text-zinc-400">{match[i] ?? "–"}</s><MathText text={p.right} /></>}</span>
                </div>
              );
            })
          ) : (
            <>
              <p className="text-xs font-semibold text-zinc-500">{t.matchHint}</p>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-2">
                  {task.pairs.map((p, i) => {
                    const color = link[i] !== undefined ? MATCH_COLORS[i % MATCH_COLORS.length] : undefined;
                    return (
                      <button key={i} type="button" aria-pressed={selLeft === i} onClick={() => tapLeft(i)} style={color ? { borderColor: color, background: `color-mix(in srgb, ${color} 16%, #ffffff)` } : undefined}
                        className={`min-h-13 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold leading-snug transition active:scale-[0.98] ${selLeft === i ? "ring-4 ring-zinc-900/10" : ""} ${color ? "" : selLeft === i ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-zinc-50 hover:border-zinc-400"}`}>
                        <MathText text={p.left} />
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-2">
                  {rights.map((rv, ri) => {
                    const owner = Object.entries(link).find(([, v]) => v === ri);
                    const color = owner ? MATCH_COLORS[Number(owner[0]) % MATCH_COLORS.length] : undefined;
                    return (
                      <button key={ri} type="button" aria-pressed={selRight === ri} onClick={() => tapRight(ri)} style={color ? { borderColor: color, background: `color-mix(in srgb, ${color} 16%, #ffffff)` } : undefined}
                        className={`min-h-13 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold leading-snug transition active:scale-[0.98] ${selRight === ri ? "ring-4 ring-zinc-900/10" : ""} ${color ? "" : selRight === ri ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-zinc-50 hover:border-zinc-400"}`}>
                        <MathText text={rv} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          {!answered && !revealed && (
            <button type="button" className={btnDark} disabled={!allMatched} onClick={checkMatch}>{status === "retry" ? t.checkAgain : t.check}</button>
          )}
        </div>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) void submitAnswer(typed);
            else if (!auto) setRevealed(true);
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-extrabold text-zinc-600">
            {t.typeAnswer}
            {task.type === "offen" ? (
              <textarea value={typed} onChange={(e) => setTyped(e.target.value)} disabled={answered || revealed || status === "checking"} rows={3}
                className="w-full rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3 text-base font-semibold text-zinc-900 outline-none focus:border-[#0e98b5] disabled:bg-zinc-50" />
            ) : (
              <input value={typed} onChange={(e) => setTyped(e.target.value)} disabled={answered || status === "checking"} autoComplete="off" autoCapitalize="off" spellCheck={false}
                className="min-h-13 w-full rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3 text-base font-semibold text-zinc-900 outline-none focus:border-[#0e98b5] disabled:bg-zinc-50" />
            )}
          </label>
          {!answered && !revealed && (
            <button type="submit" className={btnDark} disabled={(auto && !typed.trim()) || status === "checking"}>
              {status === "checking" ? t.checking : !typed.trim() && !auto ? t.showSolution : status === "retry" ? t.checkAgain : t.check}
            </button>
          )}
        </form>
      )}

      {hintText && !answered && !revealed && (usedHint ? (
        <p className="rounded-2xl bg-cyan-50 px-4 py-3 text-cyan-950" role="status">
          <span className="font-black">{t.hintLabel}</span> <span className="font-mono text-lg font-bold tracking-widest">{hintText}</span>
          <span className="mt-1 block text-xs font-semibold text-cyan-800">{t.hintNote}</span>
        </p>
      ) : status !== "checking" && (
        <button type="button" className={`${btnGhost} self-start`} onClick={() => setUsedHint(true)}>{t.hintBtn}</button>
      ))}

      {status === "open" && hint && !answered && !revealed && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900" role="status">{hint}</p>}

      {status === "retry" && !answered && !revealed && (
        <div className="flex flex-col gap-1 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 px-4 py-3 text-orange-900" role="status">
          <span className="text-lg font-black">{t.tryAgain}</span>
          {hint && <span className="text-sm font-semibold">{hint}</span>}
        </div>
      )}

      {auto && !answered && !revealed && status !== "checking" && (
        <button type="button" className={`${btnGhost} self-center`} onClick={giveUp}>{t.dontKnow}</button>
      )}

      {!auto && revealed && !answered && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 rounded-2xl bg-cyan-50 px-4 py-3 text-cyan-950">
            <span className="font-black">{t.solution}</span>
            <span className="font-semibold"><MathText text={task.answer} /></span>
            {task.explanation && <span className="mt-1 text-sm font-semibold opacity-90"><MathText text={task.explanation} /></span>}
          </div>
          <span className="text-sm font-extrabold text-zinc-500">{t.selfCheck}</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btnGhost} onClick={() => record(false, true)}>{t.selfWrong}</button>
            <button type="button" className={btnDark} onClick={() => record(true, true)}>{t.selfRight}</button>
          </div>
        </div>
      )}

      {answered && (auto || !selfChecked[index]) && (
        <div className={`flex flex-col gap-1 rounded-2xl px-4 py-3 ${ok ? "bg-cyan-50 text-cyan-950" : "bg-orange-50 text-orange-950"}`} role="status">
          <span className="text-lg font-black">{ok ? t.right : t.wrong(task.answer)}</span>
          {ok && hint && <span className="text-sm font-bold">{hint}</span>}
          {!ok && hint && <span className="text-sm font-semibold">{hint}</span>}
          {task.explanation && <span className="mt-1 text-sm font-semibold opacity-90"><MathText text={task.explanation} /></span>}
        </div>
      )}

      {answered && (
        <>
          <button type="button" className={btnDark} onClick={next}>{last ? t.finish : t.next}</button>
          <ReportProblem tone="light" context={{ source: "web-sheet", title: data.title, question: task.question, expected: task.answer, options: task.options, given: (isChoice(task) ? picked : typed) || undefined }} />
        </>
      )}
    </div>
  );
}
