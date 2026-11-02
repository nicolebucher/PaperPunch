import { useState } from "react";
import { useT } from "../i18n";
import { addFiles, formatMb, totalBytes, type FileError } from "../files";
import { createPlan } from "../api";
import { addDays, daysBetween, todayISO } from "../dates";
import { newPlanId, savePlanFiles } from "../storage";
import { Beta, FileChips, FilePick, Icon, TopBar } from "../ui";
import { Working } from "./Working";
import type { ActivePlan, PlanGoal, Profile, TestFormat } from "../types";

const TEST_FORMATS: TestFormat[] = ["written", "oral", "vocabulary", "multiple-choice", "presentation", "other"];
const MINUTES = [15, 20, 30, 45, 60];

/** Ziel erfassen: Fach, Termin, Prüfungsart, Wunschnote, Zeit pro Tag, optional Stoff. */
export function PlanSetup({
  profile,
  say,
  errorText,
  onBack,
  onCreated,
}: {
  profile: Profile;
  say: (msg: string) => void;
  errorText: (e: unknown) => string;
  onBack: () => void;
  onCreated: (plan: ActivePlan) => void;
}) {
  const { t, lang } = useT();
  const [goal, setGoal] = useState<PlanGoal>({
    subject: "",
    testFormat: "written",
    testDate: addDays(todayISO(), 7),
    minutesPerDay: 30,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const days = daysBetween(todayISO(), goal.testDate);
  const dateOk = days >= 1 && days <= 90;
  const ready = goal.subject.trim().length >= 2 && dateOk;
  const errors: Record<FileError, string> = { type: t.errFileType, count: t.errTooMany, size: t.errTooBig };

  async function add(incoming: File[]) {
    const result = await addFiles(files, incoming);
    setFiles(result.files);
    if (result.error) say(errors[result.error]);
  }

  async function submit() {
    if (!ready) {
      say(dateOk ? t.errPlanFields : t.errDate);
      return;
    }
    setBusy(true);
    try {
      const cleaned: PlanGoal = { ...goal, subject: goal.subject.trim(), topics: goal.topics?.trim() || undefined };
      const plan = await createPlan(profile, cleaned, files);
      const id = newPlanId();
      if (files.length) await savePlanFiles(id, files);
      const { sessions, ...meta } = plan;
      onCreated({
        id,
        plan: meta,
        sessions: sessions.map((s, i) => ({ ...s, id: `${s.dayIndex}-${i}` })),
        goal: cleaned,
        startDate: todayISO(),
        done: [],
        results: {},
        hasFiles: files.length > 0,
      });
    } catch (error) {
      say(errorText(error));
      setBusy(false);
    }
  }

  if (busy) return <Working format="plan" fileCount={files.length} />;

  const set = <K extends keyof PlanGoal>(key: K, value: PlanGoal[K]) => setGoal((g) => ({ ...g, [key]: value }));

  return (
    <div className="screen">
      <TopBar onBack={onBack} />
      <div className="stack" style={{ gap: 18, paddingBottom: 28 }}>
        <div className="stack" style={{ gap: 8 }}>
          <h1>{t.planSetupTitle} <Beta /></h1>
          <p className="muted" style={{ fontSize: 14 }}>{t.betaNote}</p>
        </div>

        <label className="field">
          {t.planSubject}
          <input className={goal.subject ? "input set" : "input"} value={goal.subject} maxLength={60} placeholder={t.planSubjectPh} onChange={(e) => set("subject", e.target.value)} />
        </label>

        <div className="grid2">
          <label className="field">
            {t.planDate}
            <input
              type="date"
              className={dateOk ? "input set" : "input"}
              value={goal.testDate}
              min={addDays(todayISO(), 1)}
              max={addDays(todayISO(), 90)}
              onChange={(e) => set("testDate", e.target.value)}
            />
          </label>
          <label className="field">
            {t.planFormat}
            <select className="input set" value={goal.testFormat} onChange={(e) => set("testFormat", e.target.value as TestFormat)}>
              {TEST_FORMATS.map((f) => (
                <option key={f} value={f}>{t.testFormats[f]}</option>
              ))}
            </select>
          </label>
        </div>
        {!dateOk && <p className="error">{t.errDate}</p>}

        <div className="stack" style={{ gap: 8 }}>
          <span className="muted" style={{ fontSize: 14, fontWeight: 700 }}>{t.planMinutes}</span>
          <div className="row">
            {MINUTES.map((m) => (
              <button key={m} type="button" className={goal.minutesPerDay === m ? "pill on" : "pill"} aria-pressed={goal.minutesPerDay === m} onClick={() => set("minutesPerDay", m)}>
                {t.minutes(m)}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          {t.planTopics}
          <textarea className="input" maxLength={500} placeholder={t.planTopicsPh} value={goal.topics ?? ""} onChange={(e) => set("topics", e.target.value)} />
        </label>

        <div className="stack" style={{ gap: 8 }}>
          <span className="muted" style={{ fontSize: 14, fontWeight: 700 }}>{t.planMaterial}</span>
          {files.length > 0 && (
            <>
              <span className="muted" style={{ fontSize: 13 }}>{t.filesCounter(files.length, formatMb(totalBytes(files), lang))}</span>
              <FileChips files={files} onRemove={(i) => setFiles(files.filter((_, j) => j !== i))} />
            </>
          )}
          {files.length < 5 && (
            <FilePick className="btn ghost small" label={t.uploadFiles} onFiles={(f) => void add(f)}>
              <Icon name="gallery" size={18} /> {t.uploadFiles}
            </FilePick>
          )}
        </div>

        <button type="button" className="btn primary block" onClick={() => void submit()} disabled={!ready}>
          {t.planCreate}
        </button>
      </div>
    </div>
  );
}
