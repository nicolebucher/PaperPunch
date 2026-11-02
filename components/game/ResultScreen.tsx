"use client";

import type { Level } from "@/types/generation";
import { useLanguage } from "@/lib/i18n/language-context";
import type { LevelResult } from "./LevelPlayer";

export function ResultScreen({
  levels,
  results,
}: {
  levels: Level[];
  results: Record<number, LevelResult>;
}) {
  const { t } = useLanguage();
  const totalStars = levels.reduce((sum, level) => sum + (results[level.id]?.stars ?? 0), 0);
  const maxStars = levels.length * 3;

  return (
    <div className="mb-6 rounded-xl bg-brand-400/10 p-4 text-center">
      <p className="text-lg font-semibold">{t.game.done}</p>
      <p className="text-sm text-zinc-300">{t.game.starsCollected(totalStars, maxStars)}</p>
    </div>
  );
}
