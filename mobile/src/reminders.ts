import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { addDays, daysBetween, todayISO } from "./dates";
import type { ActivePlan } from "./types";

// Lernplan-Erinnerungen als lokale Benachrichtigungen: die App plant sie selbst auf dem Handy,
// ohne Server. Bei jeder Planänderung werden alle neu berechnet.

const KEY = "paperpunch-reminders";
const MAX = 60; // Android erlaubt nur eine begrenzte Zahl geplanter Alarme pro App

export interface ReminderSettings {
  on: boolean;
  time: string; // "HH:MM"
  asked: boolean; // Erlaubnis schon einmal angefragt
}

export interface ReminderTexts {
  title: string;
  today: (sessions: string) => string;
  testTomorrow: (plan: string) => string;
}

export function loadReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { on: false, time: "17:00", asked: false, ...(JSON.parse(raw) as Partial<ReminderSettings>) };
  } catch {
    // ignorieren
  }
  return { on: false, time: "17:00", asked: false };
}

export function saveReminderSettings(s: ReminderSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignorieren
  }
}

export const remindersSupported = () => Capacitor.isNativePlatform();

/** Fragt die Erlaubnis an (Android 13+). true, wenn Benachrichtigungen erlaubt sind. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!remindersSupported()) return false;
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return true;
    const asked = await LocalNotifications.requestPermissions();
    return asked.display === "granted";
  } catch {
    return false;
  }
}

function at(dateISO: string, time: string): Date {
  const [h, m] = time.split(":").map((n) => Number(n) || 0);
  const [y, mo, d] = dateISO.split("-").map(Number);
  return new Date(y, mo - 1, d, h, m, 0, 0);
}

/** Alle geplanten Erinnerungen löschen und aus den aktuellen Plänen neu planen. */
export async function rescheduleReminders(plans: ActivePlan[], texts: ReminderTexts): Promise<void> {
  if (!remindersSupported()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
    const settings = loadReminderSettings();
    if (!settings.on) return;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return;

    const now = Date.now();
    const today = todayISO();
    // pro Tag eine Nachricht, auch wenn mehrere Pläne laufen
    const byDay = new Map<string, { sessions: string[]; tests: string[] }>();
    for (const plan of plans) {
      const testIndex = daysBetween(plan.startDate, plan.goal.testDate);
      const fromIndex = Math.max(0, daysBetween(plan.startDate, today));
      for (let d = fromIndex; d < testIndex; d++) {
        const date = addDays(plan.startDate, d);
        const open = plan.sessions.filter((s) => s.dayIndex === d && !plan.done.includes(s.id));
        const entry = byDay.get(date) ?? { sessions: [], tests: [] };
        entry.sessions.push(...open.map((s) => s.title));
        if (d === testIndex - 1) entry.tests.push(plan.plan.title);
        byDay.set(date, entry);
      }
    }

    const notifications = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entry], i) => {
        const when = at(date, settings.time);
        const body = entry.tests.length
          ? texts.testTomorrow(entry.tests.join(", "))
          : entry.sessions.length
            ? texts.today(entry.sessions.slice(0, 2).join(" · "))
            : "";
        return { id: 1000 + i, title: texts.title, body, schedule: { at: when, allowWhileIdle: true } };
      })
      .filter((n) => n.body && n.schedule.at.getTime() > now)
      .slice(0, MAX);

    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch {
    // Erinnerungen sind ein Extra – Fehler nie in die App durchreichen
  }
}
