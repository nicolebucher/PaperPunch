"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import { openConsentSettings } from "@/components/consent/ConsentAnalytics";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-zinc-800 py-6">
      <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-4 px-4 text-xs text-zinc-500">
        <Link href="/about" className="hover:text-brand-400">
          {t.footer.about}
        </Link>
        <Link href="/imprint" className="hover:text-brand-400">
          {t.footer.imprint}
        </Link>
        <Link href="/terms" className="hover:text-brand-400">
          {t.footer.terms}
        </Link>
        <Link href="/privacy" className="hover:text-brand-400">
          {t.footer.privacy}
        </Link>
        <Link href="/feedback" className="hover:text-brand-400">
          {t.footer.feedback}
        </Link>
        <button type="button" onClick={openConsentSettings} className="hover:text-brand-400">
          {t.footer.cookies}
        </button>
        <a href="mailto:hello@paper-punch.com" className="hover:text-brand-400">
          {t.footer.contact}: hello@paper-punch.com
        </a>
      </div>
    </footer>
  );
}
