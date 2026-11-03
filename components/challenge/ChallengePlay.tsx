"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ChallengeRecord } from "@/lib/challenges";
import { useLanguage } from "@/lib/i18n/language-context";
import { LevelPlayer } from "@/components/game/LevelPlayer";

const NAME_KEY = "paperpunch-nickname";

const TEXT = {
  de: {
    from: (n: string) => `Challenge von ${n}`,
    beat: (p: number) => `Schaffst du mehr als ${p} % richtig?`,
    play: (title: string) => `Spiel „${title}“ mit!`,
    meta: (q: number, m: number) => `Lernspiel · ${q} Fragen · ca. ${m} Min.`,
    nick: "Dein Spitzname",
    nickPh: "z. B. Ben",
    accept: "Challenge annehmen",
    noApp: "Läuft im Browser – kein Download, keine Anmeldung",
    level: (i: number, n: number) => `Level ${i} von ${n}`,
    won: "Gewonnen! 🎉",
    lost: "Knapp daneben!",
    tie: "Unentschieden!",
    done: "Geschafft!",
    wonText: (n: string, d: number) => `Du hast ${n} um ${d} Prozentpunkte geschlagen.`,
    lostText: (n: string, d: number) => `${n} liegt ${d} Prozentpunkte vorn. Revanche?`,
    tieText: (n: string) => `Genau so gut wie ${n}.`,
    you: "Du",
    challenger: "Hat dich herausgefordert",
    correct: (c: number, t: number) => `${c} von ${t} richtig`,
    back: "Zurückfordern",
    shareText: (n: string, p: number, title: string) => `Ich hab ${p} % richtig in „${title}“ 💪 Schaffst du mehr?`,
    copied: "Link kopiert – schick ihn weiter!",
    shareError: "Das hat nicht geklappt. Versuch es noch einmal.",
    own: "Eigene Übungen erstellen",
    ownSub: "Mit PaperPunch aus deinem Lernmaterial",
  },
  en: {
    from: (n: string) => `Challenge from ${n}`,
    beat: (p: number) => `Can you get more than ${p}% right?`,
    play: (title: string) => `Play “${title}”!`,
    meta: (q: number, m: number) => `Learning game · ${q} questions · approx. ${m} min`,
    nick: "Your nickname",
    nickPh: "e.g. Ben",
    accept: "Accept challenge",
    noApp: "Runs in your browser – no download, no sign-up",
    level: (i: number, n: number) => `Level ${i} of ${n}`,
    won: "You won! 🎉",
    lost: "So close!",
    tie: "It's a tie!",
    done: "Done!",
    wonText: (n: string, d: number) => `You beat ${n} by ${d} percentage points.`,
    lostText: (n: string, d: number) => `${n} is ${d} percentage points ahead. Rematch?`,
    tieText: (n: string) => `Exactly as good as ${n}.`,
    you: "You",
    challenger: "Challenged you",
    correct: (c: number, t: number) => `${c} of ${t} correct`,
    back: "Challenge back",
    shareText: (n: string, p: number, title: string) => `I got ${p}% right in “${title}” 💪 Can you beat it?`,
    copied: "Link copied – send it on!",
    shareError: "That didn't work. Please try again.",
    own: "Create your own practice",
    ownSub: "With PaperPunch, from your study material",
  },
};

