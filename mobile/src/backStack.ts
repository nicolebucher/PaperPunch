import { useEffect, useRef } from "react";

// Android-Zurück-Taste für Fenster/Sheets: Ein offenes Sheet legt einen Verlaufs-Eintrag an; "Zurück" schließt
// dann das oberste Sheet statt die App zu beenden (App.tsx ruft handleBack() im popstate-Handler zuerst auf).
// Wird das Sheet anders geschlossen (✕, Wischen, Hintergrund), räumen wir den Verlaufs-Eintrag still wieder ab.

const stack: (() => void)[] = [];
let ignorePops = 0;

/** Im popstate-Handler zuerst aufrufen: true = von einem Sheet erledigt, Ansicht nicht wechseln. */
export function handleBack(): boolean {
  if (ignorePops > 0) {
    ignorePops--;
    return true;
  }
  const close = stack.pop();
  if (close) {
    close();
    return true;
  }
  return false;
}

/** Solange active: Android-Zurück ruft onClose (statt die App zu schließen). */
export function useBackClose(active: boolean, onClose: () => void): void {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    if (!active) return;
    const handler = () => ref.current();
    stack.push(handler);
    window.history.pushState({ sheet: true }, "");
    return () => {
      const i = stack.lastIndexOf(handler);
      if (i >= 0) {
        // anders geschlossen: eigenen Verlaufs-Eintrag still entfernen
        stack.splice(i, 1);
        ignorePops++;
        window.history.back();
      }
    };
  }, [active]);
}
