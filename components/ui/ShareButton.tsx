"use client";

import { ShareIcon } from "@/components/icons/ActionIcons";
import { shareOrDownloadFile } from "@/lib/share";
import { useLanguage } from "@/lib/i18n/language-context";

export function ShareButton({ getFile, compact = false }: { getFile: () => File; compact?: boolean }) {
  const { t } = useLanguage();

  async function handleClick() {
    const file = getFile();
    await shareOrDownloadFile(file, file.name);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 rounded-full border border-zinc-700 font-medium text-white hover:border-brand-400 hover:text-brand-400 ${
        compact ? "px-4 py-2 text-sm" : "px-6 py-3 text-sm"
      }`}
    >
      <ShareIcon className="h-4 w-4" />
      {t.share.button}
    </button>
  );
}
