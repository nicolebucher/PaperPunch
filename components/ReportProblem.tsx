"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { track } from "@/lib/analytics";

// "Fehler melden" unter jeder Online-Frage (Lernspiel, Arbeitsblatt, Test, Challenge, Lerngruppe).
// Gegenstück in der App: mobile/src/ReportProblem.tsx. Meldungen landen im Google Sheet (kind = "report").

export interface ReportContext {
  source: string;
  question: string;
  expected?: string;
  options?: string[];
  given?: string;
  title?: string;
  subject?: string;
  level?: string;
}

const TEXT = {
  de: {
    open: "Fehler melden",
    title: "Was stimmt nicht?",
    reasons: { unclear: "Frage unklar", "wrong-solution": "Lösung falsch", "my-answer-right": "Meine Antwort war richtig", other: "Etwas anderes" },
    notePh: "Optional: Was genau? z. B. „Gemeint war: Wie heißen die ersten drei Stellen nach dem Komma?“",
    send: "Melden",
    cancel: "Abbrechen",
    thanks: "Danke! Wir schauen uns die Frage an.",
    error: "Senden hat nicht geklappt – bitte später nochmal.",
  },
  en: {
    open: "Report a problem",
    title: "What's wrong?",
    reasons: { unclear: "Question unclear", "wrong-solution": "Solution wrong", "my-answer-right": "My answer was right", other: "Something else" },
    notePh: "Optional: what exactly? e.g. \"It should ask: what are the first three decimal places called?\"",
    send: "Report",
    cancel: "Cancel",
    thanks: "Thanks! We'll look into this question.",
    error: "Couldn't send – please try again later.",
  },
};

type Reason = keyof (typeof TEXT)["de"]["reasons"];

export function ReportProblem({ context, tone = "dark" }: { context: ReportContext; tone?: "dark" | "light" }) {
  const { locale } = useLanguage();
  const tx = TEXT[locale === "en" ? "en" : "de"];
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  // neue Frage → Meldung zurücksetzen
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setOpen(false);
    setReason(null);
    setNote("");
    setState("idle");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [context.question]);

  const muted = tone === "light" ? "text-zinc-500 hover:text-zinc-700" : "text-zinc-500 hover:text-zinc-300";

  if (state === "done") return <p className={`mt-3 text-center text-[13px] font-bold ${tone === "light" ? "text-teal-700" : "text-[#1fd6ea]"}`}>{tx.thanks}</p>;

  if (!open) {
    return (
      <div className="mt-3 flex justify-center">
        <button type="button" onClick={() => setOpen(true)} className={`inline-flex min-h-10 items-center gap-1.5 px-2 text-[13px] font-bold ${muted}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 21V4h11l-1 4 4 4H5" /></svg>
          {tx.open}
        </button>
      </div>
    );
  }

  async function send() {
    if (!reason) return;
    setState("busy");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...context,
          question: context.question.slice(0, 1000),
          expected: context.expected?.slice(0, 400),
          options: context.options?.slice(0, 6).map((o) => o.slice(0, 200)),
          given: context.given?.slice(0, 300),
          title: context.title?.slice(0, 200),
          subject: context.subject?.slice(0, 80),
          level: context.level?.slice(0, 120),
          reason,
          note: note.trim() || undefined,
          lang: locale,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("done");
      track("question_reported", { reason, source: context.source });
    } catch {
      setState("error");
    }
  }

  const box = tone === "light" ? "bg-white text-zinc-900 ring-1 ring-zinc-200" : "bg-[#15171b] text-zinc-100 ring-1 ring-white/[0.08]";
  const chip = (on: boolean) =>
    `min-h-10 rounded-full px-3.5 text-[13px] font-bold ${on ? (tone === "light" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-950") : tone === "light" ? "bg-zinc-100 text-zinc-800" : "bg-[#22252b] text-zinc-100"}`;

  return (
    <div className={`mt-3 flex flex-col gap-3 rounded-[18px] p-4 ${box}`}>
      <b className="text-[15px]">{tx.title}</b>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(tx.reasons) as Reason[]).map((r) => (
          <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason(r)} className={chip(reason === r)}>{tx.reasons[r]}</button>
        ))}
      </div>
      <textarea rows={2} maxLength={1000} value={note} placeholder={tx.notePh} onChange={(e) => setNote(e.target.value)} className={`resize-none rounded-xl p-3 text-[14px] font-semibold outline-none ${tone === "light" ? "border border-zinc-300 bg-zinc-50 placeholder:text-zinc-400" : "border border-zinc-700 bg-black placeholder:text-zinc-600 focus:border-[#1fd6ea]"}`} />
      {state === "error" && <p className="text-[13px] font-bold text-orange-500">{tx.error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className={`min-h-11 rounded-xl px-4 text-sm font-extrabold ${tone === "light" ? "bg-zinc-100" : "bg-[#22252b]"}`}>{tx.cancel}</button>
        <button type="button" disabled={!reason || state === "busy"} onClick={() => void send()} className="ml-auto min-h-11 rounded-xl bg-[#1fd6ea] px-5 text-sm font-extrabold text-black disabled:opacity-50">{tx.send}</button>
      </div>
    </div>
  );
}
