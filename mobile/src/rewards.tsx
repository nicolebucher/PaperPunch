import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { deviceLang, LangProvider, useT } from "./i18n";
import { loadProfile } from "./storage";
import { BrandMark, PIXEL_COLORS } from "./brand";
import { Icon } from "./ui";
import { LEVELS, levelFor, recentEntries, totalPunches, weekPunches, type Reward } from "./punches";

// Belohnungs-Anzeige: Punches-Zähler oben, Abrechnung nach einer Einheit, Level-Aufstieg, Level-Seite.

const RewardContext = createContext<(reward: Reward, then?: () => void) => void>(() => {});
export const useShowReward = () => useContext(RewardContext);

/** Pixel-Symbol für Punches. */
export function PunchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 16 16">
      <rect x="1" y="1" width="6" height="6" fill="#1FD6EA" />
      <rect x="9" y="1" width="6" height="6" fill="#F23A8E" />
      <rect x="5" y="9" width="6" height="6" fill="#A8E43A" />
    </svg>
  );
}

/** Zähler mit Fortschrittsring zum nächsten Level – auf der Startseite oben. */
export function PunchPill({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  const total = totalPunches();
  const lvl = levelFor(total);
  const deg = Math.round(lvl.progress * 360);
  return (
    <button type="button" className="punch-pill" onClick={onClick} aria-label={t.levelAria(lvl.number, total)}>
      <span className="punch-ring" style={{ background: `conic-gradient(var(--teal) ${deg}deg, var(--surface-2) ${deg}deg)` }}>
        <span>{lvl.number}</span>
      </span>
      <PunchIcon />
      <span className="punch-num">{total.toLocaleString()}</span>
    </button>
  );
}

function useCountUp(from: number, to: number, ms = 900) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to, ms]);
  return value;
}

function LevelBar({ total }: { total: number }) {
  const lvl = levelFor(total);
  const cells = 12;
  const filled = Math.floor(lvl.progress * cells);
  return (
    <div className="lvlbar" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <span key={i} style={{ background: i < filled ? PIXEL_COLORS[i % 3] : undefined }} />
      ))}
    </div>
  );
}

function RewardOverlay({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  const { t, lang } = useT();
  const [phase, setPhase] = useState<"sum" | "levelup">("sum");
  const shown = useCountUp(0, reward.total);
  const runningTotal = useCountUp(reward.before, reward.after, 1200);
  const lvlAfter = levelFor(reward.after);

  if (phase === "levelup") {
    return (
      <div className="reward-backdrop levelup" role="dialog" aria-label={t.levelUpTitle}>
        <div className="levelup-burst" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ ["--a" as string]: `${i * 20}deg`, background: PIXEL_COLORS[i % 3] }} />)}
        </div>
        <BrandMark mode="intro" className="levelup-mark" stroke="#FFFFFF" />
        <span className="eyebrow">{t.levelUpTitle}</span>
        <h1 className="display levelup-name">{lvlAfter.current.name[lang]}</h1>
        <p className="muted">{t.levelNumber(lvlAfter.number)}</p>
        <button type="button" className="btn primary block" style={{ marginTop: 24 }} onClick={onClose}>{t.great}</button>
      </div>
    );
  }

  return (
    <div className="reward-backdrop" role="dialog" aria-label={t.rewardTitle}>
      <div className="reward-card">
        <span className="eyebrow"><PunchIcon /> {t.rewardTitle}</span>
        <div className="reward-big">+{shown}</div>
        {reward.total === 0 ? (
          <p className="muted" style={{ textAlign: "center" }}>{t.rewardRepeat}</p>
        ) : (
          <ul className="reward-lines">
            {mergeLines(reward).map((l) => (
              <li key={l.source}>
                <span>{t.punchSources[l.source]}</span>
                <b>{l.amount > 0 ? "+" : ""}{l.amount}</b>
              </li>
            ))}
          </ul>
        )}
        <div className="stack" style={{ gap: 6 }}>
          <div className="row" style={{ justifyContent: "space-between", fontWeight: 800, fontSize: 14 }}>
            <span>{levelFor(runningTotal).current.name[lang]}</span>
            <span className="muted">{runningTotal.toLocaleString()} <PunchIcon size={12} /></span>
          </div>
          <LevelBar total={runningTotal} />
          {lvlAfter.next && <span className="muted" style={{ fontSize: 13 }}>{t.toNextLevel(lvlAfter.toNext, lvlAfter.next.name[lang])}</span>}
        </div>
        <button type="button" className="btn primary block" onClick={() => (reward.levelUp ? setPhase("levelup") : onClose())}>
          {t.next}
        </button>
      </div>
    </div>
  );
}

