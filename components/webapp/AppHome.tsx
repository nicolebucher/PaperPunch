"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { daysBetween, listMaterials, listPlans, todayISO, type WebMaterial, type WebPlan } from "@/lib/webapp/store";
import { AppIcon, RecommendButton, SectionLabel, useAppText, WayButton } from "./ui";
import { relDate, todaysSession } from "./util";
import { fetchBoard, saveGroup, savedGroups, teacherLink, timeLeft, type SavedGroup } from "@/lib/webapp/groups";

/** Übersicht /app: drei Wege (am Handy untereinander, am Computer als Karten), darunter Weitermachen. */
export function AppHome() {
  const tx = useAppText();
  const { locale } = useLanguage();
  const [materials, setMaterials] = useState<WebMaterial[]>([]);
  const [plans, setPlans] = useState<WebPlan[]>([]);
  const [groups, setGroups] = useState<(SavedGroup & { rank?: number; count?: number; passed?: string; ended?: boolean; done?: boolean })[]>([]);

  // Gespeichertes erst im Browser lesen (nicht beim Server-Rendern).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setMaterials(listMaterials());
    setPlans(listPlans().filter((p) => daysBetween(todayISO(), p.testDate) > 0));
    /* eslint-enable react-hooks/set-state-in-effect */
    // Lerngruppen: aktuellen Platz holen; wer seit dem letzten Besuch vorbeigezogen ist, wird genannt.
    const mine = savedGroups().filter((g) => Date.now() - g.savedAt < 30 * 86_400_000).slice(0, 3);
    void Promise.all(
      mine.map(async (g) => {
        const b = await fetchBoard(g.code).catch(() => null);
        if (!b) return null;
        const idx = b.me ? b.entries.findIndex((e) => e.me === b.me) : -1;
        // Hausaufgabe: keine Platzierung, nur erledigt/offen
        if (b.meta.homework) return { ...g, homework: true, done: idx >= 0, count: b.count ?? b.entries.length, ended: b.ended };
        const rank = idx >= 0 ? idx + 1 : undefined;
        const passed = rank && g.lastRank && rank > g.lastRank ? b.entries[idx - 1]?.name : undefined;
        if (rank) saveGroup({ ...g, lastRank: rank });
        return { ...g, rank, count: b.entries.length, passed, ended: b.ended };
      })
    ).then((list) => setGroups(list.filter((x): x is NonNullable<typeof x> => !!x)));
  }, []);

  // Der dritte Weg legt immer einen neuen Lernplan an; laufende Pläne stehen unter "Weitermachen".
  const planWay = { href: "/app/plans?new=1", title: tx.plan, sub: tx.planSub, badge: tx.beta };
  const dateLabel = new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });

  const ways = (card: boolean) => (
    <>
      <WayButton card={card} href="/app/new?mode=upload" icon="camera" color="teal" title={tx.upload} sub={tx.uploadSub} main />
      <WayButton card={card} href="/app/new?mode=topic" icon="edit" color="pink" title={tx.topic} sub={tx.topicSub} />
      <WayButton card={card} icon="calendar" color="green" {...planWay} />
    </>
  );

  const continueList = (
    <div className="flex flex-col">
      <SectionLabel right={materials.length > 0 && <Link href="/app/materials" className="text-[13px] font-bold text-[#1fd6ea]">{tx.all(materials.length)}</Link>}>
        {tx.continue}
      </SectionLabel>
      {groups.map((g) => (
        <Link key={g.code} href={g.teacherKey ? teacherLink(g.code, g.teacherKey) : `/g/${g.code}`} className="my-1 flex items-center gap-3 rounded-[18px] bg-gradient-to-br from-pink-500/20 to-[#1fd6ea]/15 p-3 ring-1 ring-white/[0.08]">
          <span className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-black text-[#f23a8e]"><AppIcon name="group" size={20} /></span>
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="truncate text-[15px]">{g.homework ? `📚 ${g.name} · ${g.teacherKey ? tx.hwDoneCount(g.count ?? 0) : g.done ? tx.hwDoneMe : tx.hwOpen}` : `${g.name} · ${tx.groupRow(g.rank, g.count ?? 0)}`}</b>
            <span className="text-xs font-bold text-pink-300">{g.teacherKey ? tx.teacherRow : g.passed ? tx.groupPassed(g.passed) : g.title}{g.endsAt ? ` · ${timeLeft(g.endsAt, locale === "en" ? "en" : "de")}` : ""}</span>
          </span>
          <AppIcon name="chevron" size={16} stroke={2.6} />
        </Link>
      ))}
      {plans.map((p) => (
        <Link key={p.id} href={`/app/plans?id=${p.id}`} className="flex items-center gap-3 py-2.5">
          <span className="flex h-[34px] w-[34px] flex-col items-center justify-center rounded-[10px] leading-none ring-1 ring-inset ring-zinc-700">
            <b className="text-sm text-[#1fd6ea]">{daysBetween(todayISO(), p.testDate)}</b>
            <small className="text-[7px] font-extrabold uppercase text-zinc-500">{tx.daysShort}</small>
          </span>
          <span className="flex min-w-0 flex-1 flex-col"><b className="truncate text-[15px]">{p.plan.title}</b><span className="text-xs font-semibold text-[#1fd6ea]">{todaysSession(p)?.title ?? ""}</span></span>
        </Link>
      ))}
      {materials.slice(0, Math.max(1, 4 - plans.length)).map((m) => (
        <Link key={m.id} href={`/app/materials?id=${m.id}`} className="flex items-center gap-3 py-2.5">
          <span className="flex w-[34px] justify-center"><span className="h-[34px] w-1.5 rounded-sm bg-[#1fd6ea]" /></span>
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="truncate text-[15px]">{m.title}</b>
            <span className="text-xs font-semibold text-zinc-500">{tx.formats[m.format]} · {relDate(m.createdAt, locale, tx)}</span>
          </span>
          <AppIcon name="chevron" size={16} stroke={2.6} />
        </Link>
      ))}
    </div>
  );
  const hasList = materials.length > 0 || plans.length > 0 || groups.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      <span className="hidden text-[13px] font-bold text-zinc-500 lg:block">{dateLabel}</span>
      <h1 className="mx-1 mb-5 mt-6 text-[30px] font-extrabold leading-tight tracking-tight lg:mx-0 lg:mt-1 lg:mb-6 lg:text-[38px]">{tx.question}</h1>

      <div className="flex flex-col gap-2.5 lg:hidden">{ways(false)}</div>
      <div className="hidden grid-cols-3 gap-4 lg:grid">{ways(true)}</div>

      {/* Am Computer: links "So funktioniert's", rechts "Weitermachen". Beim ersten Besuch (noch nichts gespeichert)
          nimmt "So funktioniert's" die ganze Breite ein, damit nichts einsam am Rand klebt. */}
      <div className={`mt-6 grid gap-4 ${hasList ? "lg:grid-cols-[1fr_1.4fr]" : ""}`}>
        <div className={`hidden flex-col gap-2.5 rounded-3xl bg-[#15171b] px-5 py-4 ring-1 ring-white/[0.06] lg:flex ${hasList ? "" : "lg:flex-row lg:items-center lg:gap-8 lg:px-6"}`}>
          <SectionLabel>{tx.howTitle}</SectionLabel>
          <ol className={`flex gap-1.5 text-sm font-semibold text-zinc-400 ${hasList ? "flex-col" : "flex-1 flex-row gap-6"}`}>
            {tx.how.map((h, i) => (
              <li key={i} className={hasList ? "" : "flex-1"}><b className="mr-1.5 text-zinc-100">{i + 1}</b>{h}</li>
            ))}
          </ol>
          {hasList && <span className="mt-auto pt-3 text-xs font-semibold text-zinc-500">{tx.localNote}</span>}
        </div>
        {hasList && <div className="px-1 lg:rounded-3xl lg:bg-[#15171b] lg:px-5 lg:py-4 lg:ring-1 lg:ring-white/[0.06]">{continueList}</div>}
      </div>
      {!hasList && <p className="mt-3 hidden text-xs font-semibold text-zinc-500 lg:block">{tx.localNote}</p>}

      <div className="mt-auto flex flex-col items-center gap-1 pt-8 lg:hidden">
        <RecommendButton className="flex items-center gap-2 px-2 py-2.5 text-sm font-extrabold text-zinc-400" />
        <p className="text-center text-[11px] font-semibold text-zinc-500">{tx.localNote}</p>
      </div>
    </div>
  );
}
