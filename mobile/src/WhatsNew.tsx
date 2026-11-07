import { useEffect, useState } from "react";
import { useT } from "./i18n";
import { markWhatsNewSeen, WHATS_NEW, whatsNewToShow, type WhatsNewEntry } from "./whatsNew";
import { totalPunches } from "./punches";

// „Was ist neu“ in der App: einmal nach einem Update als Fenster von unten, in der App-Sprache (Deutsch/Englisch).
// Wer noch nichts gemacht hat (keine Punches), bekommt es nicht. In den Einstellungen jederzeit nachlesbar.

const OPEN_EVENT = "paperpunch-whatsnew-open";

export function openWhatsNew(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function WhatsNew({ ready }: { ready: boolean }) {
  const { t, lang } = useT();
  const [entries, setEntries] = useState<WhatsNewEntry[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const open = () => setEntries(WHATS_NEW.slice(0, 3));
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  // erst prüfen, wenn die Startseite steht (nach Splash/Onboarding)
  useEffect(() => {
    if (!ready || checked) return;
    setChecked(true);
    const show = whatsNewToShow(totalPunches() > 0);
    if (show.length) setEntries(show);
  }, [ready, checked]);

  if (!entries.length) return null;
  const close = () => {
    markWhatsNewSeen();
    setEntries([]);
  };
  return (
    <div className="sheet-backdrop whatsnew" role="dialog" aria-modal="true" aria-labelledby="whatsnew-title" onClick={close}>
      <div className="whatsnew-sheet" onClick={(e) => e.stopPropagation()}>
        {entries.map((e, i) => {
          const c = lang === "de" ? e.de : e.en;
          return (
            <div key={e.id} className="stack" style={{ gap: 10 }}>
              {i === 0 ? <h2 id="whatsnew-title" className="display" style={{ fontSize: 24 }}>{c.title}</h2> : <span className="eyebrow">{e.date}</span>}
              <ul className="whatsnew-list">
                {c.items.map((it) => {
                  const [icon, ...rest] = it.split(" ");
                  return (
                    <li key={it}>
                      <span aria-hidden="true">{icon}</span>
                      <span>{rest.join(" ")}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        <button type="button" className="btn dark block" onClick={close}>{t.whatsNewOk}</button>
      </div>
    </div>
  );
}
