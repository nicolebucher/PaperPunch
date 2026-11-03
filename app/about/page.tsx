"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import { AndroidAppPromo } from "@/components/app/AndroidAppPromo";

/** Über PaperPunch: was die App macht, wie sie funktioniert, die Android-App und Datenschutz in Kürze. */
export default function AboutPage() {
  const { t } = useLanguage();
  const a = t.about;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-14 px-4 py-16">
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold sm:text-4xl">{a.title}</h1>
        <p className="text-lg text-zinc-300">{a.lead}</p>
      </header>

      <AndroidAppPromo showMore={false} />

      <section className="flex flex-col gap-5">
        <h2 className="text-xl font-bold">{a.howTitle}</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {a.steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2 rounded-2xl border border-zinc-800 p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-400 text-sm font-bold text-black">{i + 1}</span>
              <span className="font-semibold">{step.title}</span>
              <span className="text-sm text-zinc-400">{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-xl font-bold">{a.formatsTitle}</h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {a.formats.map((f) => (
            <li key={f.title} className="flex flex-col gap-2 rounded-2xl border border-zinc-800 p-5">
              <span className="font-semibold">{f.title}</span>
              <span className="text-sm text-zinc-400">{f.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="app-details" className="flex scroll-mt-8 flex-col gap-4">
        <h2 className="text-xl font-bold">{a.appTitle}</h2>
        <p className="text-zinc-300">{a.appLead}</p>
        <ul className="flex flex-col gap-3">
          {a.appFeatures.map((feature) => (
            <li key={feature} className="flex gap-3 text-zinc-300">
              <svg aria-hidden="true" className="mt-0.5 shrink-0 text-brand-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-10" />
              </svg>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">{a.privacyTitle}</h2>
        <p className="text-zinc-300">{a.privacyText}</p>
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-zinc-800 p-6">
        <h2 className="text-xl font-bold">{a.contactTitle}</h2>
        <p className="text-zinc-300">{a.contactText}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/create" className="rounded-full bg-brand-400 px-6 py-3 font-semibold text-black hover:bg-brand-300">
            {a.startCta}
          </Link>
          <Link href="/feedback" className="rounded-full border border-zinc-600 px-6 py-3 font-semibold text-white hover:border-brand-400">
            {a.contactCta}
          </Link>
        </div>
      </section>
    </main>
  );
}
