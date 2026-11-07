// Was ist neu – identisch in mobile/src/whatsNewData.ts (bei Änderungen beide anpassen).
// „Was ist neu“: kurze Hinweise auf neue Funktionen, einmal nach einem Update (Website: components/webapp/WhatsNew.tsx,
// App: mobile/src/WhatsNew.tsx). Neuer Eintrag = oben mit der nächsten id einfügen. Texte kindgerecht und kurz,
// nicht wie im Changelog. Website und App nutzen dieselbe Liste (lib/whats-new.ts = mobile/src/whatsNewData.ts ab Zeile 2).

export interface WhatsNewEntry {
  id: number;
  date: string;
  de: { title: string; items: string[] };
  en: { title: string; items: string[] };
}

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: 1,
    date: "2026-11-07",
    de: {
      title: "Neu bei PaperPunch ✨",
      items: [
        "⏱ Blitzrunde: 60 Sekunden, so viele Fragen wie möglich – knackst du deinen Rekord?",
        "🧩 Neue Spielfragen: Zuordnen, Sätze bauen und Dinge in die richtige Reihenfolge bringen",
        "💡 Tipp-Button: Wenn du nicht weiterweißt, zeigt er dir den ersten Buchstaben",
        "📝 Online lösen: Aufgabe für Aufgabe, mit kurzer Erklärung nach jeder Antwort",
      ],
    },
    en: {
      title: "New in PaperPunch ✨",
      items: [
        "⏱ Speed round: 60 seconds, as many questions as you can – can you beat your record?",
        "🧩 New game questions: matching, building sentences and putting things in the right order",
        "💡 Hint button: stuck? It shows you the first letter",
        "📝 Solve online: one task at a time, with a short explanation after each answer",
      ],
    },
  },
];

const SEEN_KEY = "paperpunch-whatsnew-seen";

function readSeen(): number | null {
  try {
    const v = localStorage.getItem(SEEN_KEY);
    return v === null ? null : Number(v) || 0;
  } catch {
    return null;
  }
}

/** Gesehen merken (neueste id). */
export function markWhatsNewSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, String(WHATS_NEW[0]?.id ?? 0));
  } catch {
    // ohne Speicher erscheint der Hinweis eben noch einmal
  }
}

/**
 * Was beim Start gezeigt werden soll: neue Einträge seit dem letzten Mal (höchstens 2, neueste zuerst).
 * Ganz neue Nutzer:innen (noch nichts gemacht) sehen nichts – für sie ist alles neu; es wird nur als gesehen gemerkt.
 */
export function whatsNewToShow(knownUser: boolean): WhatsNewEntry[] {
  const seen = readSeen();
  if (seen === null && !knownUser) {
    markWhatsNewSeen();
    return [];
  }
  return WHATS_NEW.filter((e) => e.id > (seen ?? 0)).slice(0, 2);
}
