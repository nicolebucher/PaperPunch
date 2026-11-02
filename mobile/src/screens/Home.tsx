import { useT } from "../i18n";
import { Beta, Icon, TopBar } from "../ui";
import { BrandMark, PIXEL_COLORS, PixelStrip } from "../brand";
import { daysBetween, todayISO } from "../dates";
import type { ActivePlan } from "../types";

/** Startseite: große Foto-Karte als Hauptaktion, darunter der Lernplan mit einem Pixel pro Tag bis zum Test. */
export function Home({ plan, onQuick, onPlan, onSettings }: { plan: ActivePlan | null; onQuick: () => void; onPlan: () => void; onSettings: () => void }) {
  const { t } = useT();
  const hour = new Date().getHours();
  const greeting = hour < 11 ? t.greetMorning : hour < 18 ? t.greetDay : t.greetEvening;

  const daysLeft = plan ? daysBetween(todayISO(), plan.goal.testDate) : 0;
  const activePlan = plan && daysLeft > 0 ? plan : null;
  const todayIndex = activePlan ? daysBetween(activePlan.startDate, todayISO()) : 0;
  const todayOpen = activePlan ? activePlan.sessions.filter((s) => s.dayIndex === todayIndex && !activePlan.done.includes(s.id)) : [];

  // Ein Pixel pro Tag vom Planstart bis zum Testtag.
  const cells = activePlan
    ? Array.from({ length: daysBetween(activePlan.startDate, activePlan.goal.testDate) + 1 }, (_, d) => {
        const testDay = d === daysBetween(activePlan.startDate, activePlan.goal.testDate);
        if (testDay) return { state: "test" as const };
        const sessions = activePlan.sessions.filter((s) => s.dayIndex === d);
        const allDone = sessions.length > 0 && sessions.every((s) => activePlan.done.includes(s.id));
        if (d === todayIndex) return { state: allDone ? ("done" as const) : ("today" as const), color: PIXEL_COLORS[d % 3] };
        if (d < todayIndex) return { state: allDone || sessions.length === 0 ? ("done" as const) : ("missed" as const), color: PIXEL_COLORS[d % 3] };
        return { state: "open" as const };
      })
    : [];

  return (
    <div className="screen home">
      <TopBar
        right={
          <button type="button" className="iconbtn" onClick={onSettings} aria-label={t.settings}>
            <Icon name="gear" size={20} stroke={1.8} />
          </button>
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
          <span className="hero-pixels" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
          <span className="hero-icon"><Icon name="camera" size={30} stroke={2.2} /></span>
          <span className="hero-title">{t.homeQuickTitle}</span>
          <span className="hero-text">{t.homeQuickText}</span>
          <span className="hero-formats">
            {(["worksheet", "test", "game", "podcast"] as const).map((f) => (
              <span key={f}><Icon name={f} size={16} stroke={2.4} /> {t.formats[f]}</span>
            ))}
          </span>
        </button>

        {activePlan ? (
          <button type="button" className="plan-card" onClick={onPlan}>
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
              <span className="eyebrow pink"><Icon name="calendar" size={16} /> {t.homePlanActive(daysLeft)} <Beta /></span>
              <Icon name="chevron" size={18} stroke={2.6} />
            </div>
            <span className="plan-title">{activePlan.plan.title}</span>
            <PixelStrip cells={cells} label={t.homePlanActive(daysLeft)} />
            <span className="muted" style={{ fontSize: 15 }}>
              {todayOpen.length > 0 ? `${t.today}: ${todayOpen.map((s) => s.title).join(" · ")}` : t.noSessionToday}
            </span>
          </button>
        ) : (
          <button type="button" className="plan-card" onClick={onPlan}>
            <span className="eyebrow pink"><Icon name="flag" size={16} /> {t.homePlanTitle} <Beta /></span>
            <span className="plan-title">{t.homePlanPitch}</span>
            <PixelStrip
              cells={[...Array.from({ length: 9 }, (_, i) => ({ state: i < 4 ? ("done" as const) : ("open" as const), color: PIXEL_COLORS[i % 3] })), { state: "test" as const }]}
              label={t.homePlanTitle}
            />
            <span className="muted" style={{ fontSize: 15 }}>{t.homePlanText}</span>
          </button>
        )}
      </div>
    </div>
  );
}
