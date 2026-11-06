import { useMemo, useState, type CSSProperties } from "react";
import { useT } from "../i18n";
import { MathText } from "../math";
import { Icon } from "../ui";
import type { QuizOutcome, Task } from "../types";
import { POINTS, type RewardLine } from "../punches";
import { hapticRight, hapticWrong } from "../feedback";
import { checkTypedAnswer } from "../api";
import { isSpellingContext } from "../answerMatch";
import type { PracticeProgress } from "../storage";
import { ReportProblem } from "../ReportProblem";

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?]$/, "");
const isChoice = (task: Task) => (task.type === "multiple-choice" || task.type === "unterstreichen") && !!task.options;

/** Aufgabe automatisch prüfbar? Offene Antworten und Zuordnungen vergleicht man selbst mit der Lösung. */
function autoCheck(task: Task) {
  return task.type === "multiple-choice" || task.type === "unterstreichen" || task.type === "lueckentext" || (task.type === "zuordnen" && !!task.pairs?.length);
}

/** Rechte Seite einer Zuordnung gemischt (fest je Aufgabe), damit die Reihenfolge nichts verrät. */
function shuffledRights(task: Task): string[] {
  const rights = (task.pairs ?? []).map((p) => p.right);
  const seed = task.question.length + task.number * 7;
  return rights.map((v, i) => ({ v, k: (i * 9301 + seed * 49297) % 233280 })).sort((a, b) => a.k - b.k).map((x) => x.v);
}

/** Farben für verbundene Paare (linke Zeile bestimmt die Farbe). */
const MATCH_COLORS = ["#1FD6EA", "#F23A8E", "#A8E43A", "#F59E0B", "#8B5CF6", "#14B8A6", "#EF4444", "#3B82F6"];

/**
 * Arbeitsblatt oder Test online lösen: eine Aufgabe nach der anderen. Auswahl- und Lückenaufgaben werden
 * automatisch geprüft; bei offenen Aufgaben und Zuordnungen zeigt die App die Lösung und man bewertet sich selbst.
 */
