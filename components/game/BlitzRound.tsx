"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Question } from "@/types/generation";
import { MathText } from "@/components/ui/MathText";
import { answerMatches, splitLanguageNote } from "@/lib/answer-match";
import { BLITZ_PUNCHES, BLITZ_SECONDS, blitzRecord, buildBlitzDeck, saveBlitzRecord, type BlitzItem } from "@/lib/blitz";
import { isRightLink, MatchCard, matchRights } from "./MatchCard";

// Blitzrunde wie in der App (mobile/src/screens/Blitz.tsx): 60 Sekunden, Auswahl, Richtig/Falsch, Zuordnen und
// kurze Lücken aus allen Leveln. Falsch → Lösung blitzt kurz auf. Punches nur über dem bisherigen Rekord.

const TEXT = {
  de: {
    title: "Blitzrunde",
    rules: (s: number) => `${s} Sekunden, so viele Fragen wie möglich: Auswahl, Richtig/Falsch, Zuordnen und kurze Lücken aus allen Leveln. Falsch? Die Lösung blitzt kurz auf, dann geht's weiter.`,
    record: (n: number) => `Dein Rekord: ${n} richtig`,
    punchNote: "Punches gibt es für jede richtige Antwort über deinem Rekord.",
    start: "Los geht's!",
    isAnswer: "Stimmt diese Antwort?",
    yes: "Richtig",
    no: "Falsch",
    right: (a: string) => `Richtig ist: ${a}`,
    check: "Prüfen",
    result: (n: number, s: number) => `${n} richtig in ${s} Sekunden`,
    newRecord: "Neuer Rekord! 🎉",
    missed: "Das war noch nicht richtig:",
    practice: (n: number) => `${n === 1 ? "Diese Frage" : `Diese ${n} Fragen`} üben`,
    again: "Nochmal",
    back: "Zurück zur Übersicht",
    empty: "Dieses Spiel hat keine Fragen, die schnell genug für eine Blitzrunde sind.",
    answer: "Deine Antwort",
  },
  en: {
    title: "Speed round",
    rules: (s: number) => `${s} seconds, as many questions as you can: multiple choice, true/false, matching and short gaps from all levels. Wrong? The answer flashes up briefly, then on you go.`,
    record: (n: number) => `Your record: ${n} right`,
    punchNote: "You get Punches for every right answer above your record.",
    start: "Let's go!",
    isAnswer: "Is this the right answer?",
    yes: "True",
    no: "False",
    right: (a: string) => `The answer is: ${a}`,
    check: "Check",
    result: (n: number, s: number) => `${n} right in ${s} seconds`,
    newRecord: "New record! 🎉",
    missed: "Not quite right yet:",
    practice: (n: number) => `Practise ${n === 1 ? "this question" : `these ${n} questions`}`,
    again: "Play again",
    back: "Back to overview",
    empty: "This game has no questions quick enough for a speed round.",
    answer: "Your answer",
  },
};

const btnBase = "w-full rounded-[18px] border-2 px-4 py-3.5 text-left text-[17px] font-bold transition active:scale-[0.98]";
const optCls = (state: "idle" | "right" | "wrong") =>
  `${btnBase} ${state === "right" ? "border-[#0e7f97] bg-[#cff7fb]" : state === "wrong" ? "border-orange-500 bg-orange-50" : "border-zinc-200 bg-zinc-50 hover:border-zinc-400"}`;

