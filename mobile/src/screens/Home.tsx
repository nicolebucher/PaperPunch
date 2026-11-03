import { useState, type CSSProperties } from "react";
import { useT } from "../i18n";
import { Beta, Icon } from "../ui";
import { levelFor, POINTS, totalPunches } from "../punches";
import { inviteShares } from "../invite";
import { daysBetween, todayISO } from "../dates";
import type { ActivePlan } from "../types";
import type { StoredMaterial } from "../storage";
import { isResumable, materialDate, materialStatus, materialTitle } from "./materialInfo";
import { challengePctOf, savedNickname, sendChallenge } from "../challenge";

/**
 * Startseite Design 3b "Bento": Begrüßung nach Tageszeit, große Foto-Kachel, darunter Lernplan- und
 * Level-Kachel, dann "Weitermachen". Beim ersten Start stehen statt Inhalten Einladungen da
 * (Lernplan erstellen, Level 1, Themen zum Antippen). Hell/dunkel über die Theme-Variablen.
 */
export function Home({
  plans,
  materials = [],
  onOpenMaterial,
  onAllMaterials,
  onQuick,
  onTopic,
  onNewGame,
  say,
  onOpenPlan,
  onNewPlan,
  onSettings,
  onLevels,
  onInvite,
}: {
  plans: ActivePlan[];
  materials?: StoredMaterial[];
  onOpenMaterial?: (m: StoredMaterial) => void;
  onAllMaterials?: () => void;
  onQuick: () => void;
  onTopic?: (topic: string) => void;
  onNewGame?: () => void;
  say?: (msg: string) => void;
  onOpenPlan: (planId: string) => void;
  onNewPlan: () => void;
  onSettings: () => void;
  onLevels: () => void;
  onInvite?: () => void;
}) {
  const { t, lang } = useT();
  const today = todayISO();

  // Laufende Pläne nach Testdatum; vorbei ist vorbei.
  const running = plans
    .filter((p) => daysBetween(today, p.goal.testDate) > 0)
    .sort((a, b) => daysBetween(today, a.goal.testDate) - daysBetween(today, b.goal.testDate));
  const plan = running[0];

  // "Weitermachen": zuerst angefangenes Material, danach die zuletzt genutzten – höchstens drei.
  const resumable = materials.filter(isResumable).sort((a, b) => b.updatedAt - a.updatedAt);
  const rest = materials.filter((m) => !isResumable(m)).sort((a, b) => b.updatedAt - a.updatedAt);
  const items = [...resumable, ...rest].slice(0, 3);

  const firstStart = materials.length === 0 && plans.length === 0;
  const hour = new Date().getHours();
  const greeting = firstStart ? t.homeStart : hour < 11 ? t.greetMorning : hour < 18 ? t.greetDay : t.greetEvening;
  const dateLabel = new Date().toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" });

  const total = totalPunches();
  const lvl = levelFor(total);
  const inviteBonus = inviteShares() === 0;
  const [challengeOpen, setChallengeOpen] = useState(false);

  return (
    <div className="screen home home-b">
      <header className="home-b-head">
        <div className="home-b-greet">
          <span className="home-b-date">{dateLabel}</span>
          <h1 className="home-b-hello">{greeting}</h1>
        </div>
        <button type="button" className="home-b-profile" onClick={onSettings} aria-label={t.settings}>
          <Icon name="user" size={18} stroke={2} />
        </button>
      </header>

      <div className="home-b-grid">
        <button type="button" className="home-b-photo" onClick={onQuick}>
          <span className="home-b-photo-top">
            <span className="home-b-photo-icon"><Icon name="camera" size={22} stroke={2.2} /></span>
            <span className="home-b-photo-time">{t.homeCtaTime}</span>
          </span>
          <span className="home-b-photo-text">
            <span className="home-b-photo-title">{t.homeCta}</span>
            <span className="home-b-photo-sub">{firstStart ? t.homeCtaSubFirst : t.homeCtaSub}</span>
          </span>
          <span className="home-b-pixels" aria-hidden="true">
            <i className="c1" /><i /><i className="c2" /><i /><i className="c3" /><i className="c4" />
          </span>
        </button>

        {plan ? (
          <PlanTile plan={plan} today={today} onClick={() => onOpenPlan(plan.id)} />
        ) : (
          <button type="button" className="home-b-tile home-b-tile-new" onClick={onNewPlan}>
            <span className="home-b-tile-top">
              <span className="home-b-plus"><Icon name="plus" size={18} stroke={2.4} /></span>
              <Beta />
            </span>
            <span className="home-b-tile-title">{t.createPlan}</span>
            <span className="home-b-tile-sub">{t.planNewSub}</span>
          </button>
        )}

        <button type="button" className="home-b-tile" onClick={onLevels} aria-label={t.levelAria(lvl.number, total)}>
          <span className="home-b-tile-label">{t.levelNumber(lvl.number)}</span>
          <span
            className="home-b-ring"
            style={{ "--p": `${total === 0 ? 0 : Math.round(lvl.progress * 100)}%` } as CSSProperties}
          >
            <span>{total === 0 ? 0 : `${Math.round(lvl.progress * 100)}%`}</span>
          </span>
          {total === 0 ? (
            <span className="home-b-tile-foot">{t.collectPunches}<br /><span className="muted">{t.collectPunchesSub}</span></span>
          ) : (
            <span className="home-b-tile-foot">
              {t.punchesCount(total)}
              <br />
              <span className="muted">{lvl.next ? t.toLevelN(lvl.toNext, lvl.number + 1) : lvl.current.name[lang]}</span>
            </span>
          )}
        </button>

        {items.length > 0 ? (
          <section className="home-b-card">
            <div className="home-b-card-head">
              <h2>{t.continueLabel}</h2>
              {onAllMaterials && (
                <button type="button" className="link-btn" onClick={onAllMaterials}>{t.allCount(materials.length)}</button>
              )}
            </div>
            {items.map((m, i) => (
              <div key={m.id} className="stack" style={{ gap: 0 }}>
                {i > 0 && <span className="home-b-sep" />}
                <MaterialRow m={m} onClick={() => onOpenMaterial?.(m)} />
              </div>
            ))}
          </section>
        ) : (
          <section className="home-b-card">
            <h2>{t.tryTopic}</h2>
            <div className="home-b-chips">
              {t.ideas.slice(0, 4).map((idea) => (
                <button key={idea} type="button" className="home-b-chip" onClick={() => onTopic?.(idea)}>{idea}</button>
              ))}
            </div>
            <span className="home-b-note">{t.tryTopicSub}</span>
          </section>
        )}
      </div>

      <div className="home-b-bottom">
        {onInvite && (
          <button type="button" className="home-b-invite" onClick={onInvite}>
            {inviteBonus ? `${t.inviteShort} · +${POINTS.invite}` : t.inviteFriends}
          </button>
        )}
        <button type="button" className="home-b-challenge" onClick={() => setChallengeOpen(true)}>
          <Icon name="punch" size={20} stroke={2} /> {t.challengeShort}
        </button>
      </div>

      {challengeOpen && (
        <ChallengeSheet
          games={materials.filter((m) => m.result.format === "game").sort((a, b) => b.updatedAt - a.updatedAt)}
          onClose={() => setChallengeOpen(false)}
          onNewGame={() => { setChallengeOpen(false); onNewGame?.(); }}
          say={say}
        />
      )}
    </div>
  );
}

