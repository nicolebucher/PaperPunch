import { useEffect, useState, type CSSProperties } from "react";
import { useT } from "../i18n";
import { Beta, Icon, type IconName } from "../ui";
import { learnedToday, levelFor, POINTS, streakDays, totalPunches } from "../punches";
import { inviteShares, shareLink } from "../invite";
import { daysBetween, todayISO } from "../dates";
import type { ActivePlan } from "../types";
import type { StoredMaterial } from "../storage";
import { isResumable, materialDate, materialTitle } from "./materialInfo";
import { challengePctOf, savedNickname, sendChallenge } from "../challenge";
import { endOptions, homeworkOptions, loadBoard, myGroups, startGroup, submitPending, timeLeft, updateGroup, type MyGroup } from "../groups";
import type { GroupBoard } from "../api";
import { isBlockedName } from "../nameFilter";

/**
 * Startseite S1: oben Datum/Begrüßung, rechts Level + Punches und Profil. Darunter drei große Wege
 * (Lernmaterial fotografieren, Thema eintippen, Lernplan erstellen) – laufende Lernpläne stehen unter "Weitermachen".
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
  role,
}: {
  /** Rolle aus dem Profil: Lehrkräfte sehen statt "Lernplan" die Lerngruppe für die Klasse. */
  role?: "student" | "parent" | "teacher";
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

  // "Weitermachen": alle laufenden Lernpläne, dann angefangenes und zuletzt genutztes Material – zusammen höchstens vier.
  const resumable = materials.filter(isResumable).sort((a, b) => b.updatedAt - a.updatedAt);
  const rest = materials.filter((m) => !isResumable(m)).sort((a, b) => b.updatedAt - a.updatedAt);
  // Alle laufenden Pläne stehen in der Liste; der dritte Button legt immer einen neuen Plan an.
  const morePlans = running;
  const items = [...resumable, ...rest].slice(0, Math.max(1, 4 - morePlans.length));

  const firstStart = materials.length === 0 && plans.length === 0;
  const hour = new Date().getHours();
  const greeting = firstStart ? t.homeStart : hour < 11 ? t.greetMorning : hour < 18 ? t.greetDay : t.greetEvening;
  const dateLabel = new Date().toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" });

  const total = totalPunches();
  const streak = streakDays();
  const lvl = levelFor(total);
  const inviteBonus = inviteShares() === 0;
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [groupSheet, setGroupSheet] = useState<{ exclude?: string; name?: string } | null>(null);
  const [groups, setGroups] = useState<(MyGroup & { board?: GroupBoard | null; rank?: number; passed?: string })[]>([]);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  // Lerngruppen: eigenes Ergebnis nachreichen, dann Platz holen; wer vorbeigezogen ist, wird einmal genannt.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await submitPending(materials).catch(() => undefined);
      const list = myGroups().slice(0, 3);
      const withBoards = await Promise.all(
        list.map(async (g) => {
          const board = await loadBoard(g.code);
          const idx = board?.me ? board.entries.findIndex((e) => e.me === board.me) : -1;
          const rank = idx >= 0 ? idx + 1 : undefined;
          const passed = rank && g.lastRank && rank > g.lastRank ? board?.entries[idx - 1]?.name : undefined;
          if (rank) updateGroup(g.code, { lastRank: rank });
          return { ...g, board, rank, passed };
        })
      );
      if (!cancelled) setGroups(withBoards);
    })();
    return () => {
      cancelled = true;
    };
  }, [materials]);


  return (
    <div className="screen home home-c">
      <header className="home-b-head">
        <div className="home-b-greet">
          <span className="home-b-date">{dateLabel}</span>
          <span className="home-b-hello">{greeting}</span>
        </div>
        <div className="home-c-top">
          {streak > 0 && (
            <button type="button" className={learnedToday() ? "home-c-streak" : "home-c-streak open"} onClick={onLevels} aria-label={t.streakAria(streak)}>
              <Icon name="flame" size={16} stroke={2.2} /> {streak}
            </button>
          )}
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
        {role === "teacher" ? (
          <WayButton icon="group" color="c3" title={t.wayGroupTeacher} sub={t.wayGroupTeacherSub} onClick={() => setGroupSheet({})} />
        ) : (
          <WayButton icon="calendar" color="c3" title={t.createPlan} sub={t.wayPlanSub} beta onClick={onNewPlan} />
        )}
      </div>

      {(morePlans.length > 0 || items.length > 0 || groups.length > 0) && (
        <section className="home-c-list">
          <div className="home-c-list-head">
            <span>{t.continueLabel}</span>
            {materials.length > 0 && onAllMaterials && (
              <button type="button" className="link-btn" onClick={onAllMaterials}>{t.allCount(materials.length)}</button>
            )}
          </div>
          {groups.map((g) => (
            <button key={g.code} type="button" className="home-c-row home-c-group" onClick={() => setOpenGroup(g.code)}>
              <span className="home-c-group-icon"><Icon name="group" size={20} stroke={2} /></span>
              <span className="home-c-row-text">
                <b>{g.homework ? `📚 ${g.name} · ${t.hwDoneCount(g.board?.count ?? g.board?.entries.length ?? 0)}` : `${g.name} · ${t.groupRow(g.rank, g.board?.entries.length ?? 0)}`}</b>
                <span className="accent-pink">{g.passed ? t.groupPassed(g.passed) : g.title}{g.endsAt ? ` · ${timeLeft(g.endsAt, t)}` : ""}</span>
              </span>
              <Icon name="chevron" size={16} stroke={2.6} />
            </button>
          ))}
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
            {inviteBonus ? `${t.inviteShort} · +${POINTS.invite}` : t.inviteShort}
          </button>
        )}
        <button type="button" onClick={() => setChallengeOpen(true)}>
          <Icon name="punch" size={16} stroke={2} /> {t.challengeShort}
        </button>
        <button type="button" onClick={() => setGroupSheet({})}>
          <Icon name="group" size={16} stroke={2} /> {t.groupShort}
        </button>
      </div>

      {groupSheet && (
        <GroupSheet
          games={materials.filter((m) => m.result.format === "game" && materialTitle(m) !== groupSheet.exclude).sort((a, b) => b.updatedAt - a.updatedAt)}
          initialName={groupSheet.name}
          onClose={() => setGroupSheet(null)}
          onNewGame={() => { setGroupSheet(null); onNewGame?.(); }}
          onCreated={(g) => setGroups((list) => [{ ...g }, ...list.filter((x) => x.code !== g.code)].slice(0, 3))}
          say={say}
        />
      )}
      {openGroup && (() => {
        const g = groups.find((x) => x.code === openGroup);
        if (!g) return null;
        const material = materials.find((m) => m.id === g.materialId);
        return (
          <GroupBoardSheet
            group={g}
            onClose={() => setOpenGroup(null)}
            onPlay={material ? () => { setOpenGroup(null); onOpenMaterial?.(material); } : undefined}
            onNewRound={() => { setOpenGroup(null); setGroupSheet({ exclude: g.title, name: g.name }); }}
            say={say}
          />
        );
      })()}

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
              {isBlockedName(name) && <span className="name-blocked">{t.nameBlocked}</span>}
            </label>
            <button type="button" className="btn primary block" disabled={!chosen || busy || isBlockedName(name)} onClick={() => void share()}>
              <Icon name="share" size={20} /> {busy ? t.challengeBusy : t.challengeSend}
            </button>
          </>
        )}
      </div>
    </>
  );
}