export function ChallengePlay({ challenge }: { challenge: ChallengeRecord }) {
  const { setLocale } = useLanguage();
  const lang = challenge.lang;
  const t = TEXT[lang];
  const levels = useMemo(() => [...challenge.game.levels].sort((a, b) => a.id - b.id), [challenge.game.levels]);
  const total = levels.reduce((s, l) => s + l.questions.length, 0);

  const [stage, setStage] = useState<"intro" | "play" | "result">("intro");
  const [name, setName] = useState("");
  const [levelIndex, setLevelIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Fragen und Texte in der Sprache der Challenge; Spitzname vom letzten Mal vorschlagen.
  useEffect(() => {
    setLocale(lang);
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      // ohne Speicher weiter
    }
  }, [lang, setLocale]);

  function start() {
    try {
      if (name.trim()) localStorage.setItem(NAME_KEY, name.trim());
    } catch {
      // ignorieren
    }
    setStage("play");
  }

  const pct = total ? Math.round((correct / total) * 100) : 0;
  const target = challenge.from.pct;

  async function challengeBack() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: challenge.game, name: name.trim() || t.you, pct, lang }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { url } = (await res.json()) as { url: string };
      const text = t.shareText(name, pct, challenge.game.gameTitle);
      if (navigator.share) {
        try {
          await navigator.share({ text, url });
        } catch {
          // abgebrochen
        }
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setNote(t.copied);
      }
    } catch {
      setNote(t.shareError);
    } finally {
      setBusy(false);
    }
  }

  if (stage === "play") {
    const level = levels[levelIndex];
    return (
      <div>
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.level(levelIndex + 1, levels.length)}</p>
        <LevelPlayer
          key={level.id}
          level={level}
          totalSnaps={correct}
          onSnap={() => undefined}
          onExit={() => setStage("intro")}
          onComplete={(result) => {
            setCorrect((c) => c + result.score);
            if (levelIndex + 1 < levels.length) setLevelIndex((i) => i + 1);
            else setStage("result");
          }}
        />
      </div>
    );
  }

  if (stage === "result") {
    const diff = target === undefined ? 0 : Math.abs(pct - target);
    const headline = target === undefined ? t.done : pct > target ? t.won : pct < target ? t.lost : t.tie;
    const text = target === undefined ? t.correct(correct, total) : pct > target ? t.wonText(challenge.from.name, diff) : pct < target ? t.lostText(challenge.from.name, diff) : t.tieText(challenge.from.name);
    const rows = [
      { label: name.trim() || t.you, sub: `${t.you} · ${t.correct(correct, total)}`, value: pct, me: true },
      ...(target !== undefined ? [{ label: challenge.from.name, sub: t.challenger, value: target, me: false }] : []),
    ].sort((a, b) => b.value - a.value);
    return (
      <div className="mx-auto flex max-w-md flex-col gap-5 py-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{challenge.game.gameTitle}</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">{headline}</h1>
          <p className="mt-2 text-zinc-400">{text}</p>
        </div>
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <div key={r.label + i} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${i === 0 ? "bg-zinc-100 text-zinc-900" : "border border-zinc-800 bg-zinc-950"}`}>
              <span className={`grid h-10 w-10 place-items-center rounded-full font-bold ${i === 0 ? "bg-zinc-900 text-yellow-300" : "bg-zinc-800"}`}>{i === 0 ? "🏆" : i + 1}</span>
              <span className="flex flex-1 flex-col">
                <b>{r.label}</b>
                <span className={`text-xs ${i === 0 ? "text-zinc-600" : "text-zinc-500"}`}>{r.sub}</span>
              </span>
              <span className="text-2xl font-extrabold">{r.value} %</span>
            </div>
          ))}
        </div>
        <button type="button" disabled={busy} onClick={() => void challengeBack()} className="rounded-2xl bg-white px-6 py-4 font-bold text-black disabled:opacity-60">
          ⚔️ {t.back}
        </button>
        {note && <p className="text-center text-sm text-zinc-400">{note}</p>}
        <Link href="/" className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-400 text-xl">📷</span>
          <span className="flex flex-col">
            <b>{t.own}</b>
            <span className="text-sm text-zinc-400">{t.ownSub}</span>
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 py-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-pink-500 to-brand-400 text-4xl">⚔️</span>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.from(challenge.from.name)}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{target !== undefined ? t.beat(target) : t.play(challenge.game.gameTitle)}</h1>
        <p className="text-zinc-400">
          {challenge.game.gameTitle} · {t.meta(total, Math.max(3, Math.round(total / 3)))}
        </p>
      </div>
      <label className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.nick}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          placeholder={t.nickPh}
          maxLength={20}
          className="h-12 rounded-xl border border-zinc-700 bg-black px-4 text-base font-semibold outline-none focus:border-brand-400"
        />
      </label>
      <button type="button" onClick={start} className="rounded-2xl bg-brand-400 px-6 py-4 text-lg font-bold text-black">
        {t.accept}
      </button>
      <p className="text-center text-xs text-zinc-500">{t.noApp}</p>
    </div>
  );
}