function PlanTile({ plan, today, onClick }: { plan: ActivePlan; today: string; onClick: () => void }) {
  const { t } = useT();
  const daysLeft = daysBetween(today, plan.goal.testDate);
  const todayIndex = daysBetween(plan.startDate, today);
  const open = plan.sessions.filter((s) => s.dayIndex === todayIndex && !plan.done.includes(s.id));
  return (
    <button type="button" className="home-b-tile" onClick={onClick} aria-label={`${plan.plan.title}, ${t.homePlanActive(daysLeft)}`}>
      <span className="home-b-tile-top">
        <span className="home-b-tile-label">{t.planLabel}</span>
        <Beta />
      </span>
      <span className="home-b-days"><b>{daysLeft}</b><span>{daysLeft === 1 ? t.dayOne : t.daysShort}</span></span>
      <span className="home-b-tile-foot">
        <span className="home-b-clip">{plan.plan.title}</span>
        <span className={open.length ? "home-b-clip home-b-accent" : "home-b-clip muted"}>
          {open.length ? `${t.today}: ${open[0].title}` : t.planDoneToday}
        </span>
      </span>
    </button>
  );
}

function MaterialRow({ m, onClick }: { m: StoredMaterial; onClick: () => void }) {
  const { t, lang } = useT();
  const p = m.progress;
  const r = m.result;
  let done = 0;
  let total = 0;
  if (r.format === "worksheet" || r.format === "test") {
    total = r.data.tasks.length;
    done = p?.kind === "practice" ? Math.min(p.index, total) : 0;
  } else if (r.format === "game") {
    total = r.game.levels.length + 1; // + Boss-Level
    done = p?.kind === "game" ? p.stars.filter((x) => x > 0).length + (p.bossDone ? 1 : 0) : 0;
  }
  if (m.finished) done = total;
  const ratio = total ? done / total : 0;
  return (
    <button type="button" className="home-b-row" onClick={onClick} aria-label={`${materialTitle(m)}, ${materialStatus(m, t)}`}>
      <span className="home-b-row-top">
        <span className="material-title">{materialTitle(m)}</span>
        {m.finished ? (
          <span className="home-b-done"><Icon name="check" size={16} stroke={2.8} /></span>
        ) : (
          total > 0 && <span className="home-b-count">{done}/{total}</span>
        )}
      </span>
      {total > 0 && (
        <span className="home-b-bar"><span style={{ width: `${Math.round(ratio * 100)}%` }} /></span>
      )}
      <span className="material-sub">{t.formats[m.result.format]} · {materialDate(m, t, lang)}</span>
    </button>
  );
}

