import { useMemo, useRef, useState } from "react";
import { useT } from "../i18n";
import { MathText } from "../math";
import { Icon } from "../ui";
import { PIXEL_COLORS } from "../brand";
import { PunchIcon } from "../rewards";
import { POINTS, spend, totalPunches, type RewardLine } from "../punches";
import { hapticRight, hapticWin, hapticWrong } from "../feedback";
import { checkTypedAnswer } from "../api";
import { answerHint, isSpellingContext, orderMatches, orderTiles, sentenceMatches, sentenceTiles, splitLanguageNote } from "../answerMatch";
import { TileBoard } from "../TileBoard";
import type { GameResult, Question, QuizOutcome } from "../types";
import type { GameProgress } from "../storage";
import { ReportProblem } from "../ReportProblem";
import { countCorrect, MatchBoard, matchRights } from "../MatchBoard";

type Game = GameResult["game"];
type Q = Question & { difficulty: string; revanche?: boolean };

const BOSS_SIZE = 8;
const BOSS_REVANCHE = 3;

function answerOf(q: Question): string {
  if (q.type === "zuordnen") return (q.pairs ?? []).map((p) => `${p.left} → ${p.right}`).join("; ");
  if (q.type === "reihenfolge") return (q.items ?? []).join(" → ");
  return q.type === "multiple-choice" ? (q.options?.[q.correctIndex ?? 0] ?? "") : (q.correctAnswer ?? "");
}
/** Doppelte Antwortoptionen (kommt bei KI-Fragen vor) nur einmal zeigen – sonst leuchten zwei gleiche Knöpfe auf. */
const optKey = (o: string) => o.trim().replace(/\s+/g, " ").toLowerCase();
function uniqueOptions(options: string[] = []): string[] {
  const seen = new Set<string>();
  return options.filter((o) => {
    const k = optKey(o);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
// Kein Combo-Multiplikator mehr (bewusst entfernt) – "x in Folge" wird nur noch angezeigt.
const comboFactor = (_streak: number, _boss = false) => 1;
/**
 * Sterne nach Trefferquote: im ersten Versuch richtig = 1 Punkt, im zweiten = ½, in der Nachschlag-Runde = ¾, aufgelöst = 0.
 * ab 85 % drei Sterne, ab 60 % zwei, sonst einer – wer ein Level zu Ende spielt, bekommt immer mindestens einen.
 */
const starsFor = (scores: number[]) => {
  const ratio = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  return ratio >= 0.85 ? 3 : ratio >= 0.6 ? 2 : 1;
};

export interface GameOutcome {
  lines: RewardLine[];
  quiz: QuizOutcome;
}

/**
 * Das Lernspiel: Level-Karte mit Sternen (nach Trefferquote, ohne Leben – jedes Level wird zu Ende gespielt), Serie "x in Folge" (ohne Punkte-Multiplikator), Boss-Level am Ende,
 * Joker 50:50 gegen Punches. Beim Verlassen werden die verdienten Punches gemeldet.
 */
export function GameScreen({
  game,
  gameKey,
  initial,
  onProgress,
  onExit,
}: {
  game: Game;
  gameKey: string;
  initial?: GameProgress;
  onProgress?: (p: GameProgress) => void;
  onExit: (o: GameOutcome & { finished: boolean }) => void;
}) {
  const { t } = useT();
  // Fragen, die in den Leveln nicht im ersten Versuch saßen (über Sitzungen hinweg gespeichert).
  const [shaky, setShaky] = useState<string[]>(() => initial?.shaky ?? []);

  // Boss-Runde als Mix: bis zu 3 "Revanche"-Fragen aus den eigenen Fehlern, Rest neue, schwerere Fragen
  // aus der Generierung. Ohne Fehler nur neue Fragen. Ältere Spiele ohne eigene Boss-Fragen: die schwersten aus den Leveln.
  const boss = useMemo<Q[]>(() => {
    const all: Q[] = game.levels.flatMap((l) => l.questions.map((q) => ({ ...q, difficulty: l.difficulty })));
    const revanche = all
      .filter((q, i) => shaky.includes(q.prompt) && all.findIndex((x) => x.prompt === q.prompt) === i)
      .sort(() => Math.random() - 0.5)
      .slice(0, BOSS_REVANCHE)
      .map((q) => ({ ...q, revanche: true }));
    let fresh: Q[];
    if (game.boss?.length) {
      fresh = game.boss.map((q) => ({ ...q, difficulty: "schwer" }));
    } else {
      const rank: Record<string, number> = { schwer: 0, mittel: 1, leicht: 2 };
      fresh = all.filter((q) => !revanche.some((r) => r.prompt === q.prompt)).sort((a, b) => (rank[a.difficulty] ?? 1) - (rank[b.difficulty] ?? 1));
    }
    return [...revanche, ...fresh.slice(0, Math.max(0, BOSS_SIZE - revanche.length))].sort(() => Math.random() - 0.5);
  }, [game, shaky]);

  const [stars, setStars] = useState<number[]>(() => (initial?.stars.length === game.levels.length ? initial.stars : game.levels.map(() => 0)));
  const [bossDone, setBossDone] = useState(initial?.bossDone ?? false);
  const [playing, setPlaying] = useState<number | "boss" | null>(null);
  // Punches aus einer früheren, unterbrochenen Runde wurden schon gutgeschrieben – hier nur Neues sammeln.
  const earned = useRef<{ answer: number; boss: number; correct: number; total: number; missed: string[] }>({ answer: 0, boss: 0, correct: 0, total: 0, missed: [] });

  const unlockedUpTo = stars.findIndex((s) => s === 0); // erstes ungespieltes Level
  const allDone = unlockedUpTo === -1;

  function exit() {
    const e = earned.current;
    const lines: RewardLine[] = [];
    if (e.answer) lines.push({ source: "answer", amount: e.answer });
    if (e.boss) lines.push({ source: "boss", amount: e.boss });
    onExit({ lines, quiz: { correct: e.correct, total: Math.max(e.total, 1), missed: e.missed }, finished: bossDone });
  }

  if (playing !== null) {
    const isBoss = playing === "boss";
    const questions: Q[] = isBoss ? boss : game.levels[playing].questions.map((q) => ({ ...q, difficulty: game.levels[playing].difficulty }));
    return (
      <LevelPlay
        key={String(playing)}
        title={isBoss ? t.bossTitle : game.levels[playing].title}
        gameTitle={game.gameTitle}
        subject={game.subject}
        isBoss={isBoss}
        questions={questions}
        gameKey={gameKey}
        onQuit={() => setPlaying(null)}
        onDone={(r) => {
          const e = earned.current;
          if (isBoss) e.boss += r.points;
          else e.answer += r.points;
          e.correct += r.correct;
          e.total += r.total;
          e.missed.push(...r.missed);
          // Level erneut gespielt: alte Einträge dieses Levels durch die neuen ersetzen.
          const levelPrompts = isBoss ? [] : game.levels[playing].questions.map((q) => q.prompt);
          // Boss: Revanche-Fragen, die jetzt im ersten Versuch saßen, fliegen raus.
          const nextShaky = isBoss
            ? shaky.filter((p) => !boss.some((b) => b.revanche && b.prompt === p) || r.shaky.includes(p))
            : [...shaky.filter((p) => !levelPrompts.includes(p)), ...r.shaky];
          setShaky(nextShaky);
          const nextStars = !isBoss ? stars.map((v, i) => (i === playing ? Math.max(v, r.stars) : v)) : stars;
          const nextBoss = bossDone || isBoss;
          setStars(nextStars);
          setBossDone(nextBoss);
          onProgress?.({ kind: "game", stars: nextStars, bossDone: nextBoss, earned: { ...e, missed: [...e.missed] }, shaky: nextShaky });
          setPlaying(null);
        }}
      />
    );
  }

  // ---------- Level-Karte ----------
  const nodes = [...game.levels.map((l, i) => ({ id: i as number | "boss", title: l.title, sub: t.difficulty[l.difficulty as keyof typeof t.difficulty] ?? l.difficulty })), { id: "boss" as const, title: t.bossTitle, sub: t.bossSub }];
  const totalStars = stars.reduce((a, b) => a + b, 0);

  return (
    <div className="screen game-map">
      <div className="topbar">
        <button type="button" className="iconbtn" onClick={exit} aria-label={t.back}><Icon name="close" size={20} stroke={2.6} /></button>
        <span className="map-stars"><Icon name="star" size={18} /> {totalStars}/{game.levels.length * 3}</span>
      </div>
      <div className="stack" style={{ gap: 4, textAlign: "center", paddingBottom: 8 }}>
        <span className="eyebrow" style={{ justifyContent: "center" }}>{game.subject}</span>
        <h1 className="display" style={{ fontSize: 28 }}>{game.gameTitle}</h1>
      </div>

      <ol className="path">
        {nodes.map((n, i) => {
          const isBoss = n.id === "boss";
          const levelStars = isBoss ? (bossDone ? 3 : 0) : stars[i];
          const locked = isBoss ? !allDone : unlockedUpTo !== -1 && i > unlockedUpTo;
          const current = isBoss ? allDone && !bossDone : i === unlockedUpTo;
          return (
            <li key={String(n.id)} className={`path-node ${i % 2 ? "right" : "left"}`}>
              <span className="path-spacer" />
              <button
                type="button"
                className={`node ${isBoss ? "boss" : ""} ${locked ? "locked" : ""} ${current ? "current" : ""} ${levelStars ? "done" : ""}`}
                disabled={locked}
                onClick={() => setPlaying(n.id)}
                aria-label={`${n.title}${locked ? `, ${t.locked}` : ""}`}
                style={{ ["--c" as string]: isBoss ? "var(--pink)" : PIXEL_COLORS[i % 3] }}
              >
                {locked ? <Icon name="lock" size={24} /> : isBoss ? <Icon name="crown" size={28} /> : <span className="node-num">{i + 1}</span>}
              </button>
              <div className="node-label">
                <b>{n.title}</b>
                <span className="muted">{n.sub}</span>
                <span className="node-stars" aria-label={t.starsAria(levelStars)}>
                  {[0, 1, 2].map((s) => <Icon key={s} name="star" size={14} stroke={2} filled={s < levelStars} />)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="stack" style={{ marginTop: "auto", padding: "16px 0 28px" }}>
        <button type="button" className="btn ghost block" onClick={exit}>{t.finishGame}</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------

function LevelPlay({
  title,
  gameTitle,
  subject,
  isBoss,
  questions,
  gameKey,
  onQuit,
  onDone,
}: {
  title: string;
  gameTitle?: string;
  subject?: string;
  isBoss: boolean;
  questions: Q[];
  gameKey: string;
  onQuit: () => void;
  onDone: (r: { stars: number; mistakes: number; points: number; correct: number; total: number; missed: string[]; shaky: string[] }) => void;
}) {
  const { t, lang } = useT();
  const [index, setIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [typed, setTyped] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  // Antwortstatus der aktuellen Frage: offen → (2. Versuch) → richtig/aufgelöst
  const [status, setStatus] = useState<"open" | "checking" | "retry" | "right" | "revealed">("open");
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [hint, setHint] = useState("");
  const [gaveUp, setGaveUp] = useState(false);
  // Tipp (erster Buchstabe je Wort) bei Lückenfragen: dann halbe Punches, keine Combo
  const [usedHint, setUsedHint] = useState(false);
  const [checkFailedOnce, setCheckFailedOnce] = useState(false);
  // Zuordnen: linke Zeile → Index in der gemischten rechten Spalte
  const [link, setLink] = useState<Record<number, number>>({});
  // Satz bauen / Reihenfolge: angetippte Kärtchen in Reihenfolge
  const [picked, setPicked] = useState<number[]>([]);
  const [fx, setFx] = useState<{ id: number; kind: "right" | "wrong"; gain: number; factor: number } | null>(null);
  const [stats, setStats] = useState({ correct: 0, firstTry: 0, mistakes: 0, missed: [] as string[] });
  const [end, setEnd] = useState(false);
  // Punkte pro Frage (1 / ¾ / ½ / 0) und die Reihenfolge der aktuellen Runde.
  // Nachschlag-Runde: am Levelende kommen die nicht im ersten Versuch gelösten Fragen noch einmal.
  const [scores, setScores] = useState<number[]>(() => questions.map(() => 0));
  const [round, setRound] = useState<number[]>(() => questions.map((_, i) => i));
  const [replay, setReplay] = useState(false);

  const qi = round[index];
  const q = questions[qi];
  const answer = answerOf(q);
  const answered = status === "right" || status === "revealed";
  const ok = status === "right";
  const secondTry = status === "retry";
  const isMatch = q.type === "zuordnen" && (q.pairs?.length ?? 0) >= 2;
  const rights = useMemo(() => (isMatch ? matchRights(q.pairs ?? [], q.prompt) : []), [q, isMatch]);
  const allLinked = isMatch && (q.pairs ?? []).every((_, i) => link[i] !== undefined);
  const tileMode: "sentence" | "order" | null =
    q.type === "satzbau" && (q.correctAnswer ?? "").trim().includes(" ") ? "sentence" : q.type === "reihenfolge" && (q.items?.length ?? 0) >= 2 ? "order" : null;
  const tiles = useMemo(
    () => (tileMode === "sentence" ? sentenceTiles(q.correctAnswer ?? "", q.prompt) : tileMode === "order" ? orderTiles(q.items ?? [], q.prompt) : []),
    [q, tileMode]
  );
  const builtRight = (p: number[]) =>
    tileMode === "sentence" ? sentenceMatches(p.map((i) => tiles[i]).join(" "), q.correctAnswer ?? "", q.acceptedAnswers) : orderMatches(p.map((i) => tiles[i]), q.items ?? []);

  /** Satz bauen / Reihenfolge prüfen: falsch → 2. Versuch, der richtige Anfang bleibt stehen; danach Auflösung. */
  function submitTiles() {
    if (!tileMode || answered || picked.length !== tiles.length) return;
    if (builtRight(picked)) return handle(true);
    if (status !== "retry") {
      const target = tileMode === "order" ? q.items ?? [] : (q.correctAnswer ?? "").trim().replace(/^[¿¡"„“'«]+/, "").replace(/[.!?…"“”'»]+$/, "").split(/\s+/);
      const k = (s: string) => s.trim().toLowerCase();
      let n = 0;
      while (n < picked.length && n < target.length && k(tiles[picked[n]]) === k(target[n])) n++;
      setPicked(picked.slice(0, n));
    }
    handle(false);
  }

  /** Zuordnen prüfen: alles richtig → wie richtige Antwort; sonst 2. Versuch (richtige Paare bleiben stehen),
   *  danach Auflösung mit anteiligen Punches für die richtig verbundenen Paare. */
  function submitMatch() {
    if (!isMatch || answered || !allLinked) return;
    const pairs = q.pairs ?? [];
    const correct = countCorrect(pairs, rights, link);
    if (correct === pairs.length) return handle(true);
    if (status === "retry") {
      const base = POINTS.answer[q.difficulty] ?? 10;
      const part = Math.round(base * 0.5 * (correct / pairs.length) * (isBoss ? POINTS.boss : 1) * (replay ? 0.5 : 1));
      if (part > 0) setPoints((p) => p + part);
    } else {
      // falsche Verbindungen lösen, damit man nur noch die offenen Paare neu verbinden muss
      const keep: Record<number, number> = {};
      pairs.forEach((p, i) => {
        if (link[i] !== undefined && (rights[link[i]] ?? "").trim().toLowerCase() === p.right.trim().toLowerCase()) keep[i] = link[i];
      });
      setLink(keep);
    }
    handle(false);
  }

  function handle(right: boolean, feedback = "") {
    setHint(feedback);
    if (right) {
      const base = POINTS.answer[q.difficulty] ?? 10;
      const firstTry = wrongPicks.length === 0 && status !== "retry" && !usedHint;
      const newStreak = firstTry ? streak + 1 : 0;
      const f = firstTry ? comboFactor(newStreak, isBoss) : 1;
      // im zweiten Versuch halbe Punches, keine Combo
      const gain = Math.round(base * f * (isBoss ? POINTS.boss : 1) * (firstTry ? 1 : 0.5) * (replay ? 0.5 : 1));
      score(firstTry);
      setStreak(newStreak);
      setPoints((p) => p + gain);
      setStats((s) => ({ ...s, correct: s.correct + 1, firstTry: s.firstTry + (firstTry ? 1 : 0), mistakes: s.mistakes + (firstTry ? 0 : 1) }));
      setFx({ id: Date.now(), kind: "right", gain, factor: f });
      setStatus("right");
      hapticRight();
      return;
    }
    setStreak(0);
    setFx({ id: Date.now(), kind: "wrong", gain: 0, factor: 1 });
    hapticWrong();
    if (status === "retry") {
      reveal();
    } else {
      setStatus("retry"); // erster Fehler: nochmal versuchen
    }
  }

  /** Lösung zeigen (zweiter Fehler oder aufgegeben). */
  function reveal() {
    setStats((s) => ({ ...s, mistakes: s.mistakes + 1, missed: [...s.missed, q.prompt] }));
    setStatus("revealed");
  }

  async function submit(value: string) {
    if (answered || status === "checking" || !value.trim()) return;
    if (q.type === "multiple-choice") {
      if (optKey(value) === optKey(answer)) handle(true);
      else {
        setWrongPicks((w) => [...w, value]);
        handle(false);
      }
      return;
    }
    setStatus("checking");
    const prev = status;
    const result = await checkTypedAnswer({ question: q.prompt, expected: answer, accepted: q.acceptedAnswers, given: value, lang, strict: isSpellingContext(`${subject ?? ""} ${gameTitle ?? ""} ${title}`) });
    // Status vor dem Prüfen wiederherstellen, damit handle() den richtigen Versuch erkennt
    setStatus(prev);
    if (result.error && !checkFailedOnce) {
      // Prüfung ging nicht (offline, Limit) – beim ersten Mal zählt das nicht als Versuch.
      // Klappt es auch beim zweiten Mal nicht (z. B. ohne Internet), gilt der Vergleich in der App – sonst hinge man fest.
      setCheckFailedOnce(true);
      setHint(t.checkFailed);
      return;
    }
    if (result.correct) handleAfterCheck(true, result.feedback, prev);
    else handleAfterCheck(false, result.feedback, prev);
  }

  // handle() liest `status` aus dem Render; nach dem await steht dort noch "checking"
  function handleAfterCheck(right: boolean, feedback: string, prev: typeof status) {
    if (prev === "retry") {
      setWrongPicks((w) => (w.length ? w : ["typed"]));
    }
    if (right) {
      const base = POINTS.answer[q.difficulty] ?? 10;
      const firstTry = prev !== "retry";
      const newStreak = firstTry ? streak + 1 : 0;
      const f = firstTry ? comboFactor(newStreak, isBoss) : 1;
      const gain = Math.round(base * f * (isBoss ? POINTS.boss : 1) * (firstTry ? 1 : 0.5) * (replay ? 0.5 : 1));
      score(firstTry);
      setHint(feedback);
      setStreak(newStreak);
      setPoints((p) => p + gain);
      setStats((s) => ({ ...s, correct: s.correct + 1, firstTry: s.firstTry + (firstTry ? 1 : 0), mistakes: s.mistakes + (firstTry ? 0 : 1) }));
      setFx({ id: Date.now(), kind: "right", gain, factor: f });
      setStatus("right");
      hapticRight();
      return;
    }
    setHint(feedback);
    setStreak(0);
    setFx({ id: Date.now(), kind: "wrong", gain: 0, factor: 1 });
    hapticWrong();
    if (prev === "retry") reveal();
    else setStatus("retry");
  }

  function next() {
    if (index === round.length - 1) {
      setEnd(true);
      hapticWin();
      return;
    }
    setIndex((i) => i + 1);
    setTyped("");
    setHidden([]);
    setWrongPicks([]);
    setHint("");
    setGaveUp(false);
    setUsedHint(false);
    setLink({});
    setPicked([]);
    setCheckFailedOnce(false);
    setStatus("open");
    setFx(null);
  }

  // Joker: so viele noch nicht probierte falsche Antworten ausblenden, dass genau 2 Optionen übrig bleiben.
  // Sichtbar bleiben die richtige und eine falsche – ausgeblendet werden also alle übrigen noch nicht probierten falschen.
  const untriedWrong = (q.type === "multiple-choice" ? uniqueOptions(q.options) : []).filter((o) => optKey(o) !== optKey(answer) && !wrongPicks.includes(o));
  const jokerHide = untriedWrong.length - 1;

  function joker() {
    if (answered || hidden.length || jokerHide < 1) return;
    if (!spend(POINTS.joker5050, gameKey)) return;
    setHidden([...untriedWrong].sort(() => Math.random() - 0.5).slice(0, jokerHide));
  }

  function score(firstTry: boolean) {
    const value = replay ? (firstTry ? 0.75 : 0.5) : firstTry ? 1 : 0.5;
    setScores((sc) => sc.map((v, i) => (i === qi ? Math.max(v, value) : v)));
  }

  function startReplay(open: number[]) {
    setRound(open);
    setIndex(0);
    setReplay(true);
    setStreak(0);
    setTyped("");
    setHidden([]);
    setWrongPicks([]);
    setHint("");
    setGaveUp(false);
    setUsedHint(false);
    setLink({});
    setPicked([]);
    setCheckFailedOnce(false);
    setStatus("open");
    setFx(null);
    setEnd(false);
  }

  if (end) {
    const s = starsFor(scores);
    const correctCount = scores.filter((v) => v > 0).length;
    const open = scores.map((v, i) => (v < 1 ? i : -1)).filter((i) => i >= 0);
    const canReplay = !replay && s < 3 && open.length > 0;
    return (
      <div className="screen level-end">
        <div className="stack" style={{ alignItems: "center", textAlign: "center", gap: 14, marginTop: 40 }}>
          <div className="end-stars" aria-label={t.starsAria(s)}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < s ? "on" : ""} style={{ animationDelay: `${0.2 + i * 0.25}s` }}>
                <Icon name="star" size={i === 1 ? 64 : 48} stroke={1.6} filled={i < s} />
              </span>
            ))}
          </div>
          <h1 className="display">{isBoss ? t.bossBeaten : t.levelWon}</h1>
          <p className="muted">{t.levelWonSub(correctCount, questions.length)}</p>
          <div className="end-points"><PunchIcon size={20} /> +{points}</div>
        </div>
        <div className="stack" style={{ marginTop: "auto", gap: 10, paddingBottom: 28 }}>
          {canReplay && (
            <button type="button" className="replay-cta" onClick={() => startReplay(open)}>
              <span className="replay-cta-icon"><Icon name="review" size={22} stroke={2.2} /></span>
              <span className="replay-cta-text">
                <b>{t.replayCta(open.length)}</b>
                <span>{t.replaySub}</span>
              </span>
              <Icon name="chevron" size={18} stroke={2.6} />
            </button>
          )}
          <button
            type="button"
            className={canReplay ? "btn ghost block" : "btn primary block"}
            onClick={() => onDone({ stars: s, mistakes: stats.mistakes, points, correct: correctCount, total: questions.length, missed: questions.filter((_, i) => scores[i] === 0).map((q) => q.prompt), shaky: questions.filter((_, i) => scores[i] < 1).map((q) => q.prompt) })}
          >
            {t.backToMap}
          </button>
        </div>
      </div>
    );
  }

  const canJoker = q.type === "multiple-choice" && jokerHide >= 1 && !answered && !hidden.length;
  return (
    <div className={`screen light play ${isBoss ? "boss-play" : ""}`}>
      <div className="inner" style={{ gap: 18, padding: "16px 0 28px" }}>
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <button type="button" className="iconbtn" onClick={onQuit} aria-label={t.back}><Icon name="close" size={20} stroke={2.6} /></button>
          <div className="progress" aria-hidden="true">
            <div style={{ width: `${Math.round(((index + (answered ? 1 : 0)) / round.length) * 100)}%` }} />
          </div>
        </div>

        <div className="row" style={{ justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: isBoss ? "var(--pink)" : "var(--teal-dark)" }}>{replay ? `${t.replayTitle} · ${title}` : title} · {index + 1}/{round.length}</span>
          {streak > 0 ? (
            <span className="combo c1">{t.inARow(streak)}</span>
          ) : (
            <span />
          )}
        </div>

        <div className={`qcard ${fx?.kind === "wrong" ? "shake" : ""}`} key={`q${replay ? "r" : ""}${index}-${fx?.id ?? 0}`}>
          {q.revanche && <span className="revanche-tag"><Icon name="punch" size={14} stroke={2.2} /> {t.revanche}</span>}
          {(() => {
            const { text, note } = splitLanguageNote(q.prompt);
            return (
              <>
                {note && <h2 className="lang-note">🌐 {note}</h2>}
                <h1 style={{ fontSize: 24, lineHeight: 1.3 }}><MathText text={q.type === "lueckentext" ? text.replace("___", "______") : text} /></h1>
              </>
            );
          })()}
          {fx?.kind === "right" && (
            <>
              <span className="gain">+{fx.gain}</span>
              <span className="burst" aria-hidden="true">
                {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ ["--a" as string]: `${i * 36}deg`, background: PIXEL_COLORS[i % 3] }} />)}
              </span>
            </>
          )}
        </div>

        {q.type === "multiple-choice" ? (
          <div className="stack">
            {uniqueOptions(q.options).map((opt, oi) => {
              if (hidden.includes(opt)) return <div key={`${qi}-${oi}`} className="option gone" aria-hidden="true" />;
              const tried = wrongPicks.includes(opt);
              const cls = answered && optKey(opt) === optKey(answer) ? "option right" : tried ? "option wrong" : "option";
              return (
                <button key={`${qi}-${oi}`} type="button" className={cls} style={{ fontSize: 18 }} onClick={() => void submit(opt)} disabled={answered || tried}>
                  <MathText text={opt} />
                </button>
              );
            })}
          </div>
        ) : tileMode ? (
          <div className="stack">
            <TileBoard mode={tileMode} tiles={tiles} picked={picked} onPick={setPicked} solved={answered} ok={ok} />
            {!answered && (
              <button type="button" className="btn dark block" disabled={picked.length !== tiles.length} onClick={submitTiles}>
                {secondTry ? t.checkAgain : t.check}
              </button>
            )}
          </div>
        ) : isMatch ? (
          <div className="stack">
            <MatchBoard pairs={q.pairs ?? []} rights={rights} link={link} onLink={setLink} solved={answered} />
            {!answered && (
              <button type="button" className="btn dark block" disabled={!allLinked} onClick={submitMatch}>
                {secondTry ? t.checkAgain : t.check}
              </button>
            )}
          </div>
        ) : (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); void submit(typed); }}>
            <label className="field">
              {t.typeAnswer}
              <input id="game-answer" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={answered || status === "checking"} autoComplete="off" autoCapitalize="off" />
            </label>
            {!answered && (
              <button type="submit" className="btn dark block" disabled={!typed.trim() || status === "checking"}>
                {status === "checking" ? t.checking : secondTry ? t.checkAgain : t.check}
              </button>
            )}
          </form>
        )}

        {q.type === "lueckentext" && !answered && (() => {
          const h = isSpellingContext(`${subject ?? ""} ${gameTitle ?? ""} ${title}`) ? null : answerHint(answer);
          if (!h) return null;
          return usedHint ? (
            <div className="hint-box" role="status">
              <span><b>{t.hintLabel}</b> <span className="hint-word">{h}</span></span>
              <small>{t.hintNote}</small>
            </div>
          ) : status !== "checking" ? (
            <button type="button" className="btn ghost small hint-btn" onClick={() => setUsedHint(true)}>{t.hintBtn}</button>
          ) : null;
        })()}

        {status === "open" && hint && <p className="check-failed" role="status">{hint}</p>}

        {secondTry && (
          <div className="feedback retry" role="status">
            <span style={{ fontSize: 18, fontWeight: 900 }}>{t.tryAgain2}</span>
            {hint && <span>{hint}</span>}
          </div>
        )}

        {/* Immer gleich: wer nicht weiterweiß, kann jederzeit die Lösung ansehen (zählt 0 Punkte, kommt in der Nachschlag-Runde wieder). */}
        {!answered && status !== "checking" && (
          <button type="button" className="btn ghost giveup-btn" onClick={() => { setGaveUp(true); setStreak(0); reveal(); }}>{t.dontKnow}</button>
        )}

        {/* Joker kostet Punches – Preis als eigener Chip mit Minus, damit klar ist, dass etwas abgezogen wird. */}
        {canJoker && (() => {
          const tooFew = totalPunches() < POINTS.joker5050;
          return (
            <button type="button" className="joker" onClick={joker} disabled={tooFew}>
              <span className="joker-text">
                <b>{t.jokerName}</b>
                <small>{tooFew ? t.jokerTooFew(POINTS.joker5050) : t.jokerWhat}</small>
              </span>
              <span className="joker-cost">−{POINTS.joker5050} <PunchIcon size={12} /></span>
            </button>
          );
        })()}
        {hidden.length > 0 && !answered && <p className="joker-used">{t.jokerUsed(POINTS.joker5050)}</p>}

        {answered && (
          <div className={ok ? "feedback ok" : "feedback no"} role="status">
            <span style={{ fontSize: 20, fontWeight: 900 }}>{ok ? t.right : isMatch ? t.matchSolved : tileMode === "sentence" ? t.sentenceSolution(answer) : tileMode === "order" ? `${t.orderSolution} ${answer}` : gaveUp ? t.solutionIs(answer) : t.wrong(answer)}</span>
            {ok && hint && <span style={{ fontWeight: 700 }}>{hint}</span>}
            <span>{q.explanation}</span>
          </div>
        )}

        {answered && (
          <button type="button" className="btn dark block" style={{ marginTop: "auto" }} onClick={next}>
            {index === round.length - 1 ? t.finish : t.next}
          </button>
        )}
        {answered && (
          <ReportProblem
            key={`r${replay ? "r" : ""}${index}`}
            context={{ source: "app-game", title: gameTitle, subject, level: title, question: q.prompt, expected: answer, options: q.type === "multiple-choice" ? q.options : q.acceptedAnswers, given: q.type === "multiple-choice" ? wrongPicks[wrongPicks.length - 1] : typed.trim() || undefined }}
          />
        )}
      </div>
    </div>
  );
}
