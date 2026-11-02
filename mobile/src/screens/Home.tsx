import { useT } from "../i18n";
import { Icon, TopBar } from "../ui";
import { daysBetween, todayISO } from "../dates";
import type { ActivePlan } from "../types";

export function Home({ plan, onQuick, onPlan, onSettings }: { plan: ActivePlan | null; onQuick: () => void; onPlan: () => void; onSettings: () => void }) {
  const { t } = useT();
  const daysLeft = plan ? daysBetween(todayISO(), plan.goal.testDate) : 0;
  const todayIndex = plan ? daysBetween(plan.startDate, todayISO()) : 0;
  const todayOpen = plan ? plan.sessions.filter((s) => s.dayIndex === todayIndex && !plan.done.includes(s.id)) : [];

  return (
    <div className="screen">
      <TopBar
        right={
          <button type="button" className="iconbtn" onClick={onSettings} aria-label={t.settings}>
            <Icon name="gear" size={20} stroke={1.8} />
          </button>
        }
      />
      <div className="stack" style={{ gap: 16, paddingBottom: 28 }}>
        <p className="muted" style={{ fontSize: 17, fontWeight: 700 }}>{t.appTagline}</p>

        {plan && daysLeft > 0 && (
          <button type="button" className="card tap accent" onClick={onPlan}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="row" style={{ color: "var(--teal)", fontWeight: 800 }}>
                <Icon name="calendar" size={18} /> {t.homePlanActive(daysLeft)}
              </span>
            </div>
            <h2>{plan.plan.title}</h2>
            {todayOpen.length > 0 ? (
              <p className="muted">
                {t.today}: {todayOpen.map((s) => s.title).join(" · ")}
              </p>
            ) : (
              <p className="muted">{t.noSessionToday}</p>
            )}
            <span className="btn primary small" style={{ alignSelf: "flex-start" }}>{t.homePlanOpen}</span>
          </button>
        )}

        <button type="button" className="card tap" onClick={onQuick}>
          <span className="row" style={{ color: "var(--teal)" }}>
            <Icon name="camera" size={28} />
          </span>
          <h2>{t.homeQuickTitle}</h2>
          <p className="muted">{t.homeQuickText}</p>
        </button>

        {(!plan || daysLeft <= 0) && (
          <button type="button" className="card tap" onClick={onPlan}>
            <span className="row" style={{ color: "var(--teal)" }}>
              <Icon name="flag" size={28} />
            </span>
            <h2>{t.homePlanTitle}</h2>
            <p className="muted">{t.homePlanText}</p>
          </button>
        )}
      </div>
    </div>
  );
}
