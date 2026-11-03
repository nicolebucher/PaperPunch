import { useState, type CSSProperties } from "react";
import { useT } from "../i18n";
import { Beta, Icon, type IconName } from "../ui";
import { levelFor, POINTS, totalPunches } from "../punches";
import { inviteShares } from "../invite";
import { daysBetween, todayISO } from "../dates";
import type { ActivePlan } from "../types";
import type { StoredMaterial } from "../storage";
import { isResumable, materialDate, materialTitle } from "./materialInfo";
import { challengePctOf, savedNickname, sendChallenge } from "../challenge";

/**
 * Startseite S1: oben Datum/Begrüßung, rechts Level + Punches und Profil. Darunter drei große Wege
 * (Lernmaterial fotografieren, Thema eintippen, Lernplan) – läuft ein Lernplan, zeigt der dritte Weg ihn an.
 * Darunter klein "Weitermachen" (Lernpläne zuerst, dann Materialien), ganz unten Einladen und Herausfordern.
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

  // "Weitermachen": alle laufenden Lernpläne, dann angefangenes und zuletzt genutztes Material – zusammen höchstens vier.
  const resumable = materials.filter(isResumable).sort((a, b) => b.updatedAt - a.updatedAt);
  const rest = materials.filter((m) => !isResumable(m)).sort((a, b) => b.updatedAt - a.updatedAt);
  // Der nächste Plan steht schon im dritten Button – in der Liste nur weitere Pläne.
  const morePlans = running.slice(1);
  const items = [...resumable, ...rest].slice(0, Math.max(0, 4 - morePlans.length));

  const firstStart = materials.length === 0 && plans.length === 0;
  const hour = new Date().getHours();
  const greeting = firstStart ? t.homeStart : hour < 11 ? t.greetMorning : hour < 18 ? t.greetDay : t.greetEvening;
  const dateLabel = new Date().toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" });

  const total = totalPunches();
  const lvl = levelFor(total);
  const inviteBonus = inviteShares() === 0;
  const [challengeOpen, setChallengeOpen] = useState(false);

  const planToday = plan ? todaySession(plan, today) : undefined;
  const planDays = plan ? daysBetween(today, plan.goal.testDate) : 0;

  return (
    <div className="screen home home-c">
      <header className="home-b-head">
        <div className="home-b-greet">
          <span className="home-b-date">{dateLabel}</span>
          <span className="home-b-hello">{greeting}</span>
        </div>
        <div className="home-c-top">
          <button type="button" className="home-c-punch" onClick={onLevels} aria-label={t.levelAria(lvl.number, total)}>
            <span className="home-c-ring" style={{ "--p": `${Math.round(lvl.progress * 100)}%` } as CSSProperties}>
              <span>{lvl.number}</span>
            </span>
            {total.toLocaleString(lang)}
          </button>
          <button type="button" className="home-b-profile" onClick={onSettings} aria-label={t.settings}>
            <Icon name="user" size={18} stroke={2} />
          </button>
        </div>
      </header>

      <h1 className="home-c-title">{t.homeQuestion}</h1>

      <div className="home-c-ways">
        <WayButton icon="camera" color="c1" title={t.homeCta} sub={t.wayPhotoSub} main onClick={onQuick} />
        <WayButton icon="edit" color="c2" title={t.wayTopic} sub={t.wayTopicSub} onClick={() => onTopic?.("")} />
        {plan ? (
          <WayButton
            icon="calendar"
            color="c3"
            title={plan.plan.title}
            sub={planToday ? t.wayPlanToday(planDays, planToday) : t.homePlanActive(planDays)}
            onClick={() => onOpenPlan(plan.id)}
          />
        ) : (
          <WayButton icon="calendar" color="c3" title={t.createPlan} sub={t.wayPlanSub} beta onClick={onNewPlan} />
        )}
      </div>

      {(morePlans.length > 0 || items.length > 0) && (
        <section className="home-c-list">
          <div className="home-c-list-head">
            <span>{t.continueLabel}</span>
            {materials.length > 0 && onAllMaterials && (
              <button type="button" className="link-btn" onClick={onAllMaterials}>{t.allCount(materials.length)}</button>
            )}
          </div>
          {morePlans.map((p) => {
            const days = daysBetween(today, p.goal.testDate);
            const session = todaySession(p, today);
            return (
              <button key={p.id} type="button" className="home-c-row" onClick={() => onOpenPlan(p.id)}>
                <span className="home-c-days"><b>{days}</b><small>{t.daysShort}</small></span>
                <span className="home-c-row-text">
                  <b>{p.plan.title}</b>
                  <span className={session ? "accent" : ""}>{session ? `${t.today}: ${session}` : t.homePlanActive(days)}</span>
                </span>
                <Icon name="chevron" size={16} stroke={2.6} />
              </button>
            );
          })}
          {items.map((m) => (
            <button key={m.id} type="button" className="home-c-row" onClick={() => onOpenMaterial?.(m)}>
              <span className="home-c-bar" aria-hidden="true" />
              <span className="home-c-row-text">
                <b>{materialTitle(m)}</b>
                <span>{t.formats[m.result.format]} · {materialDate(m, t, lang)}</span>
              </span>
              <span className="home-c-row-status">{rowStatus(m)}</span>
            </button>
          ))}
        </section>
      )}

      <div className="home-c-foot">
        {onInvite && (
          <button type="button" onClick={onInvite}>
            {inviteBonus ? `${t.inviteFriends} · +${POINTS.invite}` : t.inviteFriends}
          </button>
        )}
        <button type="button" onClick={() => setChallengeOpen(true)}>
          <Icon name="punch" size={16} stroke={2} /> {t.challengeShort}
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

function WayButton({ icon, color, title, sub, main, beta, onClick }: { icon: IconName; color: string; title: string; sub: string; main?: boolean; beta?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={main ? "home-c-way main" : "home-c-way"} onClick={onClick}>
      <span className={`home-c-way-icon ${color}`}><Icon name={icon} size={24} stroke={2.2} /></span>
      <span className="home-c-way-text">
        <b>{title}{beta && <> <Beta /></>}</b>
        <span>{sub}</span>
      </span>
      <Icon name="chevron" size={18} stroke={2.6} />
    </button>
  );
}

/** Titel der heutigen, noch offenen Einheit eines Lernplans. */
function todaySession(plan: ActivePlan, today: string): string | undefined {
  const todayIndex = daysBetween(plan.startDate, today);
  return plan.sessions.find((s) => s.dayIndex === todayIndex && !plan.done.includes(s.id))?.title;
}

/** Kurzer Stand rechts in der Zeile: 4/10, 87 %, ✓ oder leer. */
function rowStatus(m: StoredMaterial): string {
  if (m.finished) {
    const pct = challengePctOf(m);
    return pct !== undefined ? `${pct} %` : "✓";
  }
  const p = m.progress;
  const r = m.result;
  if ((r.format === "worksheet" || r.format === "test") && p?.kind === "practice") return `${Math.min(p.index, r.data.tasks.length)}/${r.data.tasks.length}`;
  if (r.format === "game" && p?.kind === "game") return `${p.stars.filter((x) => x > 0).length}/${r.game.levels.length}`;
  return "";
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
