"use client";

import { track } from "@/lib/analytics";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { useLanguage } from "@/lib/i18n/language-context";
import { MAX_FILES, MAX_TOTAL_SIZE } from "@/lib/files/extract-input";
import { getPlan, newId, saveMaterial, savePlan, type WebFormat, type WebMaterial } from "@/lib/webapp/store";
import { schoolTypes } from "@/types/generation";
import { AppIcon, useAppText } from "./ui";
import { BetaIntro, QuotaEmpty, QuotaLine, useQuota } from "./BetaQuota";
import { deviceId } from "@/lib/webapp/groups";
import { Working } from "./Working";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];
const PROFILE_KEY = "paperpunch-web-profile";

/**
 * Erstellen in der Web-App wie in der App: 1) hochladen oder Thema eintippen, 2) Format + Klasse,
 * 3) "wird erstellt", danach geht es zum gespeicherten Material (Ergebnis-Ansicht unter Meine Materialien).
 */
export function CreateFlow({ mode, topic, notes: initialNotes, format: initialFormat, planId, session }: { mode: "upload" | "topic"; topic?: string; notes?: string; format?: WebFormat; planId?: string; session?: number }) {
  const tx = useAppText();
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState<"input" | "format" | "loading" | "error">("input");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState("");
  const [subject, setSubject] = useState(topic ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [format, setFormat] = useState<WebFormat>(initialFormat ?? "worksheet");
  const [grade, setGrade] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [error, setError] = useState("");
  const [quotaHit, setQuotaHit] = useState(false);
  const quota = useQuota();
  const quotaGone = quotaHit || (!!quota?.enforced && quota.remaining <= 0);
  const pickRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  // Klasse und Schulart vom letzten Mal (nur im Browser).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") as { grade?: string; schoolType?: string };
      /* eslint-disable react-hooks/set-state-in-effect */
      if (saved.grade) setGrade(saved.grade);
      if (saved.schoolType) setSchoolType(saved.schoolType);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // ohne Speicher weiter
    }
  }, []);


  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  const canNext = mode === "upload" ? files.length > 0 && totalBytes <= MAX_TOTAL_SIZE : subject.trim().length >= 2;

  async function addFiles(list: File[]) {
    setFileError("");
    if (!list.length) return;
    track("files_added", { count: list.length, pdf: list.some((f) => f.type === "application/pdf") });
    if (list.some((f) => !ACCEPTED.includes(f.type))) return setFileError(tx.errType);
    if (files.length + list.length > MAX_FILES) return setFileError(tx.errCount);
    setBusy(true);
    try {
      const processed = await Promise.all(
        list.map(async (f) => {
          if (f.type === "application/pdf") return f;
          try {
            const small = await imageCompression(f, { maxWidthOrHeight: 1400, maxSizeMB: 1.5, useWebWorker: true });
            return new File([small], f.name, { type: small.type || f.type });
          } catch {
            return f;
          }
        })
      );
      const next = [...files, ...processed];
      if (next.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_SIZE) setFileError(tx.errSize);
      setFiles(next);
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    track("create_submit", { format, mode, files: files.length, has_notes: !!notes.trim(), grade: grade || undefined, school_type: schoolType || undefined });
    const started = Date.now();
    setStep("loading");
    setError("");
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ grade, schoolType }));
    } catch {
      // ignorieren
    }
    const body = new FormData();
    body.set("format", format);
    body.set("locale", locale);
    body.set("device", deviceId());
    if (grade) body.set("grade", grade);
    if (schoolType) body.set("schoolType", schoolType);
    if (subject.trim()) body.set("subject", subject.trim().slice(0, 60));
    if (notes.trim()) body.set("notes", notes.trim().slice(0, 300));
    files.forEach((f) => body.append("file", f));
    try {
      const res = await fetch("/api/generate", { method: "POST", body });
      const json = await res.json().catch(() => null);
      if (res.status === 429 && json?.code === "quota") setQuotaHit(true);
      if (!res.ok || !json) throw new Error(json?.error ?? t.serverErrors.unexpected);
      const id = newId();
      const material: WebMaterial =
        format === "game"
          ? { id, createdAt: Date.now(), format, title: json.game.gameTitle, subject: json.game.subject, game: json.game }
          : { id, createdAt: Date.now(), format, title: json.data.title, subject: subject.trim() || undefined, sheet: { data: json.data, pdfBase64: json.pdfBase64, filename: json.filename } };
      saveMaterial(material);
      track("material_created", { format, mode, from_plan: !!planId, seconds: Math.round((Date.now() - started) / 1000) });
      if (planId && session !== undefined) {
        const p = getPlan(planId);
        if (p && !p.done.includes(session)) savePlan({ ...p, done: [...p.done, session] });
      }
      router.replace(`/app/materials?id=${id}&new=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.serverErrors.unexpected);
      track("material_failed", { format, mode, error: (e instanceof Error ? e.message : "unexpected").slice(0, 90) });
      setStep("error");
    }
  }

  const backHref = planId ? `/app/plans?id=${planId}` : "/app";
  const header = (title: string, onBack?: () => void) => (
    <div className="mb-3 mt-2 flex flex-col gap-3 lg:mt-0">
      <BetaIntro limit={quota?.limit} />
      <div className="flex items-center gap-3">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label={tx.back} className="grid h-11 w-11 place-items-center rounded-full bg-[#15171b] ring-1 ring-white/[0.06]"><AppIcon name="back" /></button>
        ) : (
          <Link href={backHref} aria-label={tx.back} className="grid h-11 w-11 place-items-center rounded-full bg-[#15171b] ring-1 ring-white/[0.06]"><AppIcon name="back" /></Link>
        )}
        <h1 className="text-xl font-extrabold tracking-tight lg:text-2xl">{title}</h1>
      </div>
      <div className="grid grid-cols-2 gap-1.5" aria-hidden="true">
        <span className="h-[5px] rounded bg-[#1fd6ea]" />
        <span className={`h-[5px] rounded ${step === "format" ? "bg-[#1fd6ea]" : "bg-zinc-800"}`} />
      </div>
    </div>
  );
  const primary = "mt-auto w-full rounded-[20px] bg-[#1fd6ea] px-6 py-4 text-[17px] font-extrabold text-black transition active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-500";

  if (step === "loading") {
    return <Working kind={format} formatName={tx.formats[format]} fileCount={mode === "upload" ? files.length : 0} />;
  }

  if (step === "error") {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-extrabold">{tx.genError}</h1>
        {quotaHit ? (
          <QuotaEmpty limit={quota?.limit ?? 10} />
        ) : (
          <>
            <p className="text-zinc-400">{error}</p>
            <button type="button" onClick={() => setStep("format")} className="rounded-2xl bg-[#1fd6ea] px-6 py-3.5 font-extrabold text-black">{tx.retry}</button>
          </>
        )}
      </div>
    );
  }

  if (step === "format") {
    const formats: { key: WebFormat; icon: string; color: string }[] = [
      { key: "worksheet", icon: "sheet", color: "bg-[#1fd6ea] text-[#041b1e]" },
      { key: "test", icon: "test", color: "bg-[#f23a8e] text-[#2a0516]" },
      { key: "game", icon: "game", color: "bg-[#a8e43a] text-[#172405]" },
    ];
    const select = "h-12 w-full rounded-[14px] border border-zinc-700 bg-[#15171b] px-3.5 text-[15px] font-bold text-zinc-100 outline-none focus:border-[#1fd6ea]";
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3">
        {header(tx.chooseFormat, () => setStep("input"))}
        <span className="px-1 text-[13px] font-bold text-zinc-500">{mode === "upload" ? tx.filesCount(files.length) : subject}</span>
        <div className="flex flex-col gap-2">
          {formats.map((f) => {
            const on = format === f.key;
            return (
              <button key={f.key} type="button" aria-pressed={on} onClick={() => setFormat(f.key)} className={`flex items-center gap-3.5 rounded-[22px] px-4 py-3.5 text-left ${on ? "bg-zinc-100 text-zinc-950" : "bg-[#15171b] text-zinc-100 ring-1 ring-white/[0.06]"}`}>
                <span className={`grid h-[46px] w-[46px] flex-none place-items-center rounded-[14px] ${f.color}`}><AppIcon name={f.icon} size={22} stroke={2.2} /></span>
                <span className="flex flex-1 flex-col gap-0.5"><b className="text-[17px]">{tx.formats[f.key]}</b><span className={`text-xs font-semibold ${on ? "text-zinc-600" : "text-zinc-400"}`}>{tx.formatSubs[f.key]}</span></span>
                <span className={`grid h-6 w-6 place-items-center rounded-full ${on ? "bg-[#1fd6ea] text-black" : "ring-2 ring-inset ring-zinc-700"}`}>{on && <AppIcon name="check" size={14} stroke={3} />}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-1 grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5 text-xs font-extrabold uppercase tracking-wide text-zinc-500">
            {tx.grade}
            <select className={select} value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">–</option>
              {Array.from({ length: 13 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-extrabold uppercase tracking-wide text-zinc-500">
            {tx.schoolType}
            <select className={select} value={schoolType} onChange={(e) => setSchoolType(e.target.value)}>
              <option value="">–</option>
              {schoolTypes.map((s) => <option key={s} value={s}>{t.schoolTypeLabels[s] ?? s}</option>)}
            </select>
          </label>
        </div>
        <span className="px-1 text-xs font-semibold text-zinc-500">{tx.remembered}</span>
        <div className="mt-4"><QuotaLine quota={quota} /></div>
        {quotaGone ? (
          <QuotaEmpty limit={quota?.limit ?? 10} />
        ) : (
          <button type="button" onClick={() => void create()} className={`${primary} mt-4`}>{tx.createBtn(tx.formats[format])}</button>
        )}
      </div>
    );
  }

  // ---------- Schritt 1 ----------
  if (mode === "topic") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3">
        {header(tx.topic)}
        <h2 className="mt-3 px-1 text-[28px] font-extrabold leading-tight tracking-tight">{tx.topicQuestion}</h2>
        <input
          autoFocus
          value={subject}
          maxLength={60}
          placeholder={tx.topicPh}
          onChange={(e) => setSubject(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canNext && setStep("format")}
          className="h-16 rounded-[22px] border-2 border-[#1fd6ea] bg-[#15171b] px-5 text-xl font-bold text-zinc-100 outline-none placeholder:text-zinc-600"
        />
        <span className="mt-1 px-1 text-xs font-extrabold uppercase tracking-[0.08em] text-zinc-500">{tx.ideasLabel}</span>
        <div className="flex flex-wrap gap-2">
          {tx.ideas.map((idea) => (
            <button key={idea} type="button" onClick={() => setSubject(idea)} className={`h-10 rounded-full px-3.5 text-sm font-bold ${subject === idea ? "bg-zinc-100 text-zinc-950" : "bg-[#22252b] text-zinc-100"}`}>{idea}</button>
          ))}
        </div>
        <label className="mt-2 flex flex-col gap-2 rounded-[20px] bg-[#15171b] p-4 text-xs font-extrabold uppercase tracking-wide text-zinc-500 ring-1 ring-white/[0.06]">
          {tx.notesLabel}
          <textarea rows={2} maxLength={300} value={notes} placeholder={tx.notesPh} onChange={(e) => setNotes(e.target.value)} className="resize-none bg-transparent text-[15px] font-semibold normal-case tracking-normal text-zinc-100 outline-none placeholder:text-zinc-600" />
        </label>
        <button type="button" disabled={!canNext} onClick={() => setStep("format")} className={`${primary} mt-6`}>{tx.nextFormat}</button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3">
      {header(tx.upload)}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void addFiles(Array.from(e.dataTransfer.files));
        }}
        className="mt-1 flex flex-col items-center gap-3 rounded-[28px] border-2 border-dashed border-zinc-700 px-5 py-7 text-center"
      >
        <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-[#1fd6ea] text-[#041b1e]"><AppIcon name="upload" size={30} stroke={2.2} /></span>
        <b className="text-[19px]">{tx.dropTitle}</b>
        <span className="text-[13px] font-semibold text-zinc-500">{tx.or}</span>
        <div className="grid w-full grid-cols-2 gap-2.5">
          <button type="button" onClick={() => camRef.current?.click()} className="flex h-[50px] items-center justify-center gap-2 rounded-2xl bg-zinc-100 text-[15px] font-extrabold text-zinc-950"><AppIcon name="camera" size={18} />{tx.takePhoto}</button>
          <button type="button" onClick={() => pickRef.current?.click()} className="h-[50px] rounded-2xl bg-[#15171b] text-[15px] font-extrabold ring-1 ring-white/[0.08]">{tx.chooseFiles}</button>
        </div>
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        <input ref={pickRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        <span className="text-xs font-semibold text-zinc-500">{tx.limits}</span>
      </div>
      {busy && <p className="px-1 text-sm font-semibold text-zinc-400">{tx.preparing}</p>}
      {fileError && <p className="px-1 text-sm font-bold text-orange-400">{fileError}</p>}
      {files.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span key={`${f.name}-${i}`} className="inline-flex h-[34px] items-center gap-2 rounded-full bg-[#22252b] pl-3 pr-1 text-[13px] font-bold">
                <span className="max-w-[160px] truncate">{f.name}</span>
                <button type="button" aria-label={`${f.name} ×`} onClick={() => { setFiles(files.filter((_, j) => j !== i)); setFileError(""); }} className="grid h-7 w-7 place-items-center rounded-full text-zinc-400 hover:text-zinc-100"><AppIcon name="close" size={14} /></button>
              </span>
            ))}
          </div>
          <span className="px-1 text-[13px] font-semibold text-zinc-500">{tx.filesInfo(files.length, (totalBytes / 1024 / 1024).toLocaleString(locale, { maximumFractionDigits: 1 }))}</span>
          <label className="mt-1 flex flex-col gap-2 rounded-[20px] bg-[#15171b] p-4 text-xs font-extrabold uppercase tracking-wide text-zinc-500 ring-1 ring-white/[0.06]">
            {tx.notesLabel}
            <textarea rows={2} maxLength={300} value={notes} placeholder={tx.notesPh} onChange={(e) => setNotes(e.target.value)} className="resize-none bg-transparent text-[15px] font-semibold normal-case tracking-normal text-zinc-100 outline-none placeholder:text-zinc-600" />
          </label>
        </>
      )}
      <button type="button" disabled={!canNext || busy} onClick={() => setStep("format")} className={`${primary} mt-6`}>{tx.nextFormat}</button>
    </div>
  );
}
