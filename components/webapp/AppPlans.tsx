"use client";

import { track } from "@/lib/analytics";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { addDays, daysBetween, deletePlan, getPlan, listPlans, newId, savePlan, todayISO, type WebPlan } from "@/lib/webapp/store";
import type { StudyPlan } from "@/types/generation";
import { AppIcon, Badge, useAppText } from "./ui";
import { todaysSession } from "./util";
import { Working } from "./Working";

/** Lernpläne im Browser: Liste, neuer Plan (über /api/plan) und Planansicht zum Abhaken. */
export function AppPlans({ id, create }: { id?: string; create?: boolean }) {
  const tx = useAppText();
  const [plans, setPlans] = useState<WebPlan[] | null>(null);
  const [open, setOpen] = useState<WebPlan | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setPlans(listPlans());
    setOpen(id ? getPlan(id) ?? null : null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [id]);

  if (create) return <NewPlan />;
  if (id && open) return <PlanView plan={open} onChange={(p) => { savePlan(p); setOpen(p); }} />;

  return (
    <div>
      <div className="mx-1 mb-5 mt-6 flex items-center justify-between lg:mx-0 lg:mt-1">
        <h1 className="text-[30px] font-extrabold tracking-tight">{tx.plans}</h1>
        <Badge>{tx.beta}</Badge>
      </div>
      {plans && plans.length === 0 && <p className="mb-4 font-semibold text-zinc-400">{tx.plansEmpty}</p>}
      <div className="flex flex-col gap-2">
        {plans?.map((p) => {
          const days = daysBetween(todayISO(), p.testDate);
          return (
            <Link key={p.id} href={`/app/plans?id=${p.id}`} className="flex items-center gap-3 rounded-2xl bg-[#15171b] p-3.5 ring-1 ring-white/[0.06]">
              <span className="flex h-11 w-11 flex-col items-center justify-center rounded-xl leading-none ring-1 ring-inset ring-zinc-700">
                <b className="text-base text-[#1fd6ea]">{Math.max(days, 0)}</b>
                <small className="text-[8px] font-extrabold uppercase text-zinc-500">{tx.daysShort}</small>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="truncate">{p.plan.title}</b>
                <span className="text-xs font-semibold text-zinc-500">{p.done.length}/{p.plan.sessions.length}</span>
              </span>
              <AppIcon name="chevron" size={16} stroke={2.6} />
            </Link>
          );
        })}
      </div>
      <Link href="/app/plans?new=1" className="mt-4 inline-flex rounded-2xl bg-[#a8e43a] px-5 py-3 font-extrabold text-[#172405]">+ {tx.newPlan}</Link>
    </div>
  );
}