function mergeLines(reward: Reward) {
  const map = new Map<string, { source: Reward["lines"][number]["source"]; amount: number }>();
  for (const l of reward.lines) {
    const k = l.source === "selfcheck" ? "answer" : l.source;
    const prev = map.get(k);
    map.set(k, { source: k as typeof l.source, amount: (prev?.amount ?? 0) + l.amount });
  }
  return [...map.values()];
}

export function RewardProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<{ reward: Reward; then?: () => void } | null>(null);
  return (
    <RewardContext.Provider value={(reward, then) => setQueue({ reward, then })}>
      {children}
      {/* Der Provider liegt außerhalb der App-Sprache – deshalb die Sprache hier aus dem Profil holen. */}
      {queue && (
        <LangProvider lang={loadProfile()?.lang ?? deviceLang()}>
          <RewardOverlay
            key={queue.reward.after}
            reward={queue.reward}
            onClose={() => {
              const then = queue.then;
              setQueue(null);
              then?.();
            }}
          />
        </LangProvider>
      )}
    </RewardContext.Provider>
  );
}

/** Level-Seite: Titel, Punches, Woche, alle Stufen, letzte Einträge. */
export function LevelScreen({ onBack }: { onBack: () => void }) {
  const { t, lang } = useT();
  const total = totalPunches();
  const lvl = levelFor(total);
  const recent = recentEntries(10);
  return (
    <div className="screen">
      <div className="topbar">
        <button type="button" className="iconbtn" onClick={onBack} aria-label={t.back}><Icon name="back" /></button>
        <span />
      </div>
      <div className="stack" style={{ gap: 20, paddingBottom: 28 }}>
        <div className="stack" style={{ alignItems: "center", textAlign: "center", gap: 6 }}>
          <BrandMark mode="float" className="level-mark" />
          <span className="eyebrow">{t.levelNumber(lvl.number)}</span>
          <h1 className="display">{lvl.current.name[lang]}</h1>
          <span className="reward-big" style={{ fontSize: 40 }}><PunchIcon size={22} /> {total.toLocaleString()}</span>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <LevelBar total={total} />
          {lvl.next ? <span className="muted" style={{ fontSize: 14 }}>{t.toNextLevel(lvl.toNext, lvl.next.name[lang])}</span> : <span className="muted">{t.maxLevel}</span>}
        </div>
        <div className="grid2">
          <div className="card"><span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{t.thisWeek}</span><b style={{ fontSize: 24 }}>+{weekPunches()}</b></div>
          <div className="card"><span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{t.levelLabel}</span><b style={{ fontSize: 24 }}>{lvl.number}/10</b></div>
        </div>

        <div className="stack" style={{ gap: 8 }}>
          <span className="eyebrow">{t.allLevels}</span>
          {LEVELS.map((l, i) => (
            <div key={l.at} className={i <= lvl.index ? "lvl-row reached" : "lvl-row"}>
              <span className="lvl-num">{i + 1}</span>
              <span className="grow">{l.name[lang]}</span>
              <span className="muted" style={{ fontSize: 13 }}>{l.at.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {recent.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            <span className="eyebrow">{t.recentPunches}</span>
            {recent.map((e, i) => (
              <div key={i} className="row" style={{ justifyContent: "space-between", fontSize: 15 }}>
                <span className="muted">{t.punchSources[e.source]}</span>
                <b style={{ color: e.amount < 0 ? "var(--pink)" : "var(--teal)" }}>{e.amount > 0 ? "+" : ""}{e.amount}</b>
              </div>
            ))}
          </div>
        )}
        <p className="muted" style={{ fontSize: 13 }}>{t.punchesHowto}</p>
      </div>
    </div>
  );
}
