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
import { addPunches } from "@/lib/webapp/punches";
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
    // Punches wie in der App nur beim ersten Durchgang eines Levels, nicht im Mix-Level (Wiederholung).
    if (activeLevelId !== null && activeLevelId !== -1 && results[activeLevelId] === undefined) addPunches(amount);
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
        joker
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
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#1fd6ea]">{game.subject}</p>
          <h1 className="mt-1 text-[28px] font-black leading-tight tracking-tight">{game.gameTitle}</h1>
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

      <ol className="mx-auto flex max-w-md flex-col">
        {tiles.map((level, i) => {
          const isMixed = level.id === -1;
          const result = results[level.id];
          const colors = ["bg-[#1fd6ea] text-[#041b1e]", "bg-[#f23a8e] text-[#2a0516]", "bg-[#a8e43a] text-[#172405]"];
          return (
            <li key={level.id}>
              <button
                type="button"
                onClick={() => setActiveLevelId(level.id)}
                className={`flex w-full items-center gap-4 rounded-[24px] p-3.5 text-left transition active:scale-[0.98] ${
                  isMixed ? "bg-zinc-100 text-zinc-950" : "bg-[#15171b] ring-1 ring-white/[0.06]"
                }`}
              >
                <span className={`grid h-16 w-16 flex-none place-items-center rounded-[20px] text-2xl font-black ${isMixed ? "bg-zinc-950 text-[#1fd6ea]" : colors[i % 3]}`}>
                  {isMixed ? "🔀" : sortedLevels.indexOf(level) + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <b className="truncate text-base">{level.title}</b>
                  <span className={`text-xs font-semibold ${isMixed ? "text-zinc-600" : "text-zinc-400"}`}>
                    {isMixed ? t.game.mixedSubtitle : t.difficulty[level.difficulty] ?? level.difficulty}
                    {" · "}
                    {t.game.tasksCount(level.questions.length)}
                  </span>
                  <span className="text-sm tracking-widest text-[#ffd84a]">
                    {"★".repeat(result?.stars ?? 0)}
                    <span className="text-zinc-600">{"★".repeat(3 - (result?.stars ?? 0))}</span>
                  </span>
                </span>
              </button>
              {/* Weg zum nächsten Level, wie auf der Level-Karte der App */}
              {i < tiles.length - 1 && (
                <span aria-hidden="true" className="ml-[45px] block h-6 w-0 border-l-[3px] border-dashed border-zinc-600" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
