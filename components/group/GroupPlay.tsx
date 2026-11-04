"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GameData } from "@/types/generation";
import { useLanguage } from "@/lib/i18n/language-context";
import { LevelPlayer } from "@/components/game/LevelPlayer";
import { track } from "@/lib/analytics";
import { fetchBoard, fmtTime, saveGroup, submitToGroup, timeLeft, type Board, type BoardEntry } from "@/lib/webapp/groups";

const NAME_KEY = "paperpunch-nickname";

const TEXT = {
  de: {
    eyebrow: (n: string) => `Lerngruppe · ${n}`,
    who: (t: string) => `Wer schafft am meisten in „${t}“?`,
    meta: (q: number, m: number) => `Lernspiel · ${q} Fragen · ca. ${m} Min.`,
    players: "spielen schon mit",
    until: (s: string) => s,
    noEnd: "ohne Enddatum",
    nick: "Dein Spitzname",
    nickPh: "z. B. Ben",
    play: "Mitspielen",
    foot: "Läuft im Browser oder in der App – keine Anmeldung · Nur der erste Versuch zählt",
    level: (i: number, n: number) => `Level ${i} von ${n}`,
    saving: "Ergebnis wird eingetragen …",
    place: (r: number, n: number) => `Platz ${r} von ${n}${r <= 3 ? " 🔥" : ""}`,
    toFirst: (d: number) => `Noch ${d} % bis Platz 1.`,
    first: "Du bist ganz vorne!",
    onlyFirst: "Nur dein erster Versuch zählt – weiterüben kannst du trotzdem.",
    notYet: "Du hast noch nicht mitgespielt.",
    more: (n: number) => `+ ${n} weitere · Bei Gleichstand gewinnt, wer schneller war`,
    tieRule: "Bei Gleichstand gewinnt, wer schneller war",
    you: "Du",
    winner: (n: string) => `${n} hat gewonnen!`,
    winnerSub: (pct: number, t: string, r?: number) => `${pct} % richtig${t ? ` in ${t}` : ""}${r ? ` – du bist auf Platz ${r}.` : "."}`,
    nobody: "Niemand hat mitgespielt.",
    ended: "Beendet",
    share: "Gruppe teilen – mehr Mitspieler",
    shareWin: "Ergebnis teilen",
    newRound: "Neue Runde starten",
    copied: "Link kopiert – schick ihn weiter!",
    shareText: (n: string, t: string) => `Lerngruppe „${n}“: Wer schafft am meisten in „${t}“? 💪`,
    winText: (w: string, n: string) => `🏆 ${w} hat die Lerngruppe „${n}“ gewonnen!`,
    own: "Eigene Übungen erstellen",
    ownSub: "Mit PaperPunch aus deinem Lernmaterial",
    winnerTag: "Gewinner:in",
    endedOn: (d: string) => `Beendet · ${d}`,
    error: "Das hat nicht geklappt. Versuch es noch einmal.",
  },
  en: {
    eyebrow: (n: string) => `Study group · ${n}`,
    who: (t: string) => `Who gets the most right in “${t}”?`,
    meta: (q: number, m: number) => `Learning game · ${q} questions · approx. ${m} min`,
    players: "already playing",
    until: (s: string) => s,
    noEnd: "no end date",
    nick: "Your nickname",
    nickPh: "e.g. Ben",
    play: "Join in",
    foot: "Runs in the browser or the app – no sign-up · Only your first try counts",
    level: (i: number, n: number) => `Level ${i} of ${n}`,
    saving: "Saving your result …",
    place: (r: number, n: number) => `Place ${r} of ${n}${r <= 3 ? " 🔥" : ""}`,
    toFirst: (d: number) => `${d}% to first place.`,
    first: "You're in the lead!",
    onlyFirst: "Only your first try counts – you can still keep practising.",
    notYet: "You haven't played yet.",
    more: (n: number) => `+ ${n} more · On a tie, the faster player wins`,
    tieRule: "On a tie, the faster player wins",
    you: "You",
    winner: (n: string) => `${n} won!`,
    winnerSub: (pct: number, t: string, r?: number) => `${pct}% correct${t ? ` in ${t}` : ""}${r ? ` – you're in place ${r}.` : "."}`,
    nobody: "Nobody played.",
    ended: "Ended",
    share: "Share group – more players",
    shareWin: "Share result",
    newRound: "Start a new round",
    copied: "Link copied – send it on!",
    shareText: (n: string, t: string) => `Study group “${n}”: who gets the most right in “${t}”? 💪`,
    winText: (w: string, n: string) => `🏆 ${w} won the study group “${n}”!`,
    own: "Create your own practice",
    ownSub: "With PaperPunch, from your study material",
    winnerTag: "Winner",
    endedOn: (d: string) => `Ended · ${d}`,
    error: "That didn't work. Please try again.",
  },
};