export function BlitzRound({
  questions,
  gameKey,
  locale,
  onExit,
  onPunches,
  onPractice,
}: {
  questions: Question[];
  gameKey: string;
  locale: string;
  onExit: () => void;
  onPunches: (amount: number) => void;
  onPractice: (qs: Question[]) => void;
}) {
  const tx = locale === "de" ? TEXT.de : TEXT.en;
  const [phase, setPhase] = useState<"intro" | "play" | "end">("intro");
  const [deck, setDeck] = useState<BlitzItem[]>(() => buildBlitzDeck(questions));
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(BLITZ_SECONDS);
  const [correct, setCorrect] = useState(0);
  const [missed, setMissed] = useState<BlitzItem[]>([]);
  const [flash, setFlash] = useState<null | { ok: boolean; pick?: string }>(null);
  const [typed, setTyped] = useState("");
  const [link, setLink] = useState<Record<number, number>>({});
  const [oldRecord, setOldRecord] = useState(0);
  const endsAt = useRef(0);
  const result = useRef({ points: 0, newRecord: false });

  useEffect(() => setOldRecord(blitzRecord(gameKey)), [gameKey]);

  const item = deck[idx % Math.max(1, deck.length)];
  const rights = useMemo(() => (item?.kind === "match" ? matchRights(item.pairs, item.prompt) : []), [item]);

  useEffect(() => {
    if (phase !== "play") return;
    const id = window.setInterval(() => setLeft(Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000))), 200);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "play" && left === 0 && !flash) {
      const points = Math.max(0, correct - oldRecord) * BLITZ_PUNCHES;
      result.current = { points, newRecord: correct > oldRecord };
      if (correct > oldRecord) saveBlitzRecord(gameKey, correct);
      if (points > 0) onPunches(points);
      setPhase("end");
    }
  }, [left, flash, phase, correct, oldRecord, gameKey, onPunches]);

  function start() {
    setOldRecord(blitzRecord(gameKey));
    setDeck(buildBlitzDeck(questions));
    setIdx(0);
    setCorrect(0);
    setMissed([]);
    setFlash(null);
    setTyped("");
    setLink({});
    endsAt.current = Date.now() + BLITZ_SECONDS * 1000;
    setLeft(BLITZ_SECONDS);
    setPhase("play");
  }

  function answer(ok: boolean, pick?: string) {
    if (flash || !item) return;
    if (ok) setCorrect((c) => c + 1);
    else setMissed((m) => (m.some((x) => x.prompt === item.prompt) ? m : [...m, item]));
    setFlash({ ok, pick });
    window.setTimeout(() => {
      setFlash(null);
      setTyped("");
      setLink({});
      setIdx((i) => {
        if (i + 1 >= deck.length) {
          setDeck(buildBlitzDeck(questions));
          return 0;
        }
        return i + 1;
      });
    }, ok ? 350 : item.kind === "match" ? 1600 : 1100);
  }

  const shell = (children: ReactNode) => <div className="relative mx-auto w-full max-w-xl">{children}</div>;
  const card = "rounded-[28px] bg-white p-5 text-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.25)] sm:p-6";

  if (deck.length === 0) {
    return shell(
      <div className={card}>
        <h2 className="mb-2 text-2xl font-black">⏱ {tx.title}</h2>
        <p className="mb-4 text-zinc-600">{tx.empty}</p>
        <button type="button" onClick={onExit} className="w-full rounded-[20px] bg-zinc-900 px-5 py-4 font-extrabold text-white">{tx.back}</button>
      </div>
    );
  }

  if (phase === "intro") {
    return shell(
      <div className={`${card} flex flex-col items-center gap-3 text-center`}>
        <span className="text-6xl" aria-hidden="true">⏱</span>
        <h2 className="text-3xl font-black">{tx.title}</h2>
        <p className="max-w-sm text-zinc-600">{tx.rules(BLITZ_SECONDS)}</p>
        {oldRecord > 0 && <p className="font-extrabold">{tx.record(oldRecord)}</p>}
        <p className="text-xs font-semibold text-zinc-500">{tx.punchNote}</p>
        <button type="button" onClick={start} className="mt-2 w-full rounded-[20px] bg-[#f23a8e] px-5 py-4 text-[17px] font-extrabold text-white active:scale-[0.98]">{tx.start}</button>
        <button type="button" onClick={onExit} className="text-sm font-bold text-zinc-500">← {tx.back}</button>
      </div>
    );
  }

  if (phase === "end") {
    const { points, newRecord } = result.current;
    return shell(
      <div className="flex flex-col gap-4">
        <div className={`${card} flex flex-col items-center gap-2 text-center`}>
          <span className="text-5xl" aria-hidden="true">⏱</span>
          <h2 className="text-2xl font-black">{tx.result(correct, BLITZ_SECONDS)}</h2>
          <p className="font-bold text-zinc-600">{newRecord ? tx.newRecord : tx.record(Math.max(oldRecord, correct))}</p>
          {points > 0 && <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-bold text-[#1fd6ea]">+{points} Punches</span>}
        </div>
        {missed.length > 0 && (
          <div className="flex flex-col gap-2">
            <b className="text-sm text-zinc-300">{tx.missed}</b>
            {missed.map((m, i) => (
              <div key={i} className="flex flex-col gap-1 rounded-2xl bg-[#15171b] p-3.5 text-sm ring-1 ring-white/[0.06]">
                <span><MathText text={m.prompt.replace("___", "____")} /></span>
                <b className="text-[#a8e43a]">→ {m.kind === "match" ? m.pairs.map((p) => `${p.left} = ${p.right}`).join(" · ") : m.answer}</b>
                {m.src.explanation && <small className="text-zinc-400">{m.src.explanation}</small>}
              </div>
            ))}
          </div>
        )}
        {missed.length > 0 && <button type="button" onClick={() => onPractice(missed.map((m) => m.src as Question))} className="w-full rounded-[20px] bg-[#1fd6ea] px-5 py-4 text-[17px] font-extrabold text-black">{tx.practice(missed.length)}</button>}
        <button type="button" onClick={start} className="w-full rounded-[20px] bg-zinc-100 px-5 py-4 text-[17px] font-extrabold text-zinc-950">{tx.again}</button>
        <button type="button" onClick={onExit} className="text-sm font-bold text-zinc-400">← {tx.back}</button>
      </div>
    );
  }

  const { text, note } = splitLanguageNote(item.prompt);
  return shell(
    <>
      <div className="mb-4 flex items-center gap-3">
        <button type="button" onClick={onExit} className="text-sm text-zinc-500 hover:text-zinc-300">✕</button>
        <span className={`h-3 flex-1 overflow-hidden rounded-full bg-zinc-800 ${left <= 10 ? "animate-pulse" : ""}`}>
          <span className="block h-full rounded-full bg-[#f23a8e] transition-[width] duration-200 ease-linear" style={{ width: `${(left / BLITZ_SECONDS) * 100}%` }} />
        </span>
        <span className="w-10 text-right font-black tabular-nums">{left}s</span>
      </div>
      <div className="mb-3 flex items-center justify-between text-sm font-extrabold">
        <span className="text-[#f23a8e]">⏱ {tx.title}</span>
        <span className="rounded-full bg-[#cff7fb] px-3 py-1 text-[#0e4a52]">✓ {correct}</span>
      </div>

      {item.kind === "match" ? (
        <>
          <MatchCard prompt={item.prompt} pairs={item.pairs} rights={rights} link={link} onLink={setLink} solved={!!flash} retry={false} onSubmit={() => answer(item.pairs.every((p, i) => isRightLink(p, rights, link[i])))} locale={locale} />
        </>
      ) : (
        <div className={card} key={`b${idx}`}>
          {note && <h2 className="mb-2 text-sm font-extrabold text-zinc-500">🌐 {note}</h2>}
          <p className="mb-4 text-[22px] font-extrabold leading-snug"><MathText text={item.kind === "gap" ? text.replace("___", "______") : text} /></p>
          {item.kind === "mc" && (
            <div className="flex flex-col gap-2.5">
              {item.options.map((o, oi) => (
                <button key={oi} type="button" disabled={!!flash} onClick={() => answer(o === item.answer, o)} className={optCls(flash ? (o === item.answer ? "right" : o === flash.pick ? "wrong" : "idle") : "idle")}>
                  <MathText text={o} />
                </button>
              ))}
            </div>
          )}
          {item.kind === "tf" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-3">
                <small className="text-xs font-bold text-zinc-500">{tx.isAnswer}</small>
                <b className="text-lg"><MathText text={item.candidate} /></b>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[true, false].map((v) => (
                  <button key={String(v)} type="button" disabled={!!flash} onClick={() => answer(v === item.truth, String(v))} className={`${optCls(flash ? (v === item.truth ? "right" : flash.pick === String(v) ? "wrong" : "idle") : "idle")} text-center`}>
                    {v ? `✓ ${tx.yes}` : `✗ ${tx.no}`}
                  </button>
                ))}
              </div>
              {flash && !flash.ok && !item.truth && <p className="text-center text-sm font-bold text-zinc-600">{tx.right(item.answer)}</p>}
            </div>
          )}
          {item.kind === "gap" && (
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) answer(answerMatches(typed, item.answer, item.accepted, item.prompt)); }}>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!!flash} autoFocus autoComplete="off" autoCapitalize="off" aria-label={tx.answer}
                className="min-h-12 rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 text-lg font-bold outline-none focus:border-zinc-900" />
              {!flash && <button type="submit" disabled={!typed.trim()} className="w-full rounded-[20px] bg-zinc-900 px-5 py-4 text-[17px] font-extrabold text-white disabled:bg-zinc-200 disabled:text-zinc-500">{tx.check}</button>}
              {flash && !flash.ok && <p className="text-center text-sm font-bold text-zinc-600">{tx.right(item.answer)}</p>}
            </form>
          )}
        </div>
      )}
      {flash?.ok && <p className="mt-3 text-center text-4xl font-black text-[#1fd6ea]" aria-live="polite">✓</p>}
    </>
  );
}
