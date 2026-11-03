"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { daysBetween, listMaterials, listPlans, todayISO, type WebMaterial, type WebPlan } from "@/lib/webapp/store";
import { AppIcon, SectionLabel, useAppText, WayButton } from "./ui";
import { relDate, todaysSession } from "./util";

/** Übersicht /app: drei Wege (am Handy untereinander, am Computer als Karten), darunter Weitermachen. */
export function AppHome() {
  const tx = useAppText();
  const { locale } = useLanguage();
  const [materials, setMaterials] = useState<WebMaterial[]>([]);
  const [plans, setPlans] = useState<WebPlan[]>([]);

  // Gespeichertes erst im Browser lesen (nicht beim Server-Rendern).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setMaterials(listMaterials());
    setPlans(listPlans().filter((p) => daysBetween(todayISO(), p.testDate) > 0));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const plan = plans[0];
  const session = plan ? todaysSession(plan) : undefined;
  const planWay = plan
    ? { href: `/app/plans?id=${plan.id}`, title: plan.plan.title, sub: tx.planActive(daysBetween(todayISO(), plan.testDate), session?.title) }
    : { href: "/app/plans?new=1", title: tx.plan, sub: tx.planSub, badge: tx.beta };
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
      {plans.slice(1).map((p) => (
        <Link key={p.id} href={`/app/plans?id=${p.id}`} className="flex items-center gap-3 py-2.5">
          <span className="flex h-[34px] w-[34px] flex-col items-center justify-center rounded-[10px] leading-none ring-1 ring-inset ring-zinc-700">
            <b className="text-sm text-[#1fd6ea]">{daysBetween(todayISO(), p.testDate)}</b>
            <small className="text-[7px] font-extrabold uppercase text-zinc-500">{tx.daysShort}</small>
          </span>
          <span className="flex min-w-0 flex-1 flex-col"><b className="truncate text-[15px]">{p.plan.title}</b><span className="text-xs font-semibold text-[#1fd6ea]">{todaysSession(p)?.title ?? ""}</span></span>
        </Link>
      ))}
      {materials.slice(0, 4).map((m) => (
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
  const hasList = materials.length > 0 || plans.length > 1;

  return (
    <div className="flex flex-1 flex-col">
      <span className="hidden text-[13px] font-bold text-zinc-500 lg:block">{dateLabel}</span>
      <h1 className="mx-1 mb-5 mt-6 text-[30px] font-extrabold leading-tight tracking-tight lg:mx-0 lg:mt-1 lg:mb-6 lg:text-[38px]">{tx.question}</h1>

      <div className="flex flex-col gap-2.5 lg:hidden">{ways(false)}</div>
      <div className="hidden grid-cols-3 gap-4 lg:grid">{ways(true)}</div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {hasList ? <div className="px-1 lg:rounded-3xl lg:bg-[#15171b] lg:px-5 lg:py-4 lg:ring-1 lg:ring-white/[0.06]">{continueList}</div> : <div className="hidden lg:block" />}
        <div className="hidden flex-col gap-2.5 rounded-3xl bg-[#15171b] px-5 py-4 ring-1 ring-white/[0.06] lg:flex">
          <SectionLabel>{tx.howTitle}</SectionLabel>
          <ol className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-400">
            {tx.how.map((h, i) => (
              <li key={i}><b className="mr-1.5 text-zinc-100">{i + 1}</b>{h}</li>
            ))}
          </ol>
          <span className="mt-auto pt-3 text-xs font-semibold text-zinc-500">{tx.localNote}</span>
        </div>
      </div>

      <p className="mt-auto pt-8 text-center text-[11px] font-semibold text-zinc-500 lg:hidden">{tx.localNote}</p>
    </div>
  );
}