/** "Lerngruppe starten" (Entwurf G1): Lernspiel wählen oder neu erstellen, Ende, Gruppenname, Spitzname → Link teilen. */
function GroupSheet({ games, initialName, onClose, onNewGame, onCreated, say }: { games: StoredMaterial[]; initialName?: string; onClose: () => void; onNewGame: () => void; onCreated: (g: MyGroup) => void; say?: (msg: string) => void }) {
  const { t, lang } = useT();
  const [picked, setPicked] = useState(games[0]?.id ?? "");
  const ends = endOptions(t);
  const [end, setEnd] = useState("friday");
  const [homework, setHomework] = useState(false);
  const dues = homeworkOptions(t, lang);
  const [due, setDue] = useState(dues[0]?.id ?? "");
  const [name, setName] = useState(initialName ?? "");
  const [nick, setNick] = useState(savedNickname);
  const [busy, setBusy] = useState(false);
  const chosen = games.find((g) => g.id === picked);

  async function create() {
    if (!chosen || chosen.result.format !== "game" || busy) return;
    setBusy(true);
    try {
      const { outcome, group } = await startGroup({ material: chosen, game: chosen.result.game, name, nick, endsAt: homework ? dues.find((d) => d.id === due)?.endsAt ?? null : ends.find((e) => e.id === end)?.endsAt ?? null, homework, lang, t });
      onCreated(group);
      if (outcome === "copied") say?.(t.inviteCopied);
      onClose();
    } catch {
      say?.(t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet home-b-sheet" role="dialog" aria-label={t.groupStart}>
        <span className="home-b-grab" aria-hidden="true" />
        <div className="stack" style={{ gap: 4 }}>
          <h2>{t.groupStart}</h2>
          <p className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{t.groupStartSub}</p>
        </div>
        <span className="group-lab">{t.groupGame}</span>
        <div className="home-b-games">
          <button type="button" className="home-b-game new" onClick={onNewGame}>
            <span className="home-b-game-icon"><Icon name="plus" size={20} stroke={2.4} /></span>
            <span className="home-b-game-text"><b>{t.groupNewGame}</b><span>{t.groupNewGameSub}</span></span>
            <Icon name="chevron" size={18} stroke={2.6} />
          </button>
          {games.slice(0, 5).map((g) => {
            const on = g.id === picked;
            return (
              <button key={g.id} type="button" className={on ? "home-b-game on" : "home-b-game"} aria-pressed={on} onClick={() => setPicked(g.id)}>
                <span className="home-b-game-icon"><Icon name="game" size={20} stroke={2} /></span>
                <span className="home-b-game-text"><b>{materialTitle(g)}</b><span>{g.result.format === "game" ? `${g.result.game.levels.length} Level` : ""}</span></span>
                <span className="ob-opt-mark">{on && <Icon name="check" size={15} stroke={3} />}</span>
              </button>
            );
          })}
        </div>
        {games.length > 0 && (
          <>
            <button type="button" role="switch" aria-checked={homework} className={homework ? "hw-toggle on" : "hw-toggle"} onClick={() => setHomework((h) => !h)}>
              <span className="hw-toggle-text"><b>📚 {t.hwToggle}</b><span>{t.hwToggleSub}</span></span>
              <span className="hw-switch" aria-hidden="true"><i /></span>
            </button>
            <span className="group-lab">{homework ? t.hwDue : t.groupEnds}</span>
            <div className="group-chips">
              {homework
                ? dues.map((d) => (
                  <button key={d.id} type="button" className={due === d.id ? "group-chip on" : "group-chip"} aria-pressed={due === d.id} onClick={() => setDue(d.id)}>{d.label}</button>
                ))
                : ends.map((e) => (
                  <button key={e.id} type="button" className={end === e.id ? "group-chip on" : "group-chip"} aria-pressed={end === e.id} onClick={() => setEnd(e.id)}>{e.label}</button>
                ))}
            </div>
            <label className="field">
              {t.groupName}
              <input className="input set" value={name} maxLength={40} placeholder={t.groupNamePh} onChange={(e) => setName(e.target.value)} />
              {isBlockedName(name) && <span className="name-blocked">{t.nameBlocked}</span>}
            </label>
            <label className="field">
              {t.nickname}
              <input className="input set" value={nick} maxLength={20} placeholder={t.nicknamePh} onChange={(e) => setNick(e.target.value)} />
              {isBlockedName(nick) && <span className="name-blocked">{t.nameBlocked}</span>}
            </label>
            <button type="button" className="btn primary block" disabled={!chosen || busy || isBlockedName(name) || isBlockedName(nick)} onClick={() => void create()}>
              <Icon name="share" size={20} /> {busy ? t.groupBusy : homework ? t.hwSend : t.groupSend}
            </button>
            <p className="muted" style={{ fontSize: 12, fontWeight: 600, textAlign: "center" }}>{homework ? t.hwHint : t.groupHint}</p>
          </>
        )}
        {games.length === 0 && <p className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{t.groupEmptyText}</p>}
      </div>
    </>
  );
}

/** Rangliste einer eigenen Lerngruppe (Entwürfe G3/G4). */
function GroupBoardSheet({ group, onClose, onPlay, onNewRound, say }: { group: MyGroup & { board?: GroupBoard | null }; onClose: () => void; onPlay?: () => void; onNewRound: () => void; say?: (msg: string) => void }) {
  const { t, lang } = useT();
  const board = group.board;
  const entries = board?.entries ?? [];
  const meIdx = board?.me ? entries.findIndex((e) => e.me === board.me) : -1;
  const ended = !!board?.ended;
  const left = timeLeft(group.endsAt, t);

  async function share() {
    const due = group.endsAt ? new Date(group.endsAt).toLocaleString(lang === "en" ? "en-GB" : "de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "";
    const outcome = group.homework
      ? await shareLink(t.hwShareTitle, t.hwShareText(group.title, due), group.url)
      : await shareLink(t.groupShareTitle, t.groupShareText(group.name, group.title), group.url);
    if (outcome === "copied") say?.(t.inviteCopied);
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet home-b-sheet group-board" role="dialog" aria-label={group.name}>
        <span className="home-b-grab" aria-hidden="true" />
        <div className="group-board-head">
          <b>{group.name}</b>
          {left && <span className="group-pill">{left}</span>}
        </div>
        {board === null && <p className="muted">{t.groupOffline}</p>}
        {board && group.homework && (
          <div className="stack" style={{ gap: 4 }}>
            <span className="group-lab">{t.hwLabel} · {group.title}</span>
            <h2>{t.hwDoneCount(board.count ?? board.entries.length)}</h2>
            <p className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{t.hwBoardSub}</p>
          </div>
        )}
        {board && !group.homework && (ended ? (
          <div className="group-winner">
            <span className="group-crown">👑</span>
            <h2>{entries[0] ? t.groupWinner(entries[0].name) : t.groupNobody}</h2>
          </div>
        ) : (
          <div className="stack" style={{ gap: 4 }}>
            <span className="group-lab">{group.title}</span>
            <h2>{meIdx >= 0 ? t.groupPlace(meIdx + 1, entries.length) : t.groupNotYet}</h2>
            {meIdx >= 0 && <p className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{meIdx === 0 ? t.groupFirst : t.groupToFirst(entries[0].pct - entries[meIdx].pct)}</p>}
          </div>
        ))}
        {!group.homework && <div className="group-list">
          {entries.slice(0, 8).map((e, i) => {
            const me = i === meIdx;
            const medal = ended && i === 0 ? "🏆" : ["🥇", "🥈", "🥉"][i];
            return (
              <div key={e.me + i} className={me ? "group-entry me" : "group-entry"}>
                <span className="group-rank">{medal ?? i + 1}</span>
                <span className="group-entry-name"><b>{me ? `${t.groupYou} (${e.name})` : e.name}</b><span>{e.correct}/{e.total}</span></span>
                <b className="group-pct">{e.pct} %</b>
              </div>
            );
          })}
        </div>}
        {group.homework ? (
          <>
            {group.teacherUrl && <button type="button" className="btn primary block" onClick={() => window.open(group.teacherUrl, "_blank")}><Icon name="eye" size={20} /> {t.groupTeacher}</button>}
            {!ended && <button type="button" className="btn ghost block" onClick={() => void share()}><Icon name="share" size={20} /> {t.hwSend}</button>}
          </>
        ) : ended ? (
          <button type="button" className="btn primary block" onClick={onNewRound}>{t.groupNewRound}</button>
        ) : (
          <>
            {meIdx < 0 && onPlay && <button type="button" className="btn primary block" onClick={onPlay}><Icon name="play" size={20} /> {t.groupPlayNow}</button>}
            <button type="button" className={meIdx < 0 && onPlay ? "btn ghost block" : "btn primary block"} onClick={() => void share()}><Icon name="share" size={20} /> {t.groupShareAgain}</button>
          </>
        )}
        {group.teacherUrl && !group.homework && (
          <button type="button" className="btn ghost block" onClick={() => window.open(group.teacherUrl, "_blank")}><Icon name="eye" size={20} /> {t.groupTeacher}</button>
        )}
        <button type="button" className="link-btn" onClick={() => window.open(group.url, "_blank")}>{t.groupOpenWeb}</button>
      </div>
    </>
  );
}
