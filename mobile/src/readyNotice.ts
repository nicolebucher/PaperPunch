import { LocalNotifications } from "@capacitor/local-notifications";
import { remindersSupported } from "./reminders";

// "Dein Test ist fertig"-Benachrichtigung: Verlässt man die App, während ein Material erstellt wird, planen wir eine
// lokale Benachrichtigung zur erwarteten Fertig-Zeit (ohne Push-Dienst weiß das Handy nicht genau, wann der Server
// fertig ist). Kommt man vorher zurück oder ist es schon fertig, wird sie wieder gelöscht.

export const READY_NOTICE_ID = 9001;

/** Nur planen, wenn Benachrichtigungen schon erlaubt sind (gefragt wird beim Tippen auf "Im Hintergrund weiter"). */
export async function scheduleReadyNotice(inSeconds: number, title: string, body: string): Promise<void> {
  if (!remindersSupported()) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return;
    await LocalNotifications.cancel({ notifications: [{ id: READY_NOTICE_ID }] });
    await LocalNotifications.schedule({
      notifications: [{ id: READY_NOTICE_ID, title, body, schedule: { at: new Date(Date.now() + Math.max(10, inSeconds) * 1000), allowWhileIdle: true } }],
    });
  } catch {
    // Extra – Fehler nie in die App durchreichen
  }
}

export async function cancelReadyNotice(): Promise<void> {
  if (!remindersSupported()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: READY_NOTICE_ID }] });
  } catch {
    // ignorieren
  }
}
