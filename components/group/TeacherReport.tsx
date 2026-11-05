"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { TeacherReport } from "@/lib/groups";
import { useLanguage } from "@/lib/i18n/language-context";
import { track } from "@/lib/analytics";
import { fetchTeacherReport, fmtTime, saveGroup, timeLeft } from "@/lib/webapp/groups";

// Lehrkraft-Auswertung einer Lerngruppe: Kennzahlen, Level, schwierigste Fragen, Ergebnisse.
// Bewusst ohne Schwächen-Auswertung pro Kind – nur Ergebnisse pro Spitzname.

const TEXT = {
  de: {
    eyebrow: "Lerngruppe · Auswertung für Lehrkräfte",
    hwEyebrow: "Hausaufgabe · Auswertung für Lehrkräfte",
    done: "Erledigt",
    ranking: "Rangliste (nur für dich sichtbar)",
    due: (s: string) => `Abgabe bis ${s}`,
    until: (s: string) => `Ende: ${s}`,
    noEnd: "ohne Enddatum",
    ended: "Beendet",
    players: "Mitgespielt",
    avg: "Ø richtig",
    time: "Ø Spielzeit",
    weakest: "Schwächstes Level",
    levels: "Level",
    hard: "Diese Fragen fielen am schwersten",
    hardSub: "Anteil falscher Antworten · nur der erste Versuch zählt",
    correctAns: "Richtig",
    wrongAns: "Häufige falsche Antworten",
    wrongPct: (p: number) => `${p} % falsch`,
    answeredBy: (n: number) => `${n} beantwortet`,
    allQuestions: (n: number) => `Alle ${n} Fragen anzeigen`,
    fewer: "Weniger anzeigen",
    results: "Ergebnisse",
    nick: "Spitzname",
    right: "Richtig",
    points: "Punkte",
    duration: "Zeit",
    csv: "CSV herunterladen",
    copy: "Spieler-Link kopieren",
    copied: "Link kopiert",
    refresh: "Aktualisieren",
    empty: "Noch hat niemand mitgespielt.",
    emptySub: "Teile den Spieler-Link mit deiner Klasse – die Auswertung füllt sich, sobald die ersten gespielt haben.",
    partial: (n: number) => `${n} ${n === 1 ? "Ergebnis kam" : "Ergebnisse kamen"} ohne Einzelantworten (ältere App-Version) und ${n === 1 ? "zählt" : "zählen"} nur bei den Ergebnissen.`,
    privacy: "Nur Spitznamen, keine Konten · Daten werden 30 Tage nach dem Start gelöscht.",
    loading: "Auswertung wird geladen …",
    denied: "Dieser Auswertungs-Link ist ungültig.",
    deniedSub: "Öffne den Link, den du beim Anlegen der Lerngruppe bekommen hast.",
    missing: "Lerngruppe nicht gefunden – der Link ist abgelaufen oder falsch.",
    error: "Das hat nicht geklappt. Versuch es noch einmal.",
    play: "Zur Lerngruppe",
  },
  en: {
    eyebrow: "Study group · Results for teachers",
    hwEyebrow: "Homework · Results for teachers",
    done: "Done",
    ranking: "Ranking (only visible to you)",
    due: (s: string) => `Due ${s}`,
    until: (s: string) => `Ends: ${s}`,
    noEnd: "no end date",
    ended: "Ended",
    players: "Played",
    avg: "Avg. correct",
    time: "Avg. time",
    weakest: "Weakest level",
    levels: "Levels",
    hard: "These questions were the hardest",
    hardSub: "Share of wrong answers · only the first try counts",
    correctAns: "Correct",
    wrongAns: "Common wrong answers",
    wrongPct: (p: number) => `${p}% wrong`,
    answeredBy: (n: number) => `${n} answered`,
    allQuestions: (n: number) => `Show all ${n} questions`,
    fewer: "Show fewer",
    results: "Results",
    nick: "Nickname",
    right: "Correct",
    points: "Score",
    duration: "Time",
    csv: "Download CSV",
    copy: "Copy player link",
    copied: "Link copied",
    refresh: "Refresh",
    empty: "Nobody has played yet.",
    emptySub: "Share the player link with your class – the results fill in as soon as the first students have played.",
    partial: (n: number) => `${n} ${n === 1 ? "result arrived" : "results arrived"} without single answers (older app version) and only ${n === 1 ? "counts" : "count"} in the results.`,
    privacy: "Nicknames only, no accounts · Data is deleted 30 days after the start.",
    loading: "Loading results …",
    denied: "This results link isn't valid.",
    deniedSub: "Open the link you got when you created the study group.",
    missing: "Study group not found – the link has expired or is wrong.",
    error: "That didn't work. Please try again.",
    play: "Open study group",
  },
};

type State = { kind: "loading" } | { kind: "ok"; report: TeacherReport } | { kind: "denied" } | { kind: "missing" } | { kind: "error" };

