"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { markWhatsNewSeen, WHATS_NEW, whatsNewToShow, type WhatsNewEntry } from "@/lib/whats-new";
import { totalPunches } from "@/lib/webapp/punches";
import { track } from "@/lib/analytics";

// „Was ist neu“ in der Web-App: einmal nach einem Update als kleines Fenster unten (Deutsch oder Englisch je nach
// eingestellter Sprache). Wer noch nichts gemacht hat, bekommt es nicht. Über das Menü jederzeit nachlesbar.

const OPEN_EVENT = "paperpunch-whatsnew-open";

/** Fenster mit allen Einträgen öffnen (Menüpunkt „Was ist neu“). */
export function openWhatsNew(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function knownUser(): boolean {
  try {
    return totalPunches() > 0 || (localStorage.getItem("paperpunch-web-materials") ?? "[]") !== "[]";
  } catch {
    return false;
  }
}

export function WhatsNew() {
  const { locale } = useLanguage();
  const [entries, setEntries] = useState<WhatsNewEntry[]>([]);

  useEffect(() => {
    const show = whatsNewToShow(knownUser());
    if (show.length) {
      setEntries(show);
      track("whats_new_shown", { id: show[0].id });
    }
    const open = () => setEntries(WHATS_NEW.slice(0, 3));
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  if (!entries.length) return null;
  const de = locale === "de";
  const close = () => {
    markWhatsNewSeen();
    setEntries([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="whatsnew-title" onClick={close}>
      <div className="flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-[28px] bg-white p-6 text-zinc-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {entries.map((e, i) => {
          const c = de ? e.de : e.en;
          return (
            <div key={e.id} className="flex flex-col gap-3">
              {i === 0 ? (
                <h2 id="whatsnew-title" className="text-2xl font-black">{c.title}</h2>
              ) : (
                <h3 className="pt-2 text-sm font-extrabold uppercase tracking-wide text-zinc-500">{new Date(e.date).toLocaleDateString(de ? "de-DE" : "en-GB", { day: "numeric", month: "long" })}</h3>
              )}
              <ul className="flex flex-col gap-2.5">
                {c.items.map((it) => {
                  const [icon, ...rest] = it.split(" ");
                  return (
                    <li key={it} className="flex gap-3 rounded-2xl bg-zinc-50 px-3.5 py-3 text-[15px] font-semibold leading-snug">
                      <span className="w-7 flex-none text-center text-xl" aria-hidden="true">{icon}</span>
                      <span>{rest.join(" ")}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        <button type="button" onClick={close} className="w-full rounded-[20px] bg-zinc-900 px-5 py-4 text-[17px] font-extrabold text-white active:scale-[0.98]">
          {de ? "Cool, los geht's!" : "Cool, let's go!"}
        </button>
      </div>
    </div>
  );
}