function NewPlan() {
  const tx = useAppText();
  const { locale } = useLanguage();
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [topics, setTopics] = useState("");
  const [date, setDate] = useState(() => addDays(todayISO(), 7));
  const [minutes, setMinutes] = useState(20);
  const [grade, setGrade] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const days = daysBetween(todayISO(), date);
  const ok = subject.trim().length >= 2 && days >= 1 && days <= 90;

  async function create() {
    if (!ok || busy) return;
    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("locale", locale);
    body.set("subject", subject.trim().slice(0, 60));
    body.set("testFormat", "written");
    body.set("daysUntilTest", String(days));
    body.set("minutesPerDay", String(minutes));
    if (topics.trim()) body.set("topics", topics.trim().slice(0, 500));
    if (grade) body.set("grade", grade);
    try {
      const res = await fetch("/api/plan", { method: "POST", body });
      const json = (await res.json().catch(() => null)) as { plan?: StudyPlan; error?: string } | null;
      if (!res.ok || !json?.plan) throw new Error(json?.error ?? tx.planError);
      const plan: WebPlan = { id: newId(), createdAt: Date.now(), startDate: todayISO(), testDate: date, subject: subject.trim(), plan: json.plan, done: [] };
      savePlan(plan);
      track("plan_created", { days: daysBetween(todayISO(), date), sessions: json.plan.sessions?.length });
      router.push(`/app/plans?id=${plan.id}`);
    } catch (e) {
      track("plan_failed");
      setError(e instanceof Error ? e.message : tx.planError);
      setBusy(false);
    }
  }

  const field = "h-12 rounded-xl border border-zinc-700 bg-black px-4 text-base font-semibold outline-none focus:border-[#1fd6ea]";
  // Während der Lernplan entsteht: derselbe Ladebildschirm wie beim Erstellen (wie in der App)
  if (busy) return <Working kind="plan" />;
  return (
    <div className="max-w-xl">
      <div className="mb-5 mt-2 flex items-center gap-3 lg:mt-0">
        <Link href="/app/plans" aria-label={tx.back} className="grid h-11 w-11 place-items-center rounded-full bg-[#15171b] ring-1 ring-white/[0.06]"><AppIcon name="back" /></Link>
        <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">{tx.newPlan}</h1>
      </div>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-bold text-zinc-400">{tx.planSubject}<input className={field} value={subject} maxLength={60} placeholder={tx.planSubjectPh} onChange={(e) => setSubject(e.target.value)} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-bold text-zinc-400">{tx.planTopics}<input className={field} value={topics} maxLength={500} placeholder={tx.planTopicsPh} onChange={(e) => setTopics(e.target.value)} /></label>
        <div className="grid grid-cols-3 gap-3">
          <label className="col-span-3 flex flex-col gap-1.5 text-sm font-bold text-zinc-400 sm:col-span-1">{tx.planDate}<input type="date" className={field} value={date} min={addDays(todayISO(), 1)} max={addDays(todayISO(), 90)} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="flex flex-col gap-1.5 text-sm font-bold text-zinc-400 max-sm:col-span-2">{tx.planMinutes}<select className={field} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>{[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
          <label className="flex flex-col gap-1.5 text-sm font-bold text-zinc-400">{tx.planGrade}<select className={field} value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">–</option>{Array.from({ length: 13 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
        </div>
        <button type="button" disabled={!ok || busy} onClick={() => void create()} className="mt-2 rounded-2xl bg-[#a8e43a] px-6 py-4 text-lg font-extrabold text-[#172405] disabled:opacity-50">
          {busy ? tx.planCreating : tx.planCreate}
        </button>
        {error && <p className="font-semibold text-orange-400">{error}</p>}
        <p className="text-xs font-semibold text-zinc-500">{tx.noReminders}</p>
      </div>
    </div>
  );
}

function sessionHref(p: WebPlan, index: number): string {
  const s = p.plan.sessions[index];
  const q = new URLSearchParams({ mode: "topic", topic: s.topic.slice(0, 60), notes: s.focus.slice(0, 300), format: s.format === "podcast" ? "worksheet" : s.format, plan: p.id, session: String(index) });
  return `/app/new?${q.toString()}`;
}

function PlanView({ plan, onChange }: { plan: WebPlan; onChange: (p: WebPlan) => void }) {
  const tx = useAppText();
  const { locale } = useLanguage();
  const router = useRouter();
  const today = todayISO();
  const todayIndex = daysBetween(plan.startDate, today);
  const days = daysBetween(today, plan.testDate);
  const next = todaysSession(plan);
  const testLabel = new Date(`${plan.testDate}T12:00:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  const toggle = (i: number) => {
    track(plan.done.includes(i) ? "plan_session_unticked" : "plan_session_ticked");
    tick(i);
  };
  const tick = (i: number) => onChange({ ...plan, done: plan.done.includes(i) ? plan.done.filter((d) => d !== i) : [...plan.done, i] });

  return (
    <div className="flex max-w-2xl flex-1 flex-col">
      <div className="mb-2 mt-2 flex items-center justify-between lg:mt-0">
        <Link href="/app/plans" aria-label={tx.back} className="grid h-11 w-11 place-items-center rounded-full bg-[#15171b] ring-1 ring-white/[0.06]"><AppIcon name="back" /></Link>
        <Badge>{tx.beta}</Badge>
      </div>
      <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight">{plan.plan.title}</h1>
      <p className="mt-1 text-sm font-semibold text-zinc-400">{tx.planTestOn(testLabel, days)}</p>
      <div className="mt-4 flex gap-1.5" aria-hidden="true">
        {plan.plan.sessions.map((s, i) => (
          <span key={i} className={`h-2 flex-1 rounded-sm ${plan.done.includes(i) ? "bg-[#1fd6ea]" : s.dayIndex === todayIndex ? "bg-zinc-100" : s.kind === "checkpoint" ? "bg-[#f23a8e]" : "bg-zinc-800"}`} />
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {plan.plan.sessions.map((s, i) => {
          const done = plan.done.includes(i);
          const isToday = s.dayIndex === todayIndex && !done;
          const dayLabel = s.dayIndex === todayIndex ? tx.today : new Date(`${addDays(plan.startDate, s.dayIndex)}T12:00:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric" });
          return (
            <div key={i} className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 ${isToday ? "bg-zinc-100 text-zinc-950" : "bg-[#15171b] ring-1 ring-white/[0.06]"}`}>
              <span className="w-14 flex-none text-xs font-extrabold uppercase">{dayLabel}</span>
              <Link href={sessionHref(plan, i)} className={`flex min-w-0 flex-1 flex-col ${done ? "text-zinc-500 line-through" : ""}`}>
                <b className="truncate text-sm">{s.title}</b>
                <span className={`text-xs font-semibold ${isToday ? "text-zinc-600" : "text-zinc-500"}`}>{tx.formats[s.format === "podcast" ? "worksheet" : s.format]} · {s.minutes} min</span>
              </Link>
              <button type="button" aria-pressed={done} aria-label={s.title} onClick={() => toggle(i)} className={`grid h-7 w-7 flex-none place-items-center rounded-full ${done ? "bg-[#1fd6ea] text-black" : isToday ? "ring-2 ring-inset ring-zinc-900" : "ring-2 ring-inset ring-zinc-700"}`}>
                {done && <AppIcon name="check" size={15} stroke={3} />}
              </button>
            </div>
          );
        })}
      </div>
      {next && (
        <Link href={sessionHref(plan, next.index)} onClick={() => track("plan_session_start")} className="mt-6 rounded-2xl bg-[#1fd6ea] px-6 py-4 text-center text-lg font-extrabold text-black">
          {next.dayIndex === todayIndex ? tx.startToday : tx.startSession}
        </Link>
      )}
      <p className="mt-3 text-center text-[11px] font-semibold text-zinc-500">{tx.noReminders}</p>
      <button type="button" onClick={() => { deletePlan(plan.id); router.push("/app/plans"); }} className="mt-4 self-center text-sm font-bold text-zinc-500 hover:text-zinc-200">{tx.deletePlan}</button>
    </div>
  );
}
