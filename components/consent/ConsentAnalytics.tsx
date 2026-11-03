"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";

// Google Analytics 4 nur nach Einwilligung (EU/DSGVO). Ohne Klick auf "Akzeptieren" wird kein
// Google-Skript geladen und kein Cookie gesetzt. Die Wahl bleibt im Browser gespeichert und lässt sich
// über "Cookie-Einstellungen" im Footer jederzeit ändern (Event "pp-open-consent").
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-MQJJH71D5X";
const KEY = "pp-consent-analytics";

type Choice = "granted" | "denied" | null;

function readChoice(): Choice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function openConsentSettings() {
  window.dispatchEvent(new Event("pp-open-consent"));
}

export function ConsentAnalytics() {
  const { t } = useLanguage();
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const c = readChoice();
    setChoice(c);
    setOpen(c === null);
    setReady(true);
    const reopen = () => setOpen(true);
    window.addEventListener("pp-open-consent", reopen);
    return () => window.removeEventListener("pp-open-consent", reopen);
  }, []);

  function decide(c: "granted" | "denied") {
    try {
      localStorage.setItem(KEY, c);
    } catch {
      // ohne Speicher gilt die Wahl nur für diesen Besuch
    }
    if (c === "denied" && choice === "granted") {
      // Widerruf: GA-Cookies entfernen und neu laden, damit das Skript sicher weg ist
      document.cookie.split(";").forEach((cookie) => {
        const name = cookie.split("=")[0].trim();
        if (name.startsWith("_ga")) document.cookie = `${name}=; Max-Age=0; path=/; domain=.${location.hostname.replace(/^www\./, "")}`;
      });
      localStorage.setItem(KEY, c);
      location.reload();
      return;
    }
    setChoice(c);
    setOpen(false);
  }

  return (
    <>
      {choice === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', { allow_google_signals: false, allow_ad_personalization_signals: false });`}
          </Script>
        </>
      )}
      {ready && open && (
        <div
          role="dialog"
          aria-labelledby="consent-title"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-700 bg-zinc-900/95 px-4 py-4 backdrop-blur sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-md sm:rounded-2xl sm:border"
        >
          <p id="consent-title" className="font-semibold text-white">{t.consent.title}</p>
          <p className="mt-1 text-sm text-zinc-300">
            {t.consent.text}{" "}
            <a href="/privacy" className="text-brand-400 underline hover:text-brand-300">{t.consent.more}</a>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => decide("granted")} className="rounded-full bg-brand-400 px-5 py-2 text-sm font-semibold text-black hover:bg-brand-300">
              {t.consent.accept}
            </button>
            <button type="button" onClick={() => decide("denied")} className="rounded-full border border-zinc-600 px-5 py-2 text-sm font-semibold text-white hover:border-zinc-400">
              {t.consent.decline}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
