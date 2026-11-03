"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";

// Sobald die App im Play Store ist: NEXT_PUBLIC_PLAY_STORE_URL in Vercel setzen, dann erscheint der Download-Button.
const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL;

function PhoneIcon() {
  return (
    <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M11 18h2" />
    </svg>
  );
}

/** Auffälliger Hinweis auf die Android-App (Startseite und About-Seite). */
export function AndroidAppPromo({ showMore = true }: { showMore?: boolean }) {
  const { t } = useLanguage();
  const p = t.appPromo;

  return (
    <section
      id="app"
      aria-labelledby="app-promo-title"
      className="w-full rounded-3xl border border-brand-400/40 bg-brand-400/10 p-6 text-left sm:p-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-400 text-black">
          <PhoneIcon />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <span className="w-fit rounded-full bg-brand-400 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-black">{p.badge}</span>
          <h2 id="app-promo-title" className="text-xl font-bold sm:text-2xl">{p.title}</h2>
          <p className="text-zinc-300">{p.text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {PLAY_STORE_URL ? (
              <a href={PLAY_STORE_URL} className="rounded-full bg-brand-400 px-6 py-3 font-semibold text-black hover:bg-brand-300">
                {p.playCta}
              </a>
            ) : (
              <>
                <span className="rounded-full border border-zinc-600 px-4 py-2.5 text-sm font-semibold text-zinc-300">{p.soon}</span>
                <Link href="/feedback" className="rounded-full bg-brand-400 px-6 py-3 font-semibold text-black hover:bg-brand-300">
                  {p.betaCta}
                </Link>
              </>
            )}
            {showMore && (
              <Link href="/about#app-details" className="px-2 py-3 text-sm font-semibold text-brand-400 hover:text-brand-300">
                {p.more} →
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
