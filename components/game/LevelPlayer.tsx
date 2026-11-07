"use client";

import { track } from "@/lib/analytics";
import { useEffect, useRef, useState } from "react";
import type { Level } from "@/types/generation";
import { JOKER_PUNCHES, PUNCHES_EVENT, spendPunches, totalPunches } from "@/lib/webapp/punches";
import { useLanguage } from "@/lib/i18n/language-context";
import { SnapIcon } from "@/components/icons/ActionIcons";
import { QuestionCard } from "./QuestionCard";
import { FillBlankCard } from "./FillBlankCard";
import { SnapEffect } from "./SnapEffect";
import { answerMatches, isSpellingContext } from "@/lib/answer-match";
import { ReportProblem } from "@/components/ReportProblem";

export interface LevelResult {
  stars: number;
  score: number;
}

const SNAPS_BY_DIFFICULTY: Record<string, number> = { leicht: 10, mittel: 15, schwer: 20 };

export function LevelPlayer({
  level,
  totalSnaps,
  onComplete,
  onExit,
  onSnap,
  joker = false,
  report,
  onAnswer,
}: {
  /** Jede beantwortete Frage melden (Lerngruppe: Auswertung für die Lehrkraft). */
  onAnswer?: (index: number, ok: boolean, given: string) => void;
  /** Herkunft für "Fehler melden" (z. B. "web-group") plus Spieltitel/Fach. */
  report?: { source: string; title?: string; subject?: string };
  /** Joker 50:50 gegen Punches anbieten (nicht in Challenges, damit es fair bleibt). */
  joker?: boolean;
  level: Level;
  totalSnaps: number;
  onComplete: (result: LevelResult) => void;
  onExit: () => void;
  onSnap: (amount: number) => void;
}) {
  const { t, locale } = useLanguage();
  const [index, setIndex] = useState(0);
  // Nicht wortgleiche Freitext-Antworten prüft die KI inhaltlich (Synonyme, andere Formen) – wie in der App
  const [aiOk, setAiOk] = useState(false);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [typedValue, setTypedValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [hidden, setHidden] = useState<number[]>([]);
  const [wallet, setWallet] = useState(0);
  const [snapBurst, setSnapBurst] = useState<{ key: number; amount: number } | null>(null);
  // Mirrors `answered`/advance-in-progress synchronously so a second click/tap event
  // (e.g. a touch device firing both `touchend` and a synthetic `click`) landing before
  // React commits the state update can't slip through and answer/advance twice per tap.
  const answeredRef = useRef(false);
  const advancingRef = useRef(false);
  // Timestamp until which a tap on an answer option is ignored. A tap that changes the
  // layout (advancing to a new question, or entering the level from the level map) can
  // trigger a *second*, slightly delayed click/touch event from the same physical tap that
  // now lands on whatever the layout shows in that spot next - here, a fresh option button.
  // Clearing answeredRef immediately let that delayed click answer the new question too, so
  // instead this stays engaged for a short cooldown after every question change.
  const readyAtRef = useRef(0);

  const question = level.questions[index];
  const isLast = index === level.questions.length - 1;
  const isMultipleChoice = question.type === "multiple-choice";
  const answered = isMultipleChoice ? selected !== null : checked;
  const isCorrect = isMultipleChoice
    ? answered && selected === question.correctIndex
    : answered && (aiOk || answerMatches(typedValue, question.correctAnswer ?? "", question.acceptedAnswers, question.prompt));
  const snapsForThisQuestion = SNAPS_BY_DIFFICULTY[level.difficulty] ?? 10;

  useEffect(() => {
    readyAtRef.current = Date.now() + 400;
  }, [index]);

  // Aktueller Punches-Stand für den Joker (ändert sich durch richtige Antworten und Joker).
  useEffect(() => {
    setWallet(totalPunches());
    const update = () => setWallet(totalPunches());
    window.addEventListener(PUNCHES_EVENT, update);
    return () => window.removeEventListener(PUNCHES_EVENT, update);
  }, []);

  const canJoker = joker && isMultipleChoice && (question.options?.length ?? 0) >= 3 && selected === null && hidden.length === 0;
  const jokerUsed = hidden.length > 0 && selected === null;

  function applyJoker() {
    if (!canJoker || !spendPunches(JOKER_PUNCHES)) return;
    track("joker_used");
    const wrong = (question.options ?? []).map((_, i) => i).filter((i) => i !== question.correctIndex).sort(() => Math.random() - 0.5);
    setHidden(wrong.slice(0, Math.max(1, (question.options?.length ?? 0) - 2)));
  }

  function awardIfCorrect(correct: boolean) {
    if (correct) {
      setCorrectCount((c) => c + 1);
      onSnap(snapsForThisQuestion);
      setSnapBurst({ key: Date.now(), amount: snapsForThisQuestion });
    }
  }

  function handleSelect(optionIndex: number) {
    if (answeredRef.current || Date.now() < readyAtRef.current) return;
    answeredRef.current = true;
    setSelected(optionIndex);
    awardIfCorrect(optionIndex === question.correctIndex);
    onAnswer?.(index, optionIndex === question.correctIndex, question.options?.[optionIndex] ?? "");
  }

  async function handleCheckTyped() {
    if (answeredRef.current || Date.now() < readyAtRef.current || typedValue.trim() === "") return;
    answeredRef.current = true;
    const given = typedValue.trim();
    let ok = answerMatches(given, question.correctAnswer ?? "", question.acceptedAnswers, question.prompt);
    // Rechtschreib-Spiele bleiben streng; sonst inhaltlich prüfen lassen (z. B. "Spielplatz" für "playground")
    if (!ok && question.correctAnswer && !isSpellingContext(`${report?.title ?? ""} ${level.title}`)) {
      setChecking(true);
      try {
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => ctrl.abort(), 9000);
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: question.prompt.slice(0, 600), expected: question.correctAnswer.slice(0, 300), accepted: question.acceptedAnswers?.slice(0, 8).map((a) => a.slice(0, 120)), given: given.slice(0, 300), locale: locale === "de" ? "de" : "en" }),
          signal: ctrl.signal,
        });
        window.clearTimeout(timer);
        if (res.ok) {
          const json = (await res.json()) as { correct?: boolean; feedback?: string };
          ok = !!json.correct;
          setFeedback(json.feedback ?? "");
        }
      } catch {
        // ohne Netz/Antwort bleibt es beim einfachen Vergleich
      }
      setChecking(false);
    }
    setAiOk(ok);
    setChecked(true);
    awardIfCorrect(ok);
    onAnswer?.(index, ok, given);
  }

  function handleNext() {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setSnapBurst(null);
    if (isLast) {
      const ratio = correctCount / level.questions.length;
      // wie in der App: ab 85 % drei Sterne, ab 60 % zwei, sonst einer fürs Durchspielen
      const stars = ratio >= 0.85 ? 3 : ratio >= 0.6 ? 2 : 1;
      onComplete({ stars, score: correctCount });
    } else {
      setSelected(null);
      setHidden([]);
      setTypedValue("");
      setChecked(false);
      setAiOk(false);
      setFeedback("");
      answeredRef.current = false;
      advancingRef.current = false;
      setIndex((i) => i + 1);
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" onClick={onExit} className="text-sm text-zinc-500 hover:text-zinc-300">
          ← {t.game.back}
        </button>
        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800" aria-label={t.game.questionOf(index + 1, level.questions.length)}>
          <span className="block h-full rounded-full bg-[#1fd6ea] transition-all" style={{ width: `${Math.round(((index + (answered ? 1 : 0)) / level.questions.length) * 100)}%` }} />
        </span>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-400/10 px-3 py-1.5 text-xs font-semibold text-brand-300">
          <SnapIcon className="h-3.5 w-3.5" />
          {totalSnaps} {t.game.snapsUnit}
        </div>
      </div>
      <h2 className="mb-4 text-sm font-extrabold text-[#1fd6ea]">{level.title} · {index + 1}/{level.questions.length}</h2>
      <div className="relative">
        {isMultipleChoice ? (
          <QuestionCard question={question} selected={selected} onSelect={handleSelect} hidden={hidden} />
        ) : (
          <FillBlankCard
            prompt={question.prompt}
            value={typedValue}
            checked={checked}
            isCorrect={isCorrect}
            onChange={setTypedValue}
            onSubmit={() => void handleCheckTyped()}
            checking={checking}
            feedback={feedback}
          />
        )}
        {snapBurst && <SnapEffect key={snapBurst.key} amount={snapBurst.amount} snapsUnit={t.game.snapsUnit} />}
      </div>
      {/* Joker kostet Punches – Preis als Chip mit Minus, damit klar ist, dass etwas abgezogen wird. */}
      {canJoker && (
        <button
          type="button"
          onClick={applyJoker}
          disabled={wallet < JOKER_PUNCHES}
          className="mx-auto mt-4 flex min-h-12 items-center gap-3 rounded-full border-2 border-dashed border-zinc-600 py-1.5 pl-4 pr-1.5 text-left disabled:opacity-45"
        >
          <span className="flex flex-col leading-tight">
            <b className="text-sm font-extrabold">{t.game.jokerName}</b>
            <small className="text-xs font-semibold text-zinc-400">{wallet < JOKER_PUNCHES ? t.game.jokerTooFew(JOKER_PUNCHES) : t.game.jokerWhat}</small>
          </span>
          <span className={`flex h-[34px] items-center gap-1 whitespace-nowrap rounded-full px-3 text-sm font-black text-white ${wallet < JOKER_PUNCHES ? "bg-zinc-500" : "bg-[#f23a8e]"}`}>
            −{JOKER_PUNCHES} <SnapIcon className="h-3.5 w-3.5" />
          </span>
        </button>
      )}
      {jokerUsed && <p className="mt-4 text-center text-[13px] font-bold text-[#f23a8e]">{t.game.jokerUsed(JOKER_PUNCHES)}</p>}
      {answered && (
        <div
          className={`mt-4 rounded-[20px] p-4 text-[15px] ${
            isCorrect ? "bg-[#cff7fb] text-[#0e4a52]" : "bg-orange-100 text-orange-900"
          }`}
        >
          <p className="mb-1 text-lg font-black">{isCorrect ? t.game.correct : t.game.wrong}</p>
          {!isCorrect && !isMultipleChoice && (
            <p className="mb-1">{t.game.correctAnswerWas(question.correctAnswer ?? "")}</p>
          )}
          <p>{question.explanation}</p>
        </div>
      )}
      {answered && (
        <button
          type="button"
          onClick={handleNext}
          className="mt-4 w-full rounded-[20px] bg-zinc-100 px-5 py-4 text-[17px] font-extrabold text-zinc-950 transition active:scale-[0.98]"
        >
          {isLast ? t.game.finishLevel : t.game.next}
        </button>
      )}
      {answered && <ReportProblem
        context={{
          source: report?.source ?? "web-game",
          title: report?.title,
          subject: report?.subject,
          level: level.title,
          question: question.prompt,
          expected: isMultipleChoice ? question.options?.[question.correctIndex ?? 0] : question.correctAnswer,
          options: isMultipleChoice ? question.options : question.acceptedAnswers,
          given: isMultipleChoice ? (selected !== null ? question.options?.[selected] : undefined) : typedValue.trim() || undefined,
        }}
      />}
    </div>
  );
}
