"use client";

import type { ComponentType } from "react";
import type { OutputFormat } from "@/types/generation";
import { useLanguage } from "@/lib/i18n/language-context";
import { GameIcon, PodcastIcon, SpellingIcon, TestIcon, WorksheetIcon } from "@/components/icons/FormatIcons";

const ICONS: Record<OutputFormat, ComponentType<{ className?: string }>> = {
  worksheet: WorksheetIcon,
  test: TestIcon,
  game: GameIcon,
  podcast: PodcastIcon,
  spelling: SpellingIcon,
};

const ROTATIONS: Record<OutputFormat, string> = {
  worksheet: "-rotate-6",
  test: "rotate-3",
  game: "-rotate-3",
  podcast: "rotate-6",
  spelling: "rotate-2",
};

const DRIP_PATH = "M10 2c-2 4-4 6-4 9a4 4 0 0 0 8 0c0-3-2-5-4-9z";

// "beta": still fully usable, just newer/less polished. "soon": not selectable yet.
const BADGES: Partial<Record<OutputFormat, "beta" | "soon">> = {
  game: "beta",
  spelling: "beta",
  podcast: "soon",
};

export function FormatSelector({
  value,
  onChange,
}: {
  value: OutputFormat | null;
  onChange: (value: OutputFormat) => void;
}) {
  const { t } = useLanguage();
  const formats: { value: OutputFormat; label: string; description: string }[] = [
    { value: "worksheet", ...t.format.worksheet },
    { value: "test", ...t.format.test },
    { value: "game", ...t.format.game },
    { value: "podcast", ...t.format.podcast },
    { value: "spelling", ...t.format.spelling },
  ];

  return (
    <div className="mb-6">
      <p className="mb-2 text-sm font-bold">{t.format.heading}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {formats.map((f) => {
          const Icon = ICONS[f.value];
          const selected = value === f.value;
          const badge = BADGES[f.value];
          const disabled = badge === "soon";
          return (
            <button
              key={f.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(f.value)}
              className={`flex items-center gap-4 rounded-xl border p-4 text-left transition ${
                disabled
                  ? "cursor-not-allowed border-zinc-800 opacity-50"
                  : selected
                    ? "border-brand-400 bg-brand-400/10"
                    : "border-zinc-700 hover:border-brand-400/50"
              }`}
            >
              <div
                className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${ROTATIONS[f.value]} ${
                  selected && !disabled ? "bg-brand-400 text-black" : "bg-zinc-800 text-brand-400"
                }`}
              >
                <Icon className="h-8 w-8" />
                <svg
                  aria-hidden
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`absolute h-2.5 w-2.5 ${selected && !disabled ? "text-black/70" : "text-brand-400"}`}
                  style={{ left: "78%", top: "80%" }}
                >
                  <path d={DRIP_PATH} />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{f.label}</span>
                  {badge === "beta" && (
                    <span className="rounded-full bg-brand-400/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-300">
                      {t.format.betaBadge}
                    </span>
                  )}
                  {badge === "soon" && (
                    <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                      {t.format.comingSoonBadge}
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400">{f.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
