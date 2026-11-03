import { daysBetween, todayISO, type WebPlan } from "@/lib/webapp/store";
import type { AppText } from "./text";

export function relDate(ts: number, locale: string, tx: Pick<AppText, "today" | "yesterday">): string {
  const d = new Date(ts);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const diff = daysBetween(iso, todayISO());
  if (diff === 0) return tx.today;
  if (diff === 1) return tx.yesterday;
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

/** Heutige, noch offene Einheit eines Lernplans (oder die nächste offene, falls heute nichts ansteht). */
export function todaysSession(plan: WebPlan) {
  const dayIndex = daysBetween(plan.startDate, todayISO());
  const open = plan.plan.sessions.map((s, i) => ({ ...s, index: i })).filter((s) => !plan.done.includes(s.index));
  return open.find((s) => s.dayIndex === dayIndex) ?? open.find((s) => s.dayIndex > dayIndex);
}
