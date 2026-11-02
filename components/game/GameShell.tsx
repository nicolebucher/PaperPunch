"use client";

import { useMemo, useState } from "react";
import type { GameData, Level } from "@/types/generation";
import { buildStandaloneGameHtml } from "@/lib/game/build-standalone-game-html";
import { buildMixedLevel } from "@/lib/game/build-mixed-level";
import { slugify } from "@/lib/slugify";
import { useLanguage } from "@/lib/i18n/language-context";
import { ShareButton } from "@/components/ui/ShareButton";
import { SnapIcon } from "@/components/icons/ActionIcons";
import { LevelPlayer, type LevelResult } from "./LevelPlayer";
import { ResultScreen } from "./ResultScreen";

export function GameShell({ game }: { game: GameData }) {
  const { locale, t } = useLanguage();
  const [results, setResults] = useState<Record<number, LevelResult>>({});
  const [activeLevelId, setActiveLevelId] = useState<number | null>(null);
  const [totalSnaps, setTotalSnaps] = useState(0);
  const [snapBump, setSnapBump] = useState(0);

  // Memoized on game.levels specifically (not recomputed on every render): earning a Snap
  // updates totalSnaps/snapBump state right here in GameShell, which re-renders this component
  // while a level is being played. Without this memo, sortedLevels was a fresh array every
  // render, which made the mixedLevel useMemo below recompute (and buildMixedLevel re-shuffle)
  // on every Snap - silently swapping the Mixed level's questions out from under the player
  // mid-round, which could desync the answered/Next-button state entirely.
  const sortedLevels = useMemo(() => [...game.levels].sort((a, b) => a.id - b.id), [game.levels]);
  const mixedLevel = useMemo(
    () => buildMixedLevel(sortedLevels, t.game.mixedTitle),
    [sortedLevels, t.game.mixedTitle]
  );
  const tiles: Level[] = mixedLevel ? [mixedLevel, ...sortedLevels] : sortedLevels;

  const activeLevel = tiles.find((level) => level.id === activeLevelId) ?? null;
  const allDone = sortedLevels.every((level) => results[level.id] !== undefined);

  function handleSnap(amount: number) {
    setTotalSnaps((prev) => prev + amount);
    setSnapBump((n) => n + 1);
  }

  function buildGameFile(): File {
    const html = buildStandaloneGameHtml(game, locale);
    return new File([html], `${slugify(game.gameTitle)}.html`, { type: "text/html" });
  }

  function handleDownload() {
    const file = buildGameFile();
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (activeLevel) {
    return (
      <LevelPlayer
        level={activeLevel}
        totalSnaps={totalSnaps}
        onExit={() => setActiveLevelId(null)}
        onSnap={handleSnap}
        onComplete={(result) => {
          if (activeLevel.id !== -1) {
            setResults((prev) => ({ ...prev, [activeLevel.id]: result }));
          }
          setActiveLevelId(null);
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-bold">{game.gameTitle}</h1>
          <p className="text-sm text-zinc-400">{game.subject}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div
            key={snapBump}
            className="flex items-center gap-1.5 rounded-full bg-brand-400/10 px-3 py-1.5 text-sm font-semibold text-brand-300 animate-snap-pop"
          >
            <SnapIcon className="h-4 w-4" />
            {totalSnaps} {t.game.snapsUnit}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-full border border-brand-400 px-4 py-2 text-sm font-medium text-brand-400 hover:bg-brand-400/10"
            >
              {t.game.download}
            </button>
            <ShareButton getFile={buildGameFile} compact />
          </div>
        </div>
      </div>

      {allDone && <ResultScreen levels={sortedLevels} results={results} />}

      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map((level) => {
          const isMixed = level.id === -1;
          const result = results[level.id];
          return (
            <button
              key={level.id}
              type="button"
              onClick={() => setActiveLevelId(level.id)}
              className={`rounded-xl border p-4 text-left transition ${
                isMixed
                  ? "border-brand-400/60 bg-brand-400/5 hover:border-brand-400"
                  : "border-zinc-700 bg-zinc-950 hover:border-brand-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {isMixed ? "🔀 " : ""}
                  {level.title}
                </span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                {isMixed ? t.game.mixedSubtitle : t.difficulty[level.difficulty] ?? level.difficulty}
                {" · "}
                {t.game.tasksCount(level.questions.length)}
              </p>
              {result && (
                <p className="mt-2 text-sm">
                  {"⭐".repeat(result.stars)}
                  {"☆".repeat(3 - result.stars)}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
