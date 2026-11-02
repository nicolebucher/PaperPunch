"use client";

import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { useLanguage } from "@/lib/i18n/language-context";

export default function Home() {
  const { t, locale } = useLanguage();

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col items-center px-4 py-24 text-center">
      <div className="mb-10">
        <Logo size="lg" />
      </div>
      <h1 className="text-xl font-bold sm:text-2xl">{t.landing.heading}</h1>
      <Link
        href="/create"
        className="mt-8 rounded-full bg-brand-400 px-8 py-3 font-medium text-black hover:bg-brand-300"
      >
        {t.landing.cta}
      </Link>
      <h2 className="mt-12 text-sm font-semibold uppercase tracking-wide text-brand-400">{t.landing.howItWorks}</h2>
      <p className="mt-2 max-w-xl text-zinc-400">{t.landing.subtitle}</p>
      <Image
        src={locale === "de" ? "/how-it-works-de.jpg" : "/how-it-works-en.jpg"}
        alt={t.landing.howItWorks}
        width={1438}
        height={2576}
        className="mt-8 w-full max-w-sm rounded-xl"
        priority
      />
    </main>
  );
}