export function Practice({
  title,
  tasks,
  initial,
  onProgress,
  onClose,
  onFinish,
}: {
  title: string;
  tasks: Task[];
  initial?: PracticeProgress;
  onProgress?: (p: PracticeProgress) => void;
  onClose: () => void;
  onFinish: (o: QuizOutcome, lines: RewardLine[]) => void;
}) {
  const { t, lang } = useT();
  const list = useMemo(() => tasks, [tasks]);
  const resume = initial && initial.index < tasks.length ? initial : undefined;
  const [index, setIndex] = useState(resume?.index ?? 0);
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>(resume?.results ?? []);
  const [selfChecked, setSelfChecked] = useState<boolean[]>(resume?.selfChecked ?? []);
  const [secondTry, setSecondTry] = useState<boolean[]>(resume?.secondTry ?? []); // richtig, aber erst im 2. Versuch → halbe Punches
  const [status, setStatus] = useState<"open" | "checking" | "retry">("open");
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [hint, setHint] = useState("");
  const [checkFailedOnce, setCheckFailedOnce] = useState(false);
  const [finished, setFinished] = useState(false);
  // Zuordnen: gewählte rechte Seite je Zeile
  // Zuordnen: linke Zeile → Index in der gemischten rechten Spalte (Antippen zum Verbinden)
  const [link, setLink] = useState<Record<number, number>>({});
  const [selLeft, setSelLeft] = useState<number | null>(null);
  const [selRight, setSelRight] = useState<number | null>(null);

  const task = list[index];
  const last = index === list.length - 1;
  const rights = useMemo(() => shuffledRights(task), [task]);
  const match: Record<number, string> = Object.fromEntries(Object.entries(link).map(([l, r]) => [l, rights[r]]));
  const allMatched = !!task.pairs?.length && task.pairs.every((_, i) => link[i] !== undefined);
  /** Verbindet linke Zeile l mit rechtem Feld r (eine bestehende Verbindung des rechten Felds wird gelöst). */
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
  const auto = autoCheck(task);
  const answered = results.length > index;
  const ok = results[index];

  function record(right: boolean, self = false, late = false) {
    setResults((r) => [...r.slice(0, index), right]);
    setSelfChecked((r) => [...r.slice(0, index), self]);
    setSecondTry((r) => [...r.slice(0, index), late]);
    if (right) hapticRight();
    else hapticWrong();
  }

  /** Erster Fehler: nochmal versuchen. Zweiter Fehler: Lösung. Offene Aufgaben enden dann in der Selbstkontrolle. */
  function wrongAttempt(feedback = "") {
    setHint(feedback);
    if (status === "retry") {
      if (auto) record(false);
      else setRevealed(true);
      setStatus("open");
    } else {
      setStatus("retry");
      hapticWrong();
    }
  }

  async function submitAnswer(value: string) {
    if (answered || status === "checking" || !value.trim()) return;
    if (isChoice(task)) {
      setPicked(value);
      if (normalize(value) === normalize(task.answer)) record(true, false, status === "retry");
      else {
        setWrongPicks((w) => [...w, value]);
        wrongAttempt();
      }
      return;
    }
    const prev = status;
    setStatus("checking");
    const result = await checkTypedAnswer({ question: task.question, expected: task.answer, accepted: task.acceptedAnswers, given: value, lang, strict: isSpellingContext(title) });
    setStatus(prev);
    if (result.error && !checkFailedOnce) {
      // Prüfung ging nicht (offline, Limit) – beim ersten Mal zählt das nicht als Versuch, danach gilt der Vergleich in der App.
      setCheckFailedOnce(true);
      setHint(t.checkFailed);
      return;
    }
    if (result.correct) {
      setHint(result.feedback);
      record(true, false, prev === "retry");
      setStatus("open");
    } else {
      setHint(result.feedback);
      if (prev === "retry") {
        if (auto) record(false);
        else setRevealed(true);
        setStatus("open");
      } else {
        setStatus("retry");
        hapticWrong();
      }
    }
  }

  /** Zuordnung prüfen: alle Paare richtig → richtig; sonst einmal nochmal versuchen, dann Lösung. */
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
    } else {
      setStatus("retry");
      hapticWrong();
    }
  }

  function giveUp() {
    if (task.type === "zuordnen") setRevealed(true);
    if (auto) record(false);
    else setRevealed(true);
    setStatus("open");
  }

  function next() {
    // Fortschritt sichern, damit man nach einer Pause hier weitermachen kann
    onProgress?.({ kind: "practice", index: index + 1, results, selfChecked, secondTry });
    if (last) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
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
  }

  const correct = results.filter(Boolean).length;
  const missed = list.filter((_, i) => results[i] === false).map((x) => x.question);

  if (finished) {
    const ratio = correct / list.length;
    return (
      <div className="screen" style={{ alignItems: "center", gap: 20, paddingTop: 28 }}>
        <div className="ring">
          <svg aria-hidden="true" width="180" height="180" viewBox="0 0 190 190">
            <circle cx="95" cy="95" r="80" fill="none" stroke="var(--surface-2)" strokeWidth="18" />
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
              const autoRight = results.reduce((sum, r, i) => sum + (r && !selfChecked[i] ? (secondTry[i] ? 0.5 : 1) : 0), 0);
              const selfRight = results.filter((r, i) => r && selfChecked[i]).length;
              const lines: RewardLine[] = [];
              if (autoRight) lines.push({ source: "answer", amount: Math.round(autoRight * POINTS.sheetAnswer) });
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
          <h1 style={{ fontSize: 24, lineHeight: 1.3 }}><MathText text={task.question.replace("___", "______")} /></h1>
        </div>

        {(task.type === "multiple-choice" || task.type === "unterstreichen") && task.options ? (
          <div className="stack">
            {task.options.map((opt) => {
              const tried = wrongPicks.includes(opt);
              const cls = answered && normalize(opt) === normalize(task.answer) ? "option right" : tried || (answered && picked === opt) ? "option wrong" : "option";
              return (
                <button key={opt} type="button" className={cls} style={{ fontSize: 18 }} onClick={() => void submitAnswer(opt)} disabled={answered || tried}>
                  <MathText text={opt} />
                </button>
              );
            })}
          </div>
        ) : task.type === "zuordnen" && task.pairs ? (
          <div className="stack" style={{ gap: 8 }}>
            {answered || revealed ? (
              task.pairs.map((p, i) => {
                const okRow = normalize(match[i] ?? "") === normalize(p.right);
                return (
                  <div key={i} className={okRow ? "pair match ok" : "pair match no"}>
                    <span><MathText text={p.left} /></span>
                    <span className="muted">→</span>
                    <span>{okRow ? <MathText text={p.right} /> : <><s className="muted">{match[i] ?? "–"}</s> <MathText text={p.right} /></>}</span>
                  </div>
                );
              })
            ) : (
              <>
                <p className="muted match-hint">{t.matchTapHint}</p>
                <div className="match-board">
                  <div className="match-col">
                    {task.pairs.map((p, i) => {
                      const r = link[i];
                      const color = r !== undefined ? MATCH_COLORS[i % MATCH_COLORS.length] : undefined;
                      return (
                        <button key={i} type="button" className={`match-item${selLeft === i ? " sel" : ""}${color ? " linked" : ""}`} style={color ? ({ "--mc": color } as CSSProperties) : undefined} aria-pressed={selLeft === i} onClick={() => tapLeft(i)}>
                          <MathText text={p.left} />
                        </button>
                      );
                    })}
                  </div>
                  <div className="match-col">
                    {rights.map((rv, ri) => {
                      const owner = Object.entries(link).find(([, v]) => v === ri);
                      const color = owner ? MATCH_COLORS[Number(owner[0]) % MATCH_COLORS.length] : undefined;
                      return (
                        <button key={ri} type="button" className={`match-item right${selRight === ri ? " sel" : ""}${color ? " linked" : ""}`} style={color ? ({ "--mc": color } as CSSProperties) : undefined} aria-pressed={selRight === ri} onClick={() => tapRight(ri)}>
                          <MathText text={rv} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            {!answered && !revealed && (
              <button type="button" className="btn dark block" disabled={!allMatched} onClick={checkMatch}>
                {status === "retry" ? t.checkAgain : t.check}
              </button>
            )}
          </div>
        ) : (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim()) void submitAnswer(typed);
              else setRevealed(true);
            }}
          >
            <label className="field">
              {t.typeAnswer}
              {task.type === "offen" ? (
                <textarea id="practice-answer" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={answered || revealed || status === "checking"} />
              ) : (
                <input id="practice-answer" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={answered || status === "checking"} autoComplete="off" autoCapitalize="off" />
              )}
            </label>
            {!answered && !revealed && (
              <button type="submit" className="btn dark block" disabled={(auto && !typed.trim()) || status === "checking"}>
                {status === "checking" ? t.checking : !typed.trim() && !auto ? t.showSolution : status === "retry" ? t.checkAgain : t.check}
              </button>
            )}
          </form>
        )}

        {status === "open" && hint && !answered && !revealed && <p className="check-failed" role="status">{hint}</p>}

        {status === "retry" && !answered && !revealed && (
          <div className="feedback retry" role="status">
            <span style={{ fontSize: 18, fontWeight: 900 }}>{t.tryAgain2}</span>
            {hint && <span>{hint}</span>}
          </div>
        )}

        {/* Immer gleich: wer nicht weiterweiß, kann jederzeit die Lösung ansehen (auch vor dem ersten Versuch). */}
        {auto && !answered && !revealed && status !== "checking" && (
          <button type="button" className="btn ghost giveup-btn" onClick={giveUp}>{t.dontKnow}</button>
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

        {answered && (auto || !selfChecked[index]) && (
          <div className={ok ? "feedback ok" : "feedback no"} role="status">
            <span style={{ fontSize: 20, fontWeight: 900 }}>{ok ? t.right : t.wrong(task.answer)}</span>
            {ok && hint && <span style={{ fontWeight: 700 }}>{hint}</span>}
          </div>
        )}

        {answered && (
          <button type="button" className="btn dark block" style={{ marginTop: "auto" }} onClick={next}>
            {last ? t.finish : t.next}
          </button>
        )}
        {answered && (
          <ReportProblem key={`r${index}`} context={{ source: "app-practice", title, question: task.question, expected: task.answer, options: task.options, given: typed.trim() || undefined }} />
        )}
      </div>
    </div>
  );
}
