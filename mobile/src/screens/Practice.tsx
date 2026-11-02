import { useMemo, useState } from "react";
import { useT } from "../i18n";
import { Icon } from "../ui";
import type { QuizOutcome, Task } from "../types";
import { POINTS, type RewardLine } from "../punches";
import { hapticRight, hapticWrong } from "../feedback";

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?]$/, "");

/** Aufgabe automatisch prüfbar? Offene Antworten und Zuordnungen vergleicht man selbst mit der Lösung. */
function autoCheck(task: Task) {
  return task.type === "multiple-choice" || task.type === "unterstreichen" || task.type === "lueckentext";
}

/**
 * Arbeitsblatt oder Test online lösen: eine Aufgabe nach der anderen. Auswahl- und Lückenaufgaben werden
 * automatisch geprüft; bei offenen Aufgaben und Zuordnungen zeigt die App die Lösung und man bewertet sich selbst.
 */
export function Practice({ title, tasks, onClose, onFinish }: { title: string; tasks: Task[]; onClose: () => void; onFinish: (o: QuizOutcome, lines: RewardLine[]) => void }) {
  const { t } = useT();
  const list = useMemo(() => tasks, [tasks]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [selfChecked, setSelfChecked] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);

  const task = list[index];
  const last = index === list.length - 1;
  const auto = autoCheck(task);
  const answered = results.length > index;
  const ok = results[index];

  function record(right: boolean, self = false) {
    setResults((r) => [...r.slice(0, index), right]);
    setSelfChecked((r) => [...r.slice(0, index), self]);
    if (right) hapticRight();
    else hapticWrong();
  }

  function submitAuto(value: string) {
    if (answered || !value.trim()) return;
    setPicked(value);
    record(normalize(value) === normalize(task.answer));
  }

  function next() {
    if (last) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setTyped("");
    setPicked(null);
    setRevealed(false);
  }

  const correct = results.filter(Boolean).length;
  const missed = list.filter((_, i) => results[i] === false).map((x) => x.question);

  if (finished) {
    const ratio = correct / list.length;
    return (
      <div className="screen" style={{ alignItems: "center", gap: 20, paddingTop: 28 }}>
        <div className="ring">
          <svg aria-hidden="true" width="180" height="180" viewBox="0 0 190 190">
            <circle cx="95" cy="95" r="80" fill="none" stroke="#27272a" strokeWidth="18" />
            <circle cx="95" cy="95" r="80" fill="none" stroke="#1fd6ea" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${Math.round(502 * ratio)} 503`} transform="rotate(-90 95 95)" />
          </svg>
          <div className="center">
            <span style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>{correct}/{list.length}</span>
            <span className="muted" style={{ fontWeight: 700 }}>{t.score}</span>
          </div>
        </div>
        <h1 className="display" style={{ textAlign: "center" }}>{ratio >= 0.99 ? t.doneAll : ratio >= 0.6 ? t.doneGood : t.doneStart}</h1>
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
        <div className="stack" style={{ marginTop: "auto", width: "100%", paddingBottom: 28 }}>
          <button type="button" className="btn primary block" onClick={() => {
              const autoRight = results.filter((r, i) => r && !selfChecked[i]).length;
              const selfRight = results.filter((r, i) => r && selfChecked[i]).length;
              const lines: RewardLine[] = [];
              if (autoRight) lines.push({ source: "answer", amount: autoRight * POINTS.sheetAnswer });
              if (selfRight) lines.push({ source: "selfcheck", amount: selfRight * POINTS.selfcheck });
              onFinish({ correct, total: list.length, missed }, lines);
            }}>
            {t.next}
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
            <div style={{ width: `${Math.round(((index + (answered ? 1 : 0)) / list.length) * 100)}%` }} />
          </div>
          <span style={{ fontWeight: 800, color: "var(--sheet-muted)", fontSize: 15 }}>{index + 1}/{list.length}</span>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--teal-dark)" }}>
            {t.taskLabel(task.number)} · {title}
          </span>
          <h1 style={{ fontSize: 24, lineHeight: 1.3 }}>{task.question.replace("___", "______")}</h1>
        </div>

        {(task.type === "multiple-choice" || task.type === "unterstreichen") && task.options ? (
          <div className="stack">
            {task.options.map((opt) => {
              const cls = answered && normalize(opt) === normalize(task.answer) ? "option right" : picked === opt ? "option wrong" : "option";
              return (
                <button key={opt} type="button" className={cls} style={{ fontSize: 18 }} onClick={() => submitAuto(opt)} disabled={answered}>
                  {opt}
                </button>
              );
            })}
          </div>
        ) : task.type === "zuordnen" && task.pairs ? (
          <div className="stack" style={{ gap: 8 }}>
            {task.pairs.map((p, i) => (
              <div key={i} className="pair">
                <span>{p.left}</span>
                <span className="muted">→</span>
                <span>{revealed ? p.right : "?"}</span>
              </div>
            ))}
          </div>
        ) : (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (auto) submitAuto(typed);
              else setRevealed(true);
            }}
          >
            <label className="field">
              {t.typeAnswer}
              {task.type === "offen" ? (
                <textarea id="practice-answer" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={answered || revealed} />
              ) : (
                <input id="practice-answer" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={answered} autoComplete="off" autoCapitalize="off" />
              )}
            </label>
            {!answered && !revealed && (
              <button type="submit" className="btn dark block" disabled={auto && !typed.trim()}>
                {auto ? t.check : t.showSolution}
              </button>
            )}
          </form>
        )}

        {task.type === "zuordnen" && !revealed && (
          <button type="button" className="btn dark block" onClick={() => setRevealed(true)}>{t.showSolution}</button>
        )}

        {/* Selbsteinschätzung bei offenen Aufgaben und Zuordnungen */}
        {!auto && revealed && !answered && (
          <div className="stack">
            <div className="feedback ok"><span style={{ fontWeight: 900 }}>{t.solution}</span><span>{task.answer}</span></div>
            <span style={{ fontWeight: 800, color: "var(--sheet-muted)" }}>{t.selfCheck}</span>
            <div className="grid2">
              <button type="button" className="btn ghost" onClick={() => record(false, true)}>{t.selfWrong}</button>
              <button type="button" className="btn dark" onClick={() => record(true, true)}>{t.selfRight}</button>
            </div>
          </div>
        )}

        {answered && auto && (
          <div className={ok ? "feedback ok" : "feedback no"} role="status">
            <span style={{ fontSize: 20, fontWeight: 900 }}>{ok ? t.right : t.wrong(task.answer)}</span>
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
