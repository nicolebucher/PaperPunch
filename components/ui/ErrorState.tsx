"use client";

import { useLanguage } from "@/lib/i18n/language-context";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="mb-2 text-lg font-semibold text-red-400">{t.error.title}</p>
      <p className="mb-6 text-sm text-zinc-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-brand-400 px-5 py-2 text-sm font-medium text-black hover:bg-brand-300"
      >
        {t.error.retry}
      </button>
    </div>
  );
}
