import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { addDays, daysBetween, todayISO } from "./dates";
import type { ActivePlan } from "./types";

// Lernplan-Erinnerungen als lokale Benachrichtigungen: die App plant sie selbst auf dem Handy,
// ohne Server. Bei jeder Planänderung werden alle neu berechnet.

const KEY = "paperpunch-reminders";
// Für die Push-Statistik (nur Zähler, gehen mit der nächsten Besuchsmeldung an den Server, siehe visitBeacon.ts)
const SCHED_KEY = "paperpunch-reminders-sched"; // Zeitpunkte (ms) der geplanten, noch nicht fälligen Erinnerungen
const STAT_KEY = "paperpunch-push-stat"; // { delivered, tapped } seit der letzten Meldung
const ACTIVE_KEY = "paperpunch-reminders-active"; // "1", wenn Erinnerungen an und erlaubt sind
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

interface PushStat {
  delivered: number;
  tapped: number;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    if (Array.isArray(fallback)) return (Array.isArray(parsed) ? parsed : fallback) as T;
    return { ...fallback, ...parsed } as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignorieren
  }
}

/** Fällig gewordene Erinnerungen als zugestellt zählen (Android zeigt sie ohne die App an). */
function collectDelivered(): void {
  const sched = readJson<number[]>(SCHED_KEY, []);
  if (!Array.isArray(sched) || !sched.length) return;
  const now = Date.now();
  const due = sched.filter((t) => t <= now).length;
  if (!due) return;
  const stat = readJson<PushStat>(STAT_KEY, { delivered: 0, tapped: 0 });
  writeJson(STAT_KEY, { ...stat, delivered: stat.delivered + due });
  writeJson(SCHED_KEY, sched.filter((t) => t > now));
}

/** Zähler seit der letzten Meldung holen und zurücksetzen; rem = Erinnerungen an und erlaubt. */
export function takePushStat(): { rem: boolean; delivered: number; tapped: number } {
  collectDelivered();
  const stat = readJson<PushStat>(STAT_KEY, { delivered: 0, tapped: 0 });
  writeJson(STAT_KEY, { delivered: 0, tapped: 0 });
  let rem = false;
  try {
    rem = localStorage.getItem(ACTIVE_KEY) === "1";
  } catch {
    // ignorieren
  }
  return { rem, delivered: Math.max(0, stat.delivered | 0), tapped: Math.max(0, stat.tapped | 0) };
}

/** Antippen einer Erinnerung zählen (einmal beim App-Start registrieren). */
export function listenReminderTaps(): void {
  if (!remindersSupported()) return;
  try {
    void LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      if ((action?.notification?.id ?? 0) >= 9000) return; // "fertig"-Benachrichtigung zählt nicht als Erinnerung
      const stat = readJson<PushStat>(STAT_KEY, { delivered: 0, tapped: 0 });
      writeJson(STAT_KEY, { ...stat, tapped: stat.tapped + 1 });
    }).catch(() => undefined);
  } catch {
    // ignorieren
  }
}

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
    collectDelivered(); // was schon fällig war, gilt als zugestellt, bevor neu geplant wird
    writeJson(SCHED_KEY, []);
    try {
      localStorage.setItem(ACTIVE_KEY, "0");
    } catch {
      // ignorieren
    }
    const pending = await LocalNotifications.getPending();
    // nur Lernplan-Erinnerungen löschen, nicht die "fertig"-Benachrichtigung (readyNotice.ts, id 9001)
    const old = pending.notifications.filter((n) => n.id < 9000);
    if (old.length) {
      await LocalNotifications.cancel({ notifications: old.map((n) => ({ id: n.id })) });
    }
    const settings = loadReminderSettings();
    if (!settings.on) return;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return;
    try {
      localStorage.setItem(ACTIVE_KEY, "1");
    } catch {
      // ignorieren
    }

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

    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
      writeJson(SCHED_KEY, notifications.map((n) => n.schedule.at.getTime()));
    }
  } catch {
    // Erinnerungen sind ein Extra – Fehler nie in die App durchreichen
  }
}
