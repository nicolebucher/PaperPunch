import { useMemo, useRef, useState } from "react";
import { useT } from "../i18n";
import { Icon } from "../ui";
import { PIXEL_COLORS } from "../brand";
import { PunchIcon } from "../rewards";
import { POINTS, spend, totalPunches, type RewardLine } from "../punches";
import { hapticRight, hapticWin, hapticWrong } from "../feedback";
import type { GameResult, Question, QuizOutcome } from "../types";

type Game = GameResult["game"];
type Q = Question & { difficulty: string };

const LIVES = 3;
const BOSS_SIZE = 8;

function answerOf(q: Question): string {
  return q.type === "multiple-choice" ? (q.options?.[q.correctIndex ?? 0] ?? "") : (q.correctAnswer ?? "");
}
const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?]$/, "");
const comboFactor = (streak: number) => (streak >= 9 ? 4 : streak >= 6 ? 3 : streak >= 3 ? 2 : 1);
const starsFor = (mistakes: number) => (mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1);

export interface GameOutcome {
  lines: RewardLine[];
  quiz: QuizOutcome;
}

/**
 * Das Lernspiel: Level-Karte mit Sternen, 3 Leben pro Level, Combo-Multiplikator, Boss-Level am Ende,
 * Joker 50:50 gegen Punches. Beim Verlassen werden die verdienten Punches gemeldet.
 */
