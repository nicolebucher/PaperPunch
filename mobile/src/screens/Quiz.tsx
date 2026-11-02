import { useMemo, useState } from "react";
import { useT } from "../i18n";
import { Icon } from "../ui";
import type { GameResult, Question, QuizOutcome } from "../types";

const CHECKPOINT_MAX = 15;

function answerOf(q: Question): string {
  return q.type === "multiple-choice" ? (q.options?.[q.correctIndex ?? 0] ?? "") : (q.correctAnswer ?? "");
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?]$/, "");

/** Spielt alle Level nacheinander; ein Zwischentest nimmt eine gemischte Auswahl aus allen Leveln. */
export function Quiz({ game, checkpoint, inPlan, onClose, onFinish }: { game: GameResult["game"]; checkpoint: boolean; inPlan: boolean; onClose: () => void; onFinish: (o: QuizOutcome) => void }) {
  const { t } = useT();
  const questions = useMemo(() => {
    const all = game.levels.flatMap((l) => l.questions.map((q) => ({ ...q, level: l.title })));
    if (!checkpoint) return all;
    // gleichmäßig über die Level verteilt statt nur die ersten Fragen
    const step = Math.max(1, all.length / CHECKPOINT_MAX);
    return Array.from({ length: Math.min(CHECKPOINT_MAX, all.length) }, (_, i) => all[Math.floor(i * step)]);
  }, [game, checkpoint]);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);

  const q = questions[index];
  const answer = answerOf(q);
  const answered = picked !== null;
  const ok = answered && normalize(picked) === normalize(answer);
  const last = index === questions.length - 1;

  function submit(value: string) {
    if (answered || !value.trim()) return;
    setPicked(value);
    setResults((r) => [...r, normalize(value) === normalize(answer)]);
  }

  function next() {
    if (last) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    setTyped("");
  }

  const correct = results.filter(Boolean).length;
  const missed = questions.filter((_, i) => results[i] === false).map((x) => x.prompt);
  const outcome: QuizOutcome = { correct, total: questions.length, missed };

  if (finished) {
    const ratio = correct / questions.length;
    return (
      <div className="screen" style={{ alignItems: "center", gap: 20, paddingTop: 28 }}>
        <div className="ring">
          <svg aria-hidden="true" width="180" height="180" viewBox="0 0 190 190">
            <circle cx="95" cy="95" r="80" fill="none" stroke="#27272a" strokeWidth="18" />
            <circle cx="95" cy="95" r="80" fill="none" stroke="#1fd6ea" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${Math.round(502 * ratio)} 503`} transform="rotate(-90 95 95)" />
          </svg>
          <div className="center">
            <span style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>{correct}/{questions.length}</span>
            <span className="muted" style={{ fontWeight: 700 }}>{t.score}</span>
          </div>
        </div>
        <h1 style={{ textAlign: "center" }}>{ratio >= 0.99 ? t.doneAll : ratio >= 0.6 ? t.doneGood : t.doneStart}</h1>
        {missed.length > 0 && (
          <div className="card" style={{ width: "100%" }}>
            <span className="muted" style={{ fontWeight: 800 }}>{t.missedTitle}</span>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {missed.slice(0, 6).map((m) => (
                <li key={m} style={{ color: "#fdba74", fontWeight: 700 }}>{m.replace("___", "…")}</li>
              ))}
            </ul>
          </div>
        )}
        {checkpoint && <p className="muted" style={{ textAlign: "center" }}>{t.checkpointHint}</p>}
        <div className="stack" style={{ marginTop: "auto", width: "100%", paddingBottom: 28 }}>
          <button type="button" className="btn primary block" onClick={() => (inPlan ? onFinish(outcome) : onClose())}>
            {inPlan ? t.backToPlan : t.back}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen light">
      <div className="inner" style={{ gap: 20, padding: "16px 0 28px" }}>
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <button type="button" className="iconbtn" onClick={onClose} aria-label={t.back}>
            <Icon name="close" size={20} stroke={2.6} />
          </button>
          <div className="progress" aria-hidden="true">
            <div style={{ width: `${Math.round(((index + (answered ? 1 : 0)) / questions.length) * 100)}%` }} />
          </div>
          <span style={{ fontWeight: 800, color: "var(--sheet-muted)", fontSize: 15 }}>{index + 1}/{questions.length}</span>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--teal-dark)" }}>
            {t.question(index + 1, questions.length)} · {q.level}
          </span>
          <h1 style={{ fontSize: 26 }}>{q.type === "lueckentext" ? q.prompt.replace("___", "______") : q.prompt}</h1>
        </div>

        {q.type === "multiple-choice" ? (
          <div className="stack">
            {(q.options ?? []).map((opt) => {
              const cls = answered && opt === answer ? "option right" : picked === opt ? "option wrong" : "option";
              return (
                <button key={opt} type="button" className={cls} onClick={() => submit(opt)} disabled={answered}>
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              submit(typed);
            }}
          >
            <label className="field">
              {t.typeAnswer}
              <input id="quiz-answer" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={answered} autoComplete="off" autoCapitalize="off" />
            </label>
            {!answered && (
              <button type="submit" className="btn dark block" disabled={!typed.trim()}>
                {t.check}
              </button>
            )}
          </form>
        )}

        {answered && (
          <div className={ok ? "feedback ok" : "feedback no"} role="status">
            <span style={{ fontSize: 20, fontWeight: 900 }}>{ok ? t.right : t.wrong(answer)}</span>
            <span>{q.explanation}</span>
          </div>
        )}

        {answered && (
          <button type="button" className="btn dark block" style={{ marginTop: "auto" }} onClick={next}>
            {last ? t.finish : t.next}
          </button>
        )}
      </div>
    </div>
  );
}
