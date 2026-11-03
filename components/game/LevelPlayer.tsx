"use client";

import { useEffect, useRef, useState } from "react";
import type { Level } from "@/types/generation";
import { useLanguage } from "@/lib/i18n/language-context";
import { SnapIcon } from "@/components/icons/ActionIcons";
import { QuestionCard } from "./QuestionCard";
import { FillBlankCard } from "./FillBlankCard";
import { SnapEffect } from "./SnapEffect";
import { answerMatches } from "@/lib/answer-match";

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
}: {
  level: Level;
  totalSnaps: number;
  onComplete: (result: LevelResult) => void;
  onExit: () => void;
  onSnap: (amount: number) => void;
}) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [typedValue, setTypedValue] = useState("");
  const [checked, setChecked] = useState(false);
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
    : answered && answerMatches(typedValue, question.correctAnswer ?? "", question.acceptedAnswers);
  const snapsForThisQuestion = SNAPS_BY_DIFFICULTY[level.difficulty] ?? 10;

  useEffect(() => {
    readyAtRef.current = Date.now() + 400;
  }, [index]);

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
  }

  function handleCheckTyped() {
    if (answeredRef.current || Date.now() < readyAtRef.current || typedValue.trim() === "") return;
    answeredRef.current = true;
    setChecked(true);
    awardIfCorrect(answerMatches(typedValue, question.correctAnswer ?? "", question.acceptedAnswers));
  }

  function handleNext() {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setSnapBurst(null);
    if (isLast) {
      const ratio = correctCount / level.questions.length;
      const stars = ratio === 1 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.4 ? 1 : 0;
      onComplete({ stars, score: correctCount });
    } else {
      setSelected(null);
      setTypedValue("");
      setChecked(false);
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
        <span className="text-sm text-zinc-500">{t.game.questionOf(index + 1, level.questions.length)}</span>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-400/10 px-3 py-1.5 text-xs font-semibold text-brand-300">
          <SnapIcon className="h-3.5 w-3.5" />
          {totalSnaps} {t.game.snapsUnit}
        </div>
      </div>
      <h2 className="mb-4 text-lg font-semibold">{level.title}</h2>
      <div className="relative">
        {isMultipleChoice ? (
          <QuestionCard question={question} selected={selected} onSelect={handleSelect} />
        ) : (
          <FillBlankCard
            prompt={question.prompt}
            value={typedValue}
            checked={checked}
            isCorrect={isCorrect}
            onChange={setTypedValue}
            onSubmit={handleCheckTyped}
          />
        )}
        {snapBurst && <SnapEffect key={snapBurst.key} amount={snapBurst.amount} snapsUnit={t.game.snapsUnit} />}
      </div>
      {answered && (
        <div
          className={`mt-4 rounded-lg p-4 text-sm ${
            isCorrect ? "bg-green-400/10 text-green-300" : "bg-orange-400/10 text-orange-300"
          }`}
        >
          <p className="mb-1 font-medium">{isCorrect ? t.game.correct : t.game.wrong}</p>
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
          className="mt-4 rounded-full bg-brand-400 px-5 py-2 font-medium text-black hover:bg-brand-300"
        >
          {isLast ? t.game.finishLevel : t.game.next}
        </button>
      )}
    </div>
  );
}