export function GameScreen({ game, gameKey, onExit }: { game: Game; gameKey: string; onExit: (o: GameOutcome) => void }) {
  const { t } = useT();
  // Boss: die schwersten Fragen aus allen Leveln, gemischt
  const boss = useMemo<Q[]>(() => {
    const all = game.levels.flatMap((l) => l.questions.map((q) => ({ ...q, difficulty: l.difficulty })));
    const rank: Record<string, number> = { schwer: 0, mittel: 1, leicht: 2 };
    return [...all].sort((a, b) => (rank[a.difficulty] ?? 1) - (rank[b.difficulty] ?? 1)).slice(0, BOSS_SIZE).sort(() => Math.random() - 0.5);
  }, [game]);

  const [stars, setStars] = useState<number[]>(() => game.levels.map(() => 0));
  const [bossDone, setBossDone] = useState(false);
  const [playing, setPlaying] = useState<number | "boss" | null>(null);
  const earned = useRef<{ answer: number; boss: number; correct: number; total: number; missed: string[] }>({ answer: 0, boss: 0, correct: 0, total: 0, missed: [] });

  const unlockedUpTo = stars.findIndex((s) => s === 0); // erstes ungespieltes Level
  const allDone = unlockedUpTo === -1;

  function exit() {
    const e = earned.current;
    const lines: RewardLine[] = [];
    if (e.answer) lines.push({ source: "answer", amount: e.answer });
    if (e.boss) lines.push({ source: "boss", amount: e.boss });
    onExit({ lines, quiz: { correct: e.correct, total: Math.max(e.total, 1), missed: e.missed } });
  }

  if (playing !== null) {
    const isBoss = playing === "boss";
    const questions: Q[] = isBoss ? boss : game.levels[playing].questions.map((q) => ({ ...q, difficulty: game.levels[playing].difficulty }));
    return (
      <LevelPlay
        key={String(playing)}
        title={isBoss ? t.bossTitle : game.levels[playing].title}
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
          if (r.won) {
            if (isBoss) setBossDone(true);
            else setStars((s) => s.map((v, i) => (i === playing ? Math.max(v, starsFor(r.mistakes)) : v)));
          }
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
  isBoss,
  questions,
  gameKey,
  onQuit,
  onDone,
}: {
  title: string;
  isBoss: boolean;
  questions: Q[];
  gameKey: string;
  onQuit: () => void;
  onDone: (r: { won: boolean; mistakes: number; points: number; correct: number; total: number; missed: string[] }) => void;
}) {
  const { t } = useT();
  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [fx, setFx] = useState<{ id: number; kind: "right" | "wrong"; gain: number; factor: number } | null>(null);
  const [stats, setStats] = useState({ correct: 0, mistakes: 0, missed: [] as string[] });
  const [end, setEnd] = useState<"won" | "lost" | null>(null);

  const q = questions[index];
  const answer = answerOf(q);
  const answered = picked !== null;
  const ok = answered && normalize(picked) === normalize(answer);
  const factor = comboFactor(streak);

  function submit(value: string) {
    if (answered || !value.trim()) return;
    setPicked(value);
    const right = normalize(value) === normalize(answer);
    if (right) {
      const base = POINTS.answer[q.difficulty] ?? 10;
      const newStreak = streak + 1;
      const f = comboFactor(newStreak);
      const gain = base * f * (isBoss ? POINTS.boss : 1);
      setStreak(newStreak);
      setPoints((p) => p + gain);
      setStats((s) => ({ ...s, correct: s.correct + 1 }));
      setFx({ id: Date.now(), kind: "right", gain, factor: f });
      hapticRight();
    } else {
      setStreak(0);
      setLives((l) => l - 1);
      setStats((s) => ({ ...s, mistakes: s.mistakes + 1, missed: [...s.missed, q.prompt] }));
      setFx({ id: Date.now(), kind: "wrong", gain: 0, factor: 1 });
      hapticWrong();
    }
  }

  function next() {
    if (lives <= 0) {
      setEnd("lost");
      return;
    }
    if (index === questions.length - 1) {
      setEnd("won");
      hapticWin();
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    setTyped("");
    setHidden([]);
    setFx(null);
  }

  function joker() {
    if (answered || q.type !== "multiple-choice" || !q.options || q.options.length < 3 || hidden.length) return;
    if (!spend(POINTS.joker5050, gameKey)) return;
    const wrong = q.options.filter((o) => o !== answer).sort(() => Math.random() - 0.5);
    setHidden(wrong.slice(0, Math.max(1, q.options.length - 2)));
  }

  if (end) {
    const won = end === "won";
    const s = won ? starsFor(stats.mistakes) : 0;
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
          <h1 className="display">{won ? (isBoss ? t.bossBeaten : t.levelWon) : t.levelLost}</h1>
          <p className="muted">{won ? t.levelWonSub(stats.correct, questions.length) : t.levelLostSub}</p>
          <div className="end-points"><PunchIcon size={20} /> +{points}</div>
        </div>
        <div className="stack" style={{ marginTop: "auto", gap: 10, paddingBottom: 28 }}>
          {!won && (
            <button
              type="button"
              className="btn primary block"
              onClick={() => onDone({ won: false, mistakes: stats.mistakes, points, correct: stats.correct, total: index + 1, missed: stats.missed })}
            >
              {t.backToMap}
            </button>
          )}
          {won && (
            <button
              type="button"
              className="btn primary block"
              onClick={() => onDone({ won: true, mistakes: stats.mistakes, points, correct: stats.correct, total: questions.length, missed: stats.missed })}
            >
              {t.backToMap}
            </button>
          )}
        </div>
      </div>
    );
  }

  const canJoker = q.type === "multiple-choice" && (q.options?.length ?? 0) >= 3 && !answered && !hidden.length;
  return (
    <div className={`screen light play ${isBoss ? "boss-play" : ""}`}>
      <div className="inner" style={{ gap: 18, padding: "16px 0 28px" }}>
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <button type="button" className="iconbtn" onClick={onQuit} aria-label={t.back}><Icon name="close" size={20} stroke={2.6} /></button>
          <div className="progress" aria-hidden="true">
            <div style={{ width: `${Math.round(((index + (answered ? 1 : 0)) / questions.length) * 100)}%` }} />
          </div>
          <span className="lives" aria-label={t.livesAria(lives)}>
            {Array.from({ length: LIVES }, (_, i) => <i key={i} className={i < lives ? "on" : ""} style={{ background: i < lives ? PIXEL_COLORS[i] : undefined }} />)}
          </span>
        </div>

        <div className="row" style={{ justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: isBoss ? "var(--pink)" : "var(--teal-dark)" }}>{title} · {index + 1}/{questions.length}</span>
          {streak > 0 ? (
            <span className={`combo c${factor}`} key={factor}>{factor > 1 ? `×${factor} ${t.combo}` : t.inARow(streak)}</span>
          ) : (
            <span />
          )}
        </div>

        <div className={`qcard ${fx?.kind === "wrong" ? "shake" : ""}`} key={`q${index}-${fx?.id ?? 0}`}>
          <h1 style={{ fontSize: 24, lineHeight: 1.3 }}>{q.type === "lueckentext" ? q.prompt.replace("___", "______") : q.prompt}</h1>
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
            {(q.options ?? []).map((opt) => {
              if (hidden.includes(opt)) return <div key={opt} className="option gone" aria-hidden="true" />;
              const cls = answered && opt === answer ? "option right" : picked === opt ? "option wrong" : "option";
              return (
                <button key={opt} type="button" className={cls} style={{ fontSize: 18 }} onClick={() => submit(opt)} disabled={answered}>
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); submit(typed); }}>
            <label className="field">
              {t.typeAnswer}
              <input id="game-answer" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={answered} autoComplete="off" autoCapitalize="off" />
            </label>
            {!answered && <button type="submit" className="btn dark block" disabled={!typed.trim()}>{t.check}</button>}
          </form>
        )}

        {canJoker && (
          <button type="button" className="joker" onClick={joker} disabled={totalPunches() < POINTS.joker5050}>
            50:50 · <PunchIcon size={12} /> {POINTS.joker5050}
          </button>
        )}

        {answered && (
          <div className={ok ? "feedback ok" : "feedback no"} role="status">
            <span style={{ fontSize: 20, fontWeight: 900 }}>{ok ? t.right : t.wrong(answer)}</span>
            <span>{q.explanation}</span>
          </div>
        )}

        {answered && (
          <button type="button" className="btn dark block" style={{ marginTop: "auto" }} onClick={next}>
            {lives <= 0 ? t.seeResult : index === questions.length - 1 ? t.finish : t.next}
          </button>
        )}
      </div>
    </div>
  );
}
