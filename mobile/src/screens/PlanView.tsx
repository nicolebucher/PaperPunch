import { useState } from "react";
import { useT } from "../i18n";
import { addDays, daysBetween, formatDay, todayISO } from "../dates";
import { Beta, Icon, TopBar, type IconName } from "../ui";
import type { ActivePlan, StoredSession } from "../types";
import { loadReminderSettings, remindersSupported, requestReminderPermission, saveReminderSettings } from "../reminders";

const KIND_ICON: Record<StoredSession["kind"], IconName> = {
  learn: "bolt",
  practice: "worksheet",
  game: "game",
  podcast: "podcast",
  checkpoint: "flag",
  review: "review",
};

/** Plan nach Tagen: heute oben hervorgehoben, Einheiten starten, erledigte abhaken. */
export function PlanView({
  active,
  onBack,
  onStart,
  onToggleDone,
  onDelete,
  onNew,
  onRemindersChange,
}: {
  active: ActivePlan;
  onBack: () => void;
  onStart: (s: StoredSession) => void;
  onToggleDone: (id: string) => void;
  onDelete: () => void;
  onNew: () => void;
  onRemindersChange?: () => void;
}) {
  const { t, lang } = useT();
  const [confirming, setConfirming] = useState(false);
  const todayIndex = daysBetween(active.startDate, todayISO());
  const testIndex = daysBetween(active.startDate, active.goal.testDate);
  const daysLeft = testIndex - todayIndex;
  const over = daysLeft <= 0;

  // Vergangene Tage ohne offene Einheiten ausblenden, damit "heute" oben steht.
  const dayIndexes = Array.from(new Set(active.sessions.map((s) => s.dayIndex))).sort((a, b) => a - b);
  const visibleDays = dayIndexes.filter(
    (d) => d >= todayIndex || active.sessions.some((s) => s.dayIndex === d && !active.done.includes(s.id))
  );
  const doneCount = active.sessions.filter((s) => active.done.includes(s.id)).length;
  const hasToday = dayIndexes.includes(todayIndex);

  function dayLabel(d: number) {
    if (d === todayIndex) return t.today;
    if (d === todayIndex + 1) return t.tomorrow;
    return formatDay(addDays(active.startDate, d), lang);
  }

  return (
    <div className="screen">
      <TopBar onBack={onBack} />
      <div className="stack" style={{ gap: 18, paddingBottom: 28 }}>
        <div className="stack" style={{ gap: 8 }}>
          <div className="row">
            <Beta />
            <span className="status">{over ? t.testDay : t.daysLeft(daysLeft)}</span>
            <span className={`status ${active.plan.feasibility}`}>{t.feasibility[active.plan.feasibility]}</span>
            <span className="status">{doneCount}/{active.sessions.length}</span>
          </div>
          <h1>{active.plan.title}</h1>
          <p className="muted">{active.plan.summary}</p>
          <p className="muted" style={{ fontSize: 14 }}>{active.plan.feasibilityNote}</p>
        </div>

        {over ? (
          <div className="card">
            <p>{t.planOver}</p>
            <button type="button" className="btn primary block" onClick={onNew}>{t.newPlan}</button>
          </div>
        ) : (
          !hasToday && <div className="card"><p>{t.noSessionToday}</p></div>
        )}

        {visibleDays.map((d) => {
          const sessions = active.sessions.filter((s) => s.dayIndex === d);
          return (
            <section className="day" key={d} aria-label={dayLabel(d)}>
              <span className={d === todayIndex ? "daylabel today" : "daylabel"}>{dayLabel(d)}</span>
              {sessions.map((s) => {
                const done = active.done.includes(s.id);
                const missed = !done && d < todayIndex;
                const result = active.results[s.id];
                const cls = ["session", s.kind === "checkpoint" ? "checkpoint" : "", d === todayIndex && !done ? "today" : "", done ? "done" : ""].join(" ");
                return (
                  <div key={s.id} className={cls}>
                    <span className="kind"><Icon name={KIND_ICON[s.kind]} size={20} /></span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="meta">
                        {t.kinds[s.kind]} · {t.formats[s.format]} · {t.minutes(s.minutes)}
                        {result ? ` · ${result.correct}/${result.total}` : ""}
                        {missed ? ` · ${t.sessionMissed}` : ""}
                      </div>
                      <div className="title">{s.title}</div>
                      {s.tip && d === todayIndex && !done && <div className="meta" style={{ fontWeight: 600 }}>{s.tip}</div>}
                    </div>
                    {done ? (
                      <button type="button" className="iconbtn" onClick={() => onToggleDone(s.id)} aria-label={t.sessionDone} title={t.sessionDone} style={{ color: "var(--teal)", borderColor: "var(--teal)" }}>
                        <Icon name="check" size={20} stroke={3} />
                      </button>
                    ) : (
                      <button type="button" className="btn primary small" onClick={() => onStart(s)} disabled={d > todayIndex && s.kind === "checkpoint"}>
                        {t.startSession}
                      </button>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}

        {!over && (
          <section className="day" aria-label={t.testDay}>
            <span className="daylabel">{formatDay(active.goal.testDate, lang)}</span>
            <div className="session" style={{ borderStyle: "dashed" }}>
              <span className="kind"><Icon name="star" size={20} /></span>
              <div className="title">{t.testDay}: {active.goal.subject}</div>
            </div>
          </section>
        )}

        {!over && remindersSupported() && <ReminderRow onChange={onRemindersChange} />}

        {confirming ? (
          <div className="card">
            <p>{t.deleteConfirm}</p>
            <div className="grid2">
              <button type="button" className="btn ghost small" onClick={() => setConfirming(false)}>{t.cancel}</button>
              <button type="button" className="btn small" style={{ background: "#ea580c", color: "#fff" }} onClick={onDelete}>{t.deleteYes}</button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn ghost small" style={{ alignSelf: "center" }} onClick={() => setConfirming(true)}>
            {t.deletePlan}
          </button>
        )}
      </div>
    </div>
  );
}

/** Erinnerungen an/aus und Uhrzeit – gilt für alle Lernpläne. */
function ReminderRow({ onChange }: { onChange?: () => void }) {
  const { t } = useT();
  const [settings, setSettings] = useState(loadReminderSettings);
  const [denied, setDenied] = useState(false);

  async function update(next: typeof settings) {
    if (next.on && !settings.on) {
      const granted = await requestReminderPermission();
      setDenied(!granted);
      if (!granted) next = { ...next, on: false };
    }
    next = { ...next, asked: true };
    setSettings(next);
    saveReminderSettings(next);
    onChange?.();
  }

  return (
    <div className="card reminder-row">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
        <span className="stack" style={{ gap: 2 }}>
          <span style={{ fontWeight: 800 }}>{t.remindersTitle}</span>
          <span className="muted" style={{ fontSize: 14 }}>{t.remindersText}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={settings.on}
          aria-label={t.remindersTitle}
          className={settings.on ? "switch on" : "switch"}
          onClick={() => void update({ ...settings, on: !settings.on })}
        >
          <span />
        </button>
      </div>
      {settings.on && (
        <label className="row" style={{ flexWrap: "nowrap", justifyContent: "space-between", fontWeight: 700 }}>
          {t.remindersTime}
          <input
            type="time"
            className="input"
            style={{ width: 130 }}
            value={settings.time}
            onChange={(e) => e.target.value && void update({ ...settings, time: e.target.value })}
          />
        </label>
      )}
      {denied && <span className="muted" style={{ fontSize: 14 }}>{t.remindersDenied}</span>}
    </div>
  );
}