/** Auswahl fürs Herausfordern: neues Lernspiel oder eines der eigenen, Spitzname, Link teilen. */
function ChallengeSheet({ games, onClose, onNewGame, say }: { games: StoredMaterial[]; onClose: () => void; onNewGame: () => void; say?: (msg: string) => void }) {
  const { t, lang } = useT();
  const [picked, setPicked] = useState(games[0]?.id ?? "");
  const [name, setName] = useState(savedNickname);
  const [busy, setBusy] = useState(false);
  const chosen = games.find((g) => g.id === picked);

  async function share() {
    if (!chosen || chosen.result.format !== "game" || busy) return;
    setBusy(true);
    try {
      const outcome = await sendChallenge(chosen.result.game, name, challengePctOf(chosen), lang, t);
      if (outcome === "copied") say?.(t.inviteCopied);
      if (outcome !== "cancelled") onClose();
    } catch {
      say?.(t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet home-b-sheet" role="dialog" aria-label={t.challengeOpt}>
        <span className="home-b-grab" aria-hidden="true" />
        {games.length === 0 ? (
          <div className="home-b-sheet-empty">
            <span className="home-b-sheet-badge"><Icon name="punch" size={34} stroke={2} /></span>
            <h2>{t.challengeEmptyTitle}</h2>
            <p>{t.challengeEmptyText}</p>
            <button type="button" className="btn primary block" onClick={onNewGame}><Icon name="camera" size={20} /> {t.challengeNewGame}</button>
            <button type="button" className="link-btn muted-link" onClick={onClose}>{t.later}</button>
          </div>
        ) : (
          <>
            <div className="stack" style={{ gap: 4 }}>
              <h2>{t.challengeOpt}</h2>
              <p className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{t.challengePickText}</p>
            </div>
            <div className="home-b-games">
              <button type="button" className="home-b-game new" onClick={onNewGame}>
                <span className="home-b-game-icon"><Icon name="plus" size={20} stroke={2.4} /></span>
                <span className="home-b-game-text"><b>{t.challengeNewGame}</b><span>{t.challengeNewGameSub}</span></span>
                <Icon name="chevron" size={18} stroke={2.6} />
              </button>
              {games.slice(0, 6).map((g) => {
                const pct = challengePctOf(g);
                const on = g.id === picked;
                return (
                  <button key={g.id} type="button" className={on ? "home-b-game on" : "home-b-game"} aria-pressed={on} onClick={() => setPicked(g.id)}>
                    <span className="home-b-game-icon"><Icon name="game" size={20} stroke={2} /></span>
                    <span className="home-b-game-text">
                      <b>{materialTitle(g)}</b>
                      <span>{pct !== undefined ? t.challengeYourScore(pct) : t.challengeNotPlayed}</span>
                    </span>
                    <span className="ob-opt-mark">{on && <Icon name="check" size={15} stroke={3} />}</span>
                  </button>
                );
              })}
            </div>
            <label className="field">
              {t.nickname}
              <input className="input set" value={name} maxLength={20} placeholder={t.nicknamePh} onChange={(e) => setName(e.target.value)} />
            </label>
            <button type="button" className="btn primary block" disabled={!chosen || busy} onClick={() => void share()}>
              <Icon name="share" size={20} /> {busy ? t.challengeBusy : t.challengeSend}
            </button>
          </>
        )}
      </div>
    </>
  );
}