export function TeacherReportView({ code }: { code: string }) {
  const { locale } = useLanguage();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [key, setKey] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [note, setNote] = useState("");
  const lang = state.kind === "ok" ? state.report.meta.lang : locale === "en" ? "en" : "de";
  const t = TEXT[lang];

  const load = useCallback(async (k: string) => {
    if (!k) {
      setState({ kind: "denied" });
      return;
    }
    const res = await fetchTeacherReport(code, k).catch(() => ({ status: 0 } as { status: number; report?: TeacherReport }));
    if (res.report) {
      setState({ kind: "ok", report: res.report });
      saveGroup({ code, name: res.report.meta.name, title: res.report.meta.title, endsAt: res.report.meta.endsAt, teacherKey: k });
    } else setState({ kind: res.status === 403 ? "denied" : res.status === 404 ? "missing" : "error" });
  }, [code]);

  useEffect(() => {
    const k = new URLSearchParams(window.location.hash.slice(1)).get("k") ?? "";
    setKey(k);
    void load(k);
    track("teacher_report_view");
  }, [load]);

  if (state.kind === "loading") return <div className="py-24 text-center text-zinc-500">{t.loading}</div>;
  if (state.kind !== "ok") {
    const msg = state.kind === "denied" ? t.denied : state.kind === "missing" ? t.missing : t.error;
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <h1 className="text-2xl font-extrabold">{msg}</h1>
        {state.kind === "denied" && <p className="text-zinc-400">{t.deniedSub}</p>}
        {state.kind === "error" && <button type="button" onClick={() => void load(key)} className="rounded-2xl bg-[#1fd6ea] px-5 py-3 font-extrabold text-black">{t.refresh}</button>}
      </div>
    );
  }

  const r = state.report;
  const playerUrl = `https://paper-punch.com/g/${r.meta.code}`;
  const left = timeLeft(r.meta.endsAt, lang);
  const answered = r.levels.filter((l) => l.pct !== null);
  const weakest = answered.length > 1 ? answered.reduce((a, b) => ((b.pct ?? 100) < (a.pct ?? 100) ? b : a)) : null;
  const questions = showAll ? r.questions : r.questions.slice(0, 5);
  const pctWrong = (q: TeacherReport["questions"][number]) => Math.round((q.wrong / Math.max(1, q.answered)) * 100);

  async function copy() {
    try {
      await navigator.clipboard.writeText(playerUrl);
      setNote(t.copied);
      setTimeout(() => setNote(""), 2500);
    } catch {
      setNote(playerUrl);
    }
  }

  function downloadCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows: (string | number)[][] = [[t.nick, `${t.right} %`, t.points, t.duration]];
    for (const e of r.entries) rows.push([e.name, e.pct, `${e.correct}/${e.total}`, fmtTime(e.ms)]);
    rows.push([]);
    rows.push([lang === "de" ? "Frage" : "Question", t.levels, t.correctAns, lang === "de" ? "beantwortet" : "answered", lang === "de" ? "falsch" : "wrong", t.wrongAns]);
    for (const q of r.questions) rows.push([q.prompt, q.levelTitle, q.correct, q.answered, q.wrong, q.topWrong.map((w) => `${w.answer} (${w.n})`).join("; ")]);
    const csv = "﻿" + rows.map((row) => row.map(esc).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `PaperPunch-${r.meta.name.replace(/[^\p{L}\p{N}]+/gu, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    track("teacher_report_csv");
  }

  const card = "rounded-[20px] bg-[#15171b] p-4 ring-1 ring-white/[0.06]";
  const metric = (label: string, value: string) => (
    <div className="flex flex-col gap-0.5 rounded-2xl bg-[#1b1d22] px-4 py-3">
      <span className="text-xs font-bold text-zinc-400">{label}</span>
      <b className="truncate text-xl">{value}</b>
    </div>
  );
  const bar = (pct: number, tone: "wrong" | "right") => (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#2a2e36]">
      <div className={`h-full rounded-full ${tone === "right" ? "bg-[#1fd6ea]" : pct >= 50 ? "bg-[#ff6b6b]" : pct >= 25 ? "bg-orange-400" : "bg-zinc-500"}`} style={{ width: `${Math.max(2, pct)}%` }} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">{r.meta.homework ? t.hwEyebrow : t.eyebrow}</span>
          <h1 className="text-2xl font-extrabold tracking-tight">{r.meta.name}</h1>
          <span className="text-sm font-semibold text-zinc-400">
            {r.meta.title} · {r.meta.ended ? t.ended : r.meta.endsAt ? (r.meta.homework ? t.due : t.until)(`${new Date(r.meta.endsAt).toLocaleString(lang === "de" ? "de-DE" : "en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}${left ? ` (${left})` : ""}`) : t.noEnd}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void copy()} className="h-10 rounded-full bg-[#22252b] px-4 text-sm font-bold">{note || t.copy}</button>
          {r.players > 0 && <button type="button" onClick={downloadCsv} className="h-10 rounded-full bg-[#22252b] px-4 text-sm font-bold">{t.csv}</button>}
          <button type="button" onClick={() => void load(key)} className="h-10 rounded-full bg-[#22252b] px-4 text-sm font-bold">{t.refresh}</button>
        </div>
      </div>

      {r.players === 0 ? (
        <div className={`${card} flex flex-col items-center gap-2 py-10 text-center`}>
          <b className="text-lg">{t.empty}</b>
          <span className="max-w-sm text-sm font-semibold text-zinc-400">{t.emptySub}</span>
          <span className="mt-2 break-all rounded-xl bg-black px-3 py-2 text-sm font-bold text-[#1fd6ea]">{playerUrl}</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {metric(r.meta.homework ? t.done : t.players, String(r.players))}
            {metric(t.avg, r.avgPct !== null ? `${r.avgPct} %` : "–")}
            {metric(t.time, r.avgMs ? fmtTime(r.avgMs) : "–")}
            {metric(t.weakest, weakest ? weakest.title : "–")}
          </div>

          {answered.length > 0 && (
            <div className={`${card} flex flex-col gap-2.5`}>
              <b className="text-[15px]">{t.levels}</b>
              {r.levels.map((l) => (
                <div key={l.id} className="grid grid-cols-[minmax(0,1fr)_120px_44px] items-center gap-3 text-sm">
                  <span className="truncate font-semibold">{l.title}</span>
                  {l.pct !== null ? bar(l.pct, "right") : <span />}
                  <span className="text-right font-bold text-zinc-300">{l.pct !== null ? `${l.pct} %` : "–"}</span>
                </div>
              ))}
            </div>
          )}

          {r.questions.length > 0 && (
            <div className={`${card} flex flex-col gap-3`}>
              <div className="flex flex-col">
                <b className="text-[15px]">{t.hard}</b>
                <span className="text-xs font-semibold text-zinc-500">{t.hardSub}</span>
              </div>
              {questions.map((q) => {
                const p = pctWrong(q);
                return (
                  <div key={`${q.level}-${q.index}`} className="flex flex-col gap-1.5 rounded-2xl bg-[#1b1d22] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[15px] font-semibold leading-snug">{q.prompt}</span>
                      <span className={`shrink-0 text-sm font-extrabold ${p >= 50 ? "text-[#ff8a80]" : p >= 25 ? "text-orange-300" : "text-zinc-400"}`}>{t.wrongPct(p)}</span>
                    </div>
                    {bar(p, "wrong")}
                    <span className="text-xs font-semibold text-zinc-400">
                      {q.levelTitle} · {t.answeredBy(q.answered)} · {t.correctAns}: <b className="text-[#1fd6ea]">{q.correct}</b>
                    </span>
                    {q.topWrong.length > 0 && (
                      <span className="text-xs font-semibold text-zinc-400">
                        {t.wrongAns}: {q.topWrong.map((w, i) => <span key={i}>{i > 0 ? " · " : ""}<b className="text-zinc-200">„{w.answer}“</b>{w.n > 1 ? ` (${w.n}×)` : ""}</span>)}
                      </span>
                    )}
                  </div>
                );
              })}
              {r.questions.length > 5 && (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="self-start text-sm font-bold text-[#1fd6ea]">{showAll ? t.fewer : t.allQuestions(r.questions.length)}</button>
              )}
            </div>
          )}

          <div className={`${card} flex flex-col gap-2`}>
            <b className="text-[15px]">{r.meta.homework ? t.ranking : t.results}</b>
            <div className="grid grid-cols-[minmax(0,1fr)_64px_64px_70px] gap-x-3 gap-y-1.5 text-sm">
              <span className="text-xs font-bold text-zinc-500">{t.nick}</span>
              <span className="text-right text-xs font-bold text-zinc-500">{t.right}</span>
              <span className="text-right text-xs font-bold text-zinc-500">{t.points}</span>
              <span className="text-right text-xs font-bold text-zinc-500">{t.duration}</span>
              {r.entries.map((e, i) => (
                <div key={i} className="contents">
                  <span className="truncate font-semibold">{e.name}</span>
                  <span className={`text-right font-bold ${e.pct < 50 ? "text-orange-300" : ""}`}>{e.pct} %</span>
                  <span className="text-right text-zinc-400">{e.correct}/{e.total}</span>
                  <span className="text-right text-zinc-400">{fmtTime(e.ms).replace(" Min.", "") || "–"}</span>
                </div>
              ))}
            </div>
            {r.detailed < r.players && <span className="text-xs font-semibold text-zinc-500">{t.partial(r.players - r.detailed)}</span>}
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-zinc-500">
        <span>{t.privacy}</span>
        <Link href={`/g/${r.meta.code}`} className="font-bold text-zinc-300">{t.play} →</Link>
      </div>
    </div>
  );
}
