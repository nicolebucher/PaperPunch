import type { CSSProperties } from "react";
import { useT } from "../i18n";
import { Icon, TopBar } from "../ui";
import { PunchPill } from "../rewards";
import { daysBetween, todayISO } from "../dates";
import type { ActivePlan } from "../types";
import type { StoredMaterial } from "../storage";
import { isResumable, materialStatus, materialTitle } from "./materialInfo";

/**
 * Startseite (Design A "Fokus"): ein Hauptbutton, darunter höchstens zwei Einträge zum Weitermachen
 * (Lernplan mit Einheit heute oder angefangenes Material), Lernplan und Einladen als Links unten.
 */
export function Home({
  plans,
  materials = [],
  onOpenMaterial,
  onAllMaterials,
  onQuick,
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
  onOpenPlan: (planId: string) => void;
  onNewPlan: () => void;
  onSettings: () => void;
  onLevels: () => void;
  onInvite?: () => void;
}) {
  const { t } = useT();
  const hour = new Date().getHours();
  const greeting = hour < 11 ? t.greetMorning : hour < 18 ? t.greetDay : t.greetEvening;
  const today = todayISO();

  // Laufende Pläne nach Testdatum; vorbei ist vorbei.
  const running = plans
    .filter((p) => daysBetween(today, p.goal.testDate) > 0)
    .sort((a, b) => daysBetween(today, a.goal.testDate) - daysBetween(today, b.goal.testDate));
  const resumable = [...materials].filter(isResumable).sort((a, b) => b.updatedAt - a.updatedAt);
  const latest = [...materials].sort((a, b) => b.updatedAt - a.updatedAt);

  // Höchstens zwei Einträge: zuerst der nächste Lernplan, dann angefangenes (oder sonst neuestes) Material.
  type Item = { kind: "plan"; plan: ActivePlan } | { kind: "material"; m: StoredMaterial };
  const items: Item[] = [];
  if (running[0]) items.push({ kind: "plan", plan: running[0] });
  for (const m of resumable.length ? resumable : latest) {
    if (items.length >= 2) break;
    items.push({ kind: "material", m });
  }
  if (items.length < 2 && running[1]) items.push({ kind: "plan", plan: running[1] });

  return (
    <div className="screen home home-a">
      <TopBar
        right={
          <div className="row" style={{ flexWrap: "nowrap", gap: 4 }}>
            <PunchPill onClick={onLevels} />
            <button type="button" className="iconbtn plain" onClick={onSettings} aria-label={t.settings}>
              <Icon name="gear" size={22} stroke={1.8} />
            </button>
          </div>
        }
      />

      <div className="stack home-a-body">
        <div className="stack" style={{ gap: 8 }}>
          <span className="home-a-greet">{greeting}</span>
          <h1 className="home-a-title">{t.homeHeadline}</h1>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <button type="button" className="home-a-cta" onClick={onQuick}>
            <Icon name="camera" size={26} stroke={2.4} />
            <span style={{ flex: 1 }}>{t.homeCta}</span>
            <Icon name="chevron" size={20} stroke={2.6} />
          </button>
          <span className="home-a-formats">{t.homeCtaSub}</span>
        </div>

        {items.length > 0 && (
          <div className="stack" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
              <span className="home-a-label">{t.continueTitle}</span>
              {materials.length > 0 && onAllMaterials && (
                <button type="button" className="link-btn" onClick={onAllMaterials}>{t.allMaterials}</button>
              )}
            </div>
            {items.map((item) =>
              item.kind === "plan" ? (
                <PlanRow key={item.plan.id} plan={item.plan} today={today} onClick={() => onOpenPlan(item.plan.id)} />
              ) : (
                <MaterialRow key={item.m.id} m={item.m} onClick={() => onOpenMaterial?.(item.m)} />
              )
            )}
          </div>
        )}

        <div className="home-a-links">
          <button type="button" className="link-btn" onClick={onNewPlan}>+ {t.planForTest}</button>
          {onInvite && (
            <button type="button" className="link-btn muted-link" onClick={onInvite}>{t.inviteFriends}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanRow({ plan, today, onClick }: { plan: ActivePlan; today: string; onClick: () => void }) {
  const { t } = useT();
  const daysLeft = daysBetween(today, plan.goal.testDate);
  const todayIndex = daysBetween(plan.startDate, today);
  const open = plan.sessions.filter((s) => s.dayIndex === todayIndex && !plan.done.includes(s.id));
  return (
    <button type="button" className="home-a-row" onClick={onClick}>
      <span className="home-a-rowicon"><Icon name="calendar" size={20} stroke={2} /></span>
      <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
        <span className="material-title">{plan.plan.title}</span>
        <span className={open.length ? "material-sub active" : "material-sub"}>
          {open.length ? `${t.today}: ${open[0].title}` : t.homePlanActive(daysLeft)}
        </span>
      </span>
      <Icon name="chevron" size={18} stroke={2.6} />
    </button>
  );
}

function MaterialRow({ m, onClick }: { m: StoredMaterial; onClick: () => void }) {
  const { t } = useT();
  const p = m.progress;
  let ratio = 0;
  let label = "";
  if (p?.kind === "practice") {
    const total = m.result.format === "worksheet" || m.result.format === "test" ? m.result.data.tasks.length : p.results.length;
    ratio = total ? p.index / total : 0;
    label = `${p.index}/${total}`;
  } else if (p?.kind === "game") {
    const done = p.stars.filter((x) => x > 0).length + (p.bossDone ? 1 : 0);
    ratio = done / (p.stars.length + 1);
    label = `${done}/${p.stars.length + 1}`;
  }
  const ringStyle = { "--p": `${Math.round(ratio * 100)}%` } as CSSProperties;
  return (
    <button type="button" className="home-a-row" onClick={onClick}>
      {isResumable(m) ? (
        <span className="home-a-ring" style={ringStyle}>
          <span>{label}</span>
        </span>
      ) : (
        <span className="home-a-rowicon"><Icon name={m.result.format} size={20} stroke={2} /></span>
      )}
      <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
        <span className="material-title">{materialTitle(m)}</span>
        <span className="material-sub">{t.formats[m.result.format]} · {materialStatus(m, t)}</span>
      </span>
      <Icon name="chevron" size={18} stroke={2.6} />
    </button>
  );
}
