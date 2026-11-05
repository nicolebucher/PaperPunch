"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { track } from "@/lib/analytics";
import { createGroupWeb, endOptions, homeworkOptions, saveGroup, teacherLink } from "@/lib/webapp/groups";
import { listMaterials, type WebMaterial } from "@/lib/webapp/store";
import { AppIcon, useAppText } from "./ui";
import { isBlockedName } from "@/lib/name-filter";

const NAME_KEY = "paperpunch-nickname";

/**
 * "Lerngruppe starten" (Entwurf G1): Lernspiel wählen oder neu erstellen, Ende, Gruppenname, Spitzname → Link teilen.
 * `material` setzt das Spiel fest (aus dem Ergebnis eines Lernspiels); `exclude` blendet ein Spiel aus (neue Runde).
 */
export function GroupCreate({ material, initialName = "", exclude, preselect }: { material?: WebMaterial; initialName?: string; exclude?: string; preselect?: string }) {
  const tx = useAppText();
  const { locale } = useLanguage();
  const lang = locale === "en" ? "en" : "de";
  const [games, setGames] = useState<WebMaterial[]>(material ? [material] : []);
  const [picked, setPicked] = useState(material?.id ?? "");
  const ends = endOptions(lang);
  const [end, setEnd] = useState("friday");
  // Hausaufgabe: Abgabe-Termin statt Ende, Rangliste nur in der Auswertung der Lehrkraft
  const [homework, setHomework] = useState(false);
  const dues = homeworkOptions(lang);
  const [due, setDue] = useState(dues[0]?.id ?? "");
  const [customDue, setCustomDue] = useState("");
  const [name, setName] = useState(initialName);
  const [nick, setNick] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [created, setCreated] = useState<{ code: string; url: string; endsAt?: string | null; teacherKey?: string; homework?: boolean } | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      setNick(localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      // ohne Speicher
    }
    if (!material) {
      const list = listMaterials().filter((m) => m.game && m.title !== exclude);
      setGames(list);
      setPicked(list.find((g) => g.id === preselect)?.id ?? list[0]?.id ?? "");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [material, exclude, preselect]);

  const chosen = games.find((g) => g.id === picked);

  async function share(url: string, groupName: string, title: string, hw = false, endsAt: string | null = null) {
    const dueLabel = endsAt ? new Date(endsAt).toLocaleString(lang === "de" ? "de-DE" : "en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "";
    const text = hw ? tx.hwShareText(title, dueLabel) : tx.groupShareText(groupName, title);
    try {
      if (navigator.share) await navigator.share({ text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setNote(tx.groupCopied);
      }
    } catch {
      // abgebrochen
    }
  }

  function dueAt(): string | null {
    if (due !== "custom") return dues.find((d) => d.id === due)?.endsAt ?? null;
    const t = customDue ? new Date(customDue).getTime() : NaN;
    return Number.isFinite(t) && t > Date.now() + 10 * 60_000 && t < Date.now() + 14 * 86_400_000 ? new Date(t).toISOString() : null;
  }

  async function create() {
    if (!chosen?.game || busy) return;
    setBusy(true);
    setNote("");
    try {
      if (nick.trim()) localStorage.setItem(NAME_KEY, nick.trim());
    } catch {
      // ignorieren
    }
    try {
      const endsAt = homework ? dueAt() : ends.find((e) => e.id === end)?.endsAt ?? null;
      if (homework && !endsAt) {
        setNote(tx.hwPickDue);
        return;
      }
      const res = await createGroupWeb({ game: chosen.game, name: name.trim(), by: nick.trim(), lang, endsAt, homework });
      saveGroup({ code: res.code, name: res.name, title: chosen.game.gameTitle, endsAt: res.endsAt, teacherKey: res.teacherKey, homework: !!res.homework });
      track("group_created", { end: homework ? `hw-${due}` : end, has_name: !!name.trim(), homework });
      setCreated(res);
      await share(res.url, res.name, chosen.game.gameTitle, !!res.homework, res.endsAt);
    } catch {
      setNote(tx.groupError);
    } finally {
      setBusy(false);
    }
  }

  const chip = (on: boolean) => `h-10 rounded-full px-4 text-sm font-bold ${on ? "bg-zinc-100 text-zinc-950" : "bg-[#22252b] text-zinc-100"}`;

  if (created && chosen) {
    return (
      <div className="flex flex-col gap-3 rounded-[24px] bg-[#15171b] p-4 ring-1 ring-white/[0.06]">
        <b className="text-lg">{created.homework ? tx.hwCreated : tx.groupCreated}</b>
        <span className="break-all rounded-xl bg-black px-3 py-2.5 text-sm font-bold text-[#1fd6ea]">{created.url}</span>
        <button type="button" onClick={() => void share(created.url, name.trim() || chosen.game!.gameTitle, chosen.game!.gameTitle, !!created.homework, created.endsAt ?? null)} className="rounded-2xl bg-[#1fd6ea] px-5 py-3.5 font-extrabold text-black">↗ {created.homework ? tx.hwShare : tx.groupShare}</button>
        <Link href={`/g/${created.code}`} className="rounded-2xl bg-zinc-100 px-5 py-3.5 text-center font-extrabold text-zinc-950">{tx.groupPlaySelf}</Link>
        {created.teacherKey && (
          <div className="flex flex-col gap-2 rounded-[18px] bg-[#1b1d22] p-3.5">
            <b className="text-[15px]">{tx.teacherTitle}</b>
            <span className="text-xs font-semibold leading-snug text-zinc-400">{tx.teacherHint}</span>
            <Link href={teacherLink(created.code, created.teacherKey)} onClick={() => track("teacher_report_open", { from: "create" })} className="rounded-xl bg-[#22252b] px-4 py-3 text-center text-sm font-extrabold text-[#1fd6ea]">{tx.teacherOpen}</Link>
          </div>
        )}
        {note && <p className="text-center text-sm font-semibold text-zinc-400">{note}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-[24px] bg-[#15171b] p-4 ring-1 ring-white/[0.06]">
      <div className="flex flex-col gap-1">
        <b className="text-xl tracking-tight">{tx.groupStart}</b>
        <span className="text-sm font-semibold text-zinc-400">{tx.groupStartSub}</span>
      </div>
      {!material && (
        <>
          <span className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">{tx.groupGame}</span>
          <div className="flex flex-col gap-2">
            <Link href="/app/new?mode=topic&format=game" onClick={() => track("group_new_game")} className="flex items-center gap-3 rounded-[18px] bg-[#1b1d22] p-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-black text-[#1fd6ea]"><AppIcon name="plus" size={20} /></span>
              <span className="flex min-w-0 flex-1 flex-col"><b className="text-[15px]">{tx.groupNewGame}</b><span className="text-xs font-semibold text-zinc-400">{tx.groupNewGameSub}</span></span>
              <AppIcon name="chevron" size={16} stroke={2.6} />
            </Link>
            {games.slice(0, 6).map((g) => (
              <button key={g.id} type="button" onClick={() => setPicked(g.id)} aria-pressed={g.id === picked} className={`flex items-center gap-3 rounded-[18px] p-3 text-left ${g.id === picked ? "bg-[#22252b] ring-2 ring-[#1fd6ea]" : "bg-[#1b1d22]"}`}>
                <span className={`grid h-10 w-10 place-items-center rounded-xl bg-black ${g.id === picked ? "text-[#1fd6ea]" : "text-zinc-500"}`}><AppIcon name="game" size={20} /></span>
                <span className="flex min-w-0 flex-1 flex-col"><b className="truncate text-[15px]">{g.title}</b><span className="text-xs font-semibold text-zinc-400">{g.game?.levels.length} Level · {g.game?.levels.reduce((s, l) => s + l.questions.length, 0)}</span></span>
              </button>
            ))}
            {games.length === 0 && <p className="text-sm font-semibold text-zinc-400">{tx.groupNoGames}</p>}
          </div>
        </>
      )}
      {chosen?.game && (
        <Link href={`/app/edit?id=${chosen.id}&next=group`} onClick={() => track("edit_link")} className="flex items-center gap-3 rounded-[18px] p-3 ring-1 ring-[#1fd6ea]/60">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f2a2e] text-[#1fd6ea]"><AppIcon name="edit" size={18} /></span>
          <span className="flex min-w-0 flex-1 flex-col"><b className="text-[15px] text-[#1fd6ea]">{tx.editLink}</b><span className="text-xs font-semibold text-zinc-400">{tx.editOptional} · {chosen.title}</span></span>
          <AppIcon name="chevron" size={16} stroke={2.6} />
        </Link>
      )}
      <button type="button" role="switch" aria-checked={homework} onClick={() => setHomework((h) => !h)} className={`flex items-center gap-3 rounded-[18px] p-3 text-left ${homework ? "bg-[#0f2a2e] ring-2 ring-[#1fd6ea]" : "bg-[#1b1d22]"}`}>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-black text-xl">📚</span>
        <span className="flex min-w-0 flex-1 flex-col"><b className="text-[15px]">{tx.hwToggle}</b><span className="text-xs font-semibold text-zinc-400">{tx.hwToggleSub}</span></span>
        <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${homework ? "bg-[#1fd6ea]" : "bg-zinc-700"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${homework ? "left-[22px]" : "left-0.5"}`} /></span>
      </button>
      {homework ? (
        <>
          <span className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">{tx.hwDue}</span>
          <div className="flex flex-wrap gap-2">
            {dues.map((d) => (
              <button key={d.id} type="button" onClick={() => setDue(d.id)} className={chip(due === d.id)}>{d.label}</button>
            ))}
            <button type="button" onClick={() => setDue("custom")} className={chip(due === "custom")}>{tx.hwCustom}</button>
          </div>
          {due === "custom" && (
            <input type="datetime-local" value={customDue} onChange={(e) => setCustomDue(e.target.value)} className="h-12 rounded-xl border border-zinc-700 bg-black px-4 text-base font-semibold text-zinc-100 outline-none focus:border-[#1fd6ea] [color-scheme:dark]" />
          )}
        </>
      ) : (
        <>
          <span className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">{tx.groupEnds}</span>
          <div className="flex flex-wrap gap-2">
            {ends.map((e) => (
              <button key={e.id} type="button" onClick={() => setEnd(e.id)} className={chip(end === e.id)}>{e.label}</button>
            ))}
          </div>
        </>
      )}
      <label className="flex flex-col gap-1.5 text-xs font-extrabold uppercase tracking-wide text-zinc-500">
        {tx.groupName}
        <input value={name} maxLength={40} placeholder={tx.groupNamePh} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl border border-zinc-700 bg-black px-4 text-base font-semibold normal-case tracking-normal text-zinc-100 outline-none focus:border-[#1fd6ea]" />
        {isBlockedName(name) && <span className="text-xs font-semibold normal-case tracking-normal text-[#ff8a80]">{tx.nameBlocked}</span>}
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-extrabold uppercase tracking-wide text-zinc-500">
        {tx.nickname}
        <input value={nick} maxLength={20} placeholder={tx.nicknamePh} onChange={(e) => setNick(e.target.value)} className="h-12 rounded-xl border border-zinc-700 bg-black px-4 text-base font-semibold normal-case tracking-normal text-zinc-100 outline-none focus:border-[#1fd6ea]" />
        {isBlockedName(nick) && <span className="text-xs font-semibold normal-case tracking-normal text-[#ff8a80]">{tx.nameBlocked}</span>}
      </label>
      <button type="button" disabled={!chosen || busy || isBlockedName(name) || isBlockedName(nick)} onClick={() => void create()} className="rounded-2xl bg-[#1fd6ea] px-5 py-3.5 font-extrabold text-black disabled:opacity-50">{busy ? tx.groupBusy : `↗ ${homework ? tx.hwShare : tx.groupShare}`}</button>
      <span className="text-center text-xs font-semibold text-zinc-500">{homework ? tx.hwHint : tx.groupHint}</span>
      {note && <p className="text-center text-sm font-semibold text-zinc-400">{note}</p>}
    </div>
  );
}
