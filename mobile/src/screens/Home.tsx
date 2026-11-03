import { useT } from "../i18n";
import { Beta, Icon, TopBar } from "../ui";
import { BrandMark, PixelStrip } from "../brand";
import { PunchPill } from "../rewards";
import { daysBetween, todayISO } from "../dates";
import type { ActivePlan } from "../types";
import type { StoredMaterial } from "../storage";

const TEAL = "#1FD6EA";

function planCells(plan: ActivePlan) {
  const todayIndex = daysBetween(plan.startDate, todayISO());
  const testIndex = daysBetween(plan.startDate, plan.goal.testDate);
  return Array.from({ length: testIndex + 1 }, (_, d) => {
    if (d === testIndex) return { state: "test" as const };
    const sessions = plan.sessions.filter((s) => s.dayIndex === d);
    const allDone = sessions.length > 0 && sessions.every((s) => plan.done.includes(s.id));
    if (d === todayIndex) return { state: allDone ? ("done" as const) : ("today" as const), color: TEAL };
    if (d < todayIndex) return { state: allDone || sessions.length === 0 ? ("done" as const) : ("missed" as const), color: TEAL };
    return { state: "open" as const };
  });
}

/** Startseite: große Karte "Lernmaterial erstellen", darunter alle Lernpläne – je ein Pixel pro Tag bis zum Test. */
export function Home({
  plans,
  materials = [],
  onOpenMaterial,
  onQuick,
  onOpenPlan,
  onNewPlan,
  onSettings,
  onLevels,
}: {
  plans: ActivePlan[];
  materials?: StoredMaterial[];
  onOpenMaterial?: (m: StoredMaterial) => void;
  onQuick: () => void;
  onOpenPlan: (planId: string) => void;
  onNewPlan: () => void;
  onSettings: () => void;
  onLevels: () => void;
}) {
  const { t } = useT();
  const hour = new Date().getHours();
  const greeting = hour < 11 ? t.greetMorning : hour < 18 ? t.greetDay : t.greetEvening;
  const today = todayISO();

  // Laufende Pläne nach Testdatum, vergangene ans Ende.
  const sorted = [...plans].sort((a, b) => {
    const da = daysBetween(today, a.goal.testDate);
    const db = daysBetween(today, b.goal.testDate);
    if ((da > 0) !== (db > 0)) return da > 0 ? -1 : 1;
    return da - db;
  });

  // Angefangene Materialien zuerst, danach die neuesten – höchstens 4 auf der Startseite.
  const shownMaterials = [...materials]
    .sort((a, b) => Number(!!a.progress && !a.finished) === Number(!!b.progress && !b.finished) ? b.updatedAt - a.updatedAt : a.progress && !a.finished ? -1 : 1)
    .slice(0, 4);
  const resumable = shownMaterials.some((m) => m.progress && !m.finished);

  function materialStatus(m: StoredMaterial) {
    if (m.finished) return t.matDone;
    const p = m.progress;
    if (p?.kind === "practice") {
      const total = "tasks" in m.result ? m.result.tasks.length : p.results.length;
      return t.matProgressTasks(Math.min(p.index + 1, total), total);
    }
    if (p?.kind === "game") return t.matProgressLevels(p.stars.filter((x) => x > 0).length + (p.bossDone ? 1 : 0), p.stars.length + 1);
    return t.matNew;
  }

  return (
    <div className="screen home">
      <TopBar
        right={
          <div className="row" style={{ flexWrap: "nowrap", gap: 8 }}>
            <PunchPill onClick={onLevels} />
            <button type="button" className="iconbtn" onClick={onSettings} aria-label={t.settings}>
              <Icon name="gear" size={20} stroke={1.8} />
            </button>
          </div>
        }
      />

      <div className="stack" style={{ gap: 18, paddingBottom: 28 }}>
        <div className="home-hero">
          <div className="stack" style={{ gap: 6, minWidth: 0 }}>
            <span className="eyebrow">{greeting}</span>
            <h1 className="display">{t.homeHeadline}</h1>
          </div>
          <BrandMark mode="float" className="home-mark" />
        </div>

        <button type="button" className="hero-card" onClick={onQuick}>
          <span className="hero-icon"><Icon name="camera" size={30} stroke={2.2} /></span>
          <span className="hero-title">{t.homeQuickTitle}</span>
          <span className="hero-text">{t.homeQuickText}</span>
          <span className="hero-formats">
            {(["worksheet", "test", "game", "podcast"] as const).map((f) => (
              <span key={f} className={f === "podcast" ? "soon" : undefined}>
                <Icon name={f} size={16} stroke={2.4} /> {t.formats[f]}
                {f === "podcast" && <em>{t.comingSoon}</em>}
              </span>
            ))}
          </span>
        </button>

        {shownMaterials.length > 0 && (
          <div className="stack" style={{ gap: 10 }}>
            <span className="section-title">{resumable ? t.continueTitle : t.myMaterials}</span>
            {shownMaterials.map((m) => (
              <button key={m.id} type="button" className="material-row" onClick={() => onOpenMaterial?.(m)}>
                <span className="material-icon"><Icon name={m.result.format} size={20} stroke={2.2} /></span>
                <span className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                  <span className="material-title">{m.result.title}</span>
                  <span className={m.progress && !m.finished ? "material-sub active" : "material-sub"}>
                    {t.formats[m.result.format]} · {materialStatus(m)}
                  </span>
                </span>
                <Icon name="chevron" size={18} stroke={2.6} />
              </button>
            ))}
          </div>
        )}

        <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap", marginTop: 6 }}>
          <span className="section-title">{t.myPlans} <Beta /></span>
          {plans.length > 0 && (
            <button type="button" className="btn ghost small" onClick={onNewPlan}>
              <Icon name="plus" size={18} /> {t.newPlanShort}
            </button>
          )}
        </div>

        {sorted.map((plan) => {
          const daysLeft = daysBetween(today, plan.goal.testDate);
          const todayIndex = daysBetween(plan.startDate, today);
          const todayOpen = plan.sessions.filter((s) => s.dayIndex === todayIndex && !plan.done.includes(s.id));
          const over = daysLeft <= 0;
          return (
            <button key={plan.id} type="button" className={over ? "plan-card over" : "plan-card"} onClick={() => onOpenPlan(plan.id)}>
              <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
                <span className="eyebrow"><Icon name="calendar" size={16} /> {over ? t.testDone : t.homePlanActive(daysLeft)}</span>
                <Icon name="chevron" size={18} stroke={2.6} />
              </div>
              <span className="plan-title">{plan.plan.title}</span>
              {!over && <PixelStrip cells={planCells(plan)} label={t.homePlanActive(daysLeft)} />}
              {!over && (
                <span className="muted" style={{ fontSize: 15 }}>
                  {todayOpen.length > 0 ? `${t.today}: ${todayOpen.map((s) => s.title).join(" · ")}` : t.noSessionToday}
                </span>
              )}
            </button>
          );
        })}

        {plans.length === 0 && (
          <button type="button" className="plan-card" onClick={onNewPlan}>
            <span className="plan-title">{t.homePlanPitch}</span>
            <PixelStrip
              cells={[...Array.from({ length: 9 }, (_, i) => ({ state: i < 4 ? ("done" as const) : ("open" as const), color: TEAL })), { state: "test" as const }]}
              label={t.homePlanTitle}
            />
            <span className="muted" style={{ fontSize: 15 }}>{t.homePlanText}</span>
            <span className="btn primary small" style={{ alignSelf: "flex-start", marginTop: 4 }}>
              <Icon name="plus" size={18} /> {t.newPlan}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