export function GroupPlay({ code, name, lang, endsAt, game }: { code: string; name: string; lang: "de" | "en"; endsAt: string | null; game: GameData }) {
  const { setLocale } = useLanguage();
  const t = TEXT[lang];
  const levels = useMemo(() => [...game.levels].sort((a, b) => a.id - b.id), [game.levels]);
  const total = levels.reduce((s, l) => s + l.questions.length, 0);
  const [stage, setStage] = useState<"loading" | "intro" | "play" | "saving" | "board">("loading");
  const [board, setBoard] = useState<Board | null>(null);
  const [nick, setNick] = useState("");
  const [levelIndex, setLevelIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [note, setNote] = useState("");
  const startedAt = useRef(0);

  useEffect(() => {
    setLocale(lang);
    try {
      setNick(localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      // ohne Speicher
    }
    void fetchBoard(code).then((b) => {
      setBoard(b);
      const played = !!b?.me && b.entries.some((e) => e.me === b.me);
      setStage(b?.ended || played ? "board" : "intro");
      const idx = b?.me ? b.entries.findIndex((e) => e.me === b.me) : -1;
      saveGroup({ code, name, title: game.gameTitle, endsAt, ...(idx >= 0 ? { lastRank: idx + 1 } : {}) });
      track("group_opened", { played, ended: !!b?.ended });
    });
  }, [code, lang, setLocale, name, game.gameTitle, endsAt]);

  function start() {
    try {
      if (nick.trim()) localStorage.setItem(NAME_KEY, nick.trim());
    } catch {
      // ignorieren
    }
    startedAt.current = Date.now();
    track("group_join", { questions: total });
    setStage("play");
  }

  async function finish(finalCorrect: number) {
    setStage("saving");
    const pct = total ? Math.round((finalCorrect / total) * 100) : 0;
    const res = await submitToGroup(code, { name: nick.trim() || t.you, pct, correct: finalCorrect, total, ms: Date.now() - startedAt.current }).catch(() => null);
    if (res) {
      setBoard(res);
      const idx = res.me ? res.entries.findIndex((e) => e.me === res.me) : -1;
      if (idx >= 0) saveGroup({ code, name, title: game.gameTitle, endsAt, lastRank: idx + 1 });
    }
    else setNote(t.error);
    track("group_finished", { pct });
    setStage("board");
  }

  async function share(text: string) {
    const url = `https://paper-punch.com/g/${code}`;
    track("group_share");
    try {
      if (navigator.share) await navigator.share({ text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setNote(t.copied);
      }
    } catch {
      // abgebrochen
    }
  }

  if (stage === "loading") return <div className="py-24 text-center text-zinc-500">…</div>;

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
            const next = correct + result.score;
            setCorrect(next);
            if (levelIndex + 1 < levels.length) setLevelIndex((i) => i + 1);
            else void finish(next);
          }}
        />
      </div>
    );
  }

  if (stage === "saving") return <div className="py-24 text-center font-bold text-zinc-400">{t.saving}</div>;

  const entries = board?.entries ?? [];
  const left = timeLeft(endsAt, lang);

  if (stage === "intro") {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-5 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-pink-500 to-[#1fd6ea] text-4xl">👥</span>
          <p className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">{t.eyebrow(name)}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{t.who(game.gameTitle)}</h1>
          <p className="text-sm font-semibold text-zinc-400">{t.meta(total, Math.max(3, Math.round(total / 3)))}</p>
        </div>
        <div className="flex gap-2.5">
          <div className="flex flex-1 flex-col rounded-[20px] bg-[#15171b] p-4 ring-1 ring-white/[0.06]"><b className="text-2xl tracking-tight">{entries.length}</b><span className="text-xs font-bold text-zinc-400">{t.players}</span></div>
          <div className="flex flex-1 flex-col rounded-[20px] bg-[#15171b] p-4 ring-1 ring-white/[0.06]"><b className="text-2xl tracking-tight">{left ?? "∞"}</b><span className="text-xs font-bold text-zinc-400">{endsAt ? new Date(endsAt).toLocaleString(lang, { weekday: "short", hour: "2-digit", minute: "2-digit" }) : t.noEnd}</span></div>
        </div>
        <label className="flex flex-col gap-2 rounded-[20px] bg-[#15171b] p-4 ring-1 ring-white/[0.06]">
          <span className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">{t.nick}</span>
          <input value={nick} maxLength={20} placeholder={t.nickPh} onChange={(e) => setNick(e.target.value.slice(0, 20))} className="h-12 rounded-xl border border-zinc-700 bg-black px-4 text-base font-semibold outline-none focus:border-[#1fd6ea]" />
        </label>
        <button type="button" onClick={start} className="rounded-2xl bg-[#1fd6ea] px-6 py-4 text-lg font-extrabold text-black">{t.play}</button>
        <p className="text-center text-xs font-semibold text-zinc-500">{t.foot}</p>
      </div>
    );
  }

  // ---------- Rangliste ----------
  const meIdx = board?.me ? entries.findIndex((e) => e.me === board.me) : -1;
  const ended = !!board?.ended;
  const winner = entries[0];
  const top = entries.slice(0, 8);
  const showMe = meIdx >= 8 ? [entries[meIdx]] : [];
  const row = (e: BoardEntry, i: number) => {
    const me = e.me === board?.me;
    const medal = ended && i === 0 ? "🏆" : ["🥇", "🥈", "🥉"][i];
    return (
      <div key={e.me + i} className={`flex items-center gap-3 rounded-[18px] px-3.5 py-3 ${me ? "bg-zinc-100 text-zinc-950" : "bg-[#15171b] ring-1 ring-white/[0.06]"}`}>
        <span className={`grid h-9 w-9 place-items-center rounded-full font-extrabold ${medal ? "text-lg" : "text-sm"} ${me ? "bg-zinc-950 text-yellow-300" : "bg-[#22252b]"}`}>{medal ?? i + 1}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="truncate text-[15px]">{me ? `${t.you} (${e.name})` : e.name}</b>
          <span className={`text-xs font-semibold ${me ? "text-zinc-600" : "text-zinc-400"}`}>{ended && i === 0 ? `${t.winnerTag}${e.ms ? ` · ${fmtTime(e.ms)}` : ""}` : [`${e.correct}/${e.total}`, fmtTime(e.ms)].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="text-xl font-extrabold tracking-tight">{e.pct} %</span>
      </div>
    );
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-4">
      <div className="flex items-center gap-3">
        <span className="flex-1 truncate text-[15px] font-extrabold">{name}</span>
        {(left || ended) && <span className="rounded-full bg-[#22252b] px-3 py-1.5 text-xs font-extrabold">{ended ? (endsAt ? t.endedOn(new Date(endsAt).toLocaleString(lang, { weekday: "short", hour: "2-digit", minute: "2-digit" })) : t.ended) : left}</span>}
      </div>
      {ended ? (
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <span className="grid h-24 w-24 place-items-center rounded-full bg-yellow-300 text-5xl">👑</span>
          <p className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">{game.gameTitle} · {entries.length}</p>
          <h1 className="text-[34px] font-extrabold leading-none tracking-tight">{winner ? t.winner(winner.name) : t.nobody}</h1>
          {winner && <p className="text-sm font-semibold text-zinc-400">{t.winnerSub(winner.pct, fmtTime(winner.ms), meIdx > 0 ? meIdx + 1 : undefined)}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 px-0.5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">{game.gameTitle} · {entries.length}</p>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight">{meIdx >= 0 ? t.place(meIdx + 1, entries.length) : t.notYet}</h1>
          {meIdx >= 0 && <p className="text-sm font-semibold text-zinc-400">{meIdx === 0 ? t.first : t.toFirst(entries[0].pct - entries[meIdx].pct)} {t.onlyFirst}</p>}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {top.map(row)}
        {showMe.map((e) => row(e, meIdx))}
      </div>
      {entries.length > 8 ? <p className="text-center text-xs font-bold text-zinc-500">{t.more(entries.length - 8)}</p> : entries.length > 1 && <p className="text-center text-xs font-bold text-zinc-500">{t.tieRule}</p>}
      {note && <p className="text-center text-sm font-semibold text-zinc-400">{note}</p>}
      <div className="mt-2 flex flex-col gap-2.5">
        {ended ? (
          <>
            <Link href={`/app/groups/new?name=${encodeURIComponent(name)}&not=${encodeURIComponent(game.gameTitle)}`} onClick={() => track("group_new_round")} className="rounded-2xl bg-[#1fd6ea] px-6 py-4 text-center text-lg font-extrabold text-black">{t.newRound}</Link>
            {winner && <button type="button" onClick={() => void share(t.winText(winner.name, name))} className="rounded-2xl bg-[#15171b] px-6 py-4 font-extrabold ring-1 ring-white/[0.06]">↗ {t.shareWin}</button>}
          </>
        ) : (
          <>
            {meIdx < 0 && <button type="button" onClick={() => setStage("intro")} className="rounded-2xl bg-[#1fd6ea] px-6 py-4 text-lg font-extrabold text-black">{t.play}</button>}
            <button type="button" onClick={() => void share(t.shareText(name, game.gameTitle))} className="rounded-2xl bg-zinc-100 px-6 py-4 font-extrabold text-zinc-950">↗ {t.share}</button>
          </>
        )}
        <Link href="/app" className="mt-2 flex items-center gap-3 rounded-2xl bg-[#15171b] p-4 ring-1 ring-white/[0.06]">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#1fd6ea] text-xl">📷</span>
          <span className="flex flex-col"><b>{t.own}</b><span className="text-sm text-zinc-400">{t.ownSub}</span></span>
        </Link>
      </div>
    </div>
  );
}
