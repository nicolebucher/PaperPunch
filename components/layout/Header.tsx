"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { useLanguage } from "@/lib/i18n/language-context";
import { locales, type Locale } from "@/lib/i18n/translations";

export function Header() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <header className="border-b border-zinc-800">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
        <nav className="flex items-center gap-3 text-sm font-medium sm:gap-4">
          <Link href="/about" className="hidden text-zinc-300 hover:text-white sm:inline">
            {t.about.navLabel}
          </Link>
          <Link href="/about#app" className="flex items-center gap-1.5 rounded-full bg-brand-400/15 px-3 py-1.5 text-brand-300 hover:bg-brand-400/25">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            {t.appPromo.headerLink}
          </Link>
        </nav>
        <div className="flex gap-1 rounded-full border border-zinc-700 p-1 text-xs">
          {locales.map((option: Locale) => (
            <button
              key={option}
              type="button"
              onClick={() => setLocale(option)}
              className={`rounded-full px-2 py-1 font-medium uppercase transition ${
                locale === option ? "bg-brand-400 text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        </div>
      </div>
    </header>
  );
}
