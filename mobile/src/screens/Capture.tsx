import { detectForeignLanguage, FOREIGN_LANGUAGES, rememberedLangYear, rememberLangYear, type ForeignLanguage } from "../answerMatch";
import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { addFiles, formatMb, isNative, MAX_BYTES, MAX_FILES, takeNativePhoto, totalBytes, type FileError } from "../files";
import { FileChips, FilePick, FORMATS, Icon, ProfileSelects, TopBar } from "../ui";
import { activeChild, childLabel, isParent, kidsOf, selectChild, syncActive } from "../children";
import type { MaterialFormat, Profile } from "../types";
import { BetaIntro, QuotaEmpty, QuotaLine, useQuota } from "../BetaQuota";

/** Prototyp D: Kamera zuerst, alternativ Thema tippen; danach Auswahl-Sheet mit Format, Klasse, Schulart. */
export function Capture({
  profile: initialProfile,
  initialMode,
  initialTopic,
  initialFormat,
  say,
  onBack,
  onCreate,
}: {
  profile: Profile;
  initialMode: "photo" | "topic";
  initialTopic?: string;
  initialFormat?: MaterialFormat;
  say: (msg: string) => void;
  onBack: () => void;
  onCreate: (format: MaterialFormat, files: File[], topic: string, profile: Profile, notes: string, language?: { lang: ForeignLanguage; year: number }) => void;
}) {
  const { t, lang } = useT();
  const [mode, setMode] = useState(initialMode);
  const [files, setFiles] = useState<File[]>([]);
  const [sheet, setSheet] = useState(initialMode === "topic");
  const [topic, setTopic] = useState(initialTopic ?? "");
  const [notes, setNotes] = useState("");
  const [format, setFormat] = useState<MaterialFormat | null>(initialFormat ?? null);
  const [profile, setProfile] = useState(initialProfile);
  // Fremdsprache + Lernjahr (Klasse ≠ Sprachniveau): aus Thema/Notiz/Fach erkannt, Lernjahr je Sprache gemerkt
  const [flang, setFlang] = useState<ForeignLanguage | null>(null);
  const [langYear, setLangYear] = useState(1);
  const [langTouched, setLangTouched] = useState(false);
  useEffect(() => {
    if (langTouched) return;
    const found = detectForeignLanguage(`${topic} ${notes} ${teacherSubjects.length === 1 ? teacherSubjects[0] : ""}`, lang);
    setFlang(found);
    if (found) setLangYear(rememberedLangYear(found) ?? 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, notes, langTouched, lang]);
  const sheetTopicRef = useRef<HTMLInputElement | null>(null);
  // Lehrkräfte: eigene Fächer statt Beispiel-Ideen (Antippen setzt "Mathe: " – dann das Thema dahinter tippen)
  const teacherSubjects = initialProfile.role === "teacher" ? initialProfile.subjects ?? [] : [];
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const quota = useQuota();
  const quotaGone = !!quota?.enforced && quota.remaining <= 0;

  const n = files.length;
  const errors: Record<FileError, string> = { type: t.errFileType, count: t.errTooMany, size: t.errTooBig };

  async function add(incoming: File[]) {
    if (!incoming.length || busy) return;
    setBusy({ done: 0, total: incoming.length });
    const result = await addFiles(files, incoming, (done, total) => setBusy({ done, total }));
    setBusy(null);
    setFiles(result.files);
    if (result.error) say(errors[result.error]);
    if (result.files.length) {
      setMode("photo");
      setSheet(true);
    }
  }

  async function snapNative() {
    if (n >= MAX_FILES) {
      say(t.errTooMany);
      setSheet(true);
      return;
    }
    try {
      const photo = await takeNativePhoto(n + 1);
      if (photo) {
        setFlash(true);
        setTimeout(() => setFlash(false), 450);
        await add([photo]);
      }
    } catch {
      say(t.errCamera);
    }
  }

  const needs = mode === "photo" ? n === 0 : topic.trim().length < 2;
  const blocker =
    mode === "photo" && n === 0 ? t.needFile : !format ? t.needFormat : !profile.grade || !profile.schoolType ? t.needProfile : needs ? t.needTopic : "";

  const shutter = isNative() ? (
    <button type="button" className="shutter" onClick={() => void snapNative()} aria-label={t.takePhoto} />
  ) : (
    <FilePick className="shutter" label={t.takePhoto} capture onFiles={(f) => void add(f)}>
      <span />
    </FilePick>
  );

  return (
    <div className="screen">
      {mode === "photo" ? (
        <>
          <TopBar
            onBack={onBack}
            right={
              <button type="button" className="btn ghost small" onClick={() => { setMode("topic"); setSheet(true); }}>
                {t.noPhotoTopic}
              </button>
            }
          />
          <div className="viewfinder">
            <div className="paper" aria-hidden="true">
              <i /><i /><i style={{ width: "92%" }} /><i /><i style={{ width: "70%" }} />
            </div>
            <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
            <span className="hint">{n === 0 ? t.cameraHint0 : n >= MAX_FILES ? t.cameraHintFull : t.cameraHintN(n)}</span>
            {flash && <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: 0.8 }} />}
            {busy && (
              <div className="busy-overlay" role="status" aria-live="polite">
                <span className="busy-spinner" aria-hidden="true" />
                <span>{t.preparingPhotos(Math.min(busy.done + 1, busy.total), busy.total)}</span>
              </div>
            )}
          </div>
          <div className="shutterbar">
            <span className="shutter-col">
              <FilePick className="square" label={t.uploadFiles} onFiles={(f) => void add(f)}>
                <Icon name="gallery" size={24} stroke={2} />
              </FilePick>
              <span className="shutter-label" aria-hidden="true">{t.uploadShort}</span>
            </span>
            <span className="shutter-col">
              {shutter}
              <span className="shutter-label" aria-hidden="true">{t.photoShort}</span>
            </span>
            <span className="shutter-col">
              {n > 0 ? (
                <button type="button" className="square count" onClick={() => setSheet(true)} aria-label={t.continueWithFiles}>
                  {n}
                </button>
              ) : (
                <span style={{ width: 52, height: 52 }} />
              )}
              <span className="shutter-label" aria-hidden="true">{n > 0 ? t.next : "\u00a0"}</span>
            </span>
          </div>
          <p className="upload-limits">{t.uploadLimits(MAX_FILES, Math.round(MAX_BYTES / 1024 / 1024))}</p>
        </>
      ) : (
        <>
          <TopBar onBack={() => { setMode("photo"); setSheet(false); }} />
          <div className="stack" style={{ paddingTop: 4 }}>
            <h1>{t.topicTitle}</h1>
            <label className="field">
              {t.topicLabel}
              <input className="input set" style={{ minHeight: 58, fontSize: 19 }} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t.topicPlaceholder} maxLength={60} />
            </label>
            <span className="muted" style={{ fontSize: 15, fontWeight: 700 }}>{teacherSubjects.length ? t.mySubjects : t.topicIdeas}</span>
            <div className="row">
              {(teacherSubjects.length ? teacherSubjects.map((x) => `${x}: `) : t.ideas).map((idea) => (
                <button key={idea} type="button" className={topic === idea ? "pill on" : "pill"} onClick={() => setTopic(idea)}>
                  {idea.replace(/: $/, "")}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {sheet && (
        <>
          {mode === "photo" && <div className="backdrop" onClick={() => setSheet(false)} />}
          <div className="sheet" role="dialog" aria-label={mode === "photo" ? t.sheetTitlePhoto : t.sheetTitleTopic}>
            <div className="inner">
              <div className="grabber" />
              <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
                <h2>{mode === "photo" ? t.sheetTitlePhoto : t.sheetTitleTopic}</h2>
                {mode === "photo" && n < MAX_FILES && (
                  <div className="row" style={{ flexWrap: "nowrap", gap: 6 }}>
                    <button type="button" className="btn small addbtn" onClick={() => (isNative() ? void snapNative() : setSheet(false))}>
                      {t.addPhoto}
                    </button>
                    <FilePick className="btn small addbtn" label={t.uploadFiles} onFiles={(f) => void add(f)}>
                      {t.addFile}
                    </FilePick>
                  </div>
                )}
              </div>

              {mode === "photo" && (
                <div className="stack" style={{ gap: 8 }}>
                  <div className="row" style={{ justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "var(--sheet-muted)" }}>
                    <span>{t.filesCounter(n, formatMb(totalBytes(files), lang))}</span>
                    <span>{t.fileTypes}</span>
                  </div>
                  <FileChips
                    files={files}
                    onRemove={(i) => {
                      const next = files.filter((_, j) => j !== i);
                      setFiles(next);
                      if (!next.length) setSheet(false);
                    }}
                  />
                </div>
              )}

              {mode === "topic" && (
                <label className="field">
                  {t.topicLabel}
                  <input ref={sheetTopicRef} className="input sheet-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t.topicPlaceholder} maxLength={60} />
                </label>
              )}

              <div className="grid2">
                {FORMATS.map((f) => (
                  f === "podcast" ? (
                    <button key={f} type="button" className="format soon" disabled aria-disabled="true">
                      <Icon name={f} size={26} stroke={2} />
                      <span className="stack" style={{ gap: 2, alignItems: "flex-start" }}>
                        {t.formats[f]}
                        <span className="soon-badge">{t.comingSoon}</span>
                      </span>
                    </button>
                  ) : (
                    <button key={f} type="button" className={format === f ? "format on" : "format"} aria-pressed={format === f} onClick={() => setFormat(f)}>
                      <Icon name={f} size={26} stroke={2} />
                      {t.formats[f]}
                    </button>
                  )
                ))}
              </div>

              <label className="field">
                {t.focusLabel}
                <textarea
                  id="capture-notes"
                  className="input"
                  style={{ minHeight: 76 }}
                  value={notes}
                  maxLength={300}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.focusPlaceholder}
                />
              </label>

              {profile.role === "teacher" && (profile.teachGrades?.length ?? 0) > 1 && (
                <div className="stack" style={{ gap: 8 }}>
                  <span className="field-label">{t.classFor}</span>
                  <div className="kid-chips">
                    {profile.teachGrades!.map((g) => (
                      <button key={g} type="button" className={profile.grade === g ? "kid-chip on" : "kid-chip"} aria-pressed={profile.grade === g} onClick={() => setProfile({ ...profile, grade: g })}>
                        {t.gradeShort(g)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {isParent(profile) && kidsOf(profile).length > 1 && (
                <div className="stack" style={{ gap: 8 }}>
                  <span className="field-label">{t.childFor}</span>
                  <div className="kid-chips">
                    {kidsOf(profile).map((k, i) => (
                      <button key={k.id} type="button" className={activeChild(profile)?.id === k.id ? "kid-chip on" : "kid-chip"} aria-pressed={activeChild(profile)?.id === k.id} onClick={() => setProfile(selectChild(profile, k.id))}>
                        {childLabel(k, i, t.childN)}{k.grade ? ` · ${k.grade}` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <ProfileSelects profile={profile} onChange={(p) => setProfile(syncActive(p))} />

              <div className="stack" style={{ gap: 8 }}>
                <span className="field-label">{t.langQ}</span>
                <div className="kid-chips">
                  <button type="button" className={!flang ? "kid-chip on" : "kid-chip"} aria-pressed={!flang} onClick={() => { setLangTouched(true); setFlang(null); }}>{t.langNo}</button>
                  {FOREIGN_LANGUAGES.filter((l) => !(l.key === "en" && lang === "en")).map((l) => (
                    <button key={l.key} type="button" className={flang === l.key ? "kid-chip on" : "kid-chip"} aria-pressed={flang === l.key} onClick={() => { setLangTouched(true); setFlang(l.key); setLangYear(rememberedLangYear(l.key) ?? 1); }}>
                      {lang === "de" ? l.de : l.en}
                    </button>
                  ))}
                </div>
                {flang && (
                  <>
                    <span className="field-label">{t.langYearLabel}</span>
                    <div className="kid-chips">
                      {[1, 2, 3, 4, 5].map((y) => (
                        <button key={y} type="button" className={langYear === y ? "kid-chip on" : "kid-chip"} aria-pressed={langYear === y} onClick={() => setLangYear(y)}>{y === 5 ? "5+" : y}</button>
                      ))}
                    </div>
                    <span className="muted" style={{ fontSize: 13 }}>{t.langYearHint}</span>
                  </>
                )}
              </div>

              <QuotaLine quota={quota} />
              {quotaGone ? (
                <QuotaEmpty limit={quota.limit} />
              ) : (
                <button
                  type="button"
                  className="btn dark block"
                  aria-disabled={!!blocker}
                  onClick={() => {
                    // Statt eines toten Buttons: sagen, was fehlt, und beim Thema direkt ins Feld springen
                    if (blocker) {
                      if (blocker === t.needTopic) sheetTopicRef.current?.focus();
                      else say(blocker);
                      return;
                    }
                    if (flang) rememberLangYear(flang, langYear);
                    if (format) onCreate(format, mode === "photo" ? files : [], mode === "topic" ? topic.trim() : "", profile, notes.trim(), flang ? { lang: flang, year: langYear } : undefined);
                  }}
                >
                  {blocker || t.create}
                </button>
              )}
            </div>
          </div>
        </>
      )}
      <BetaIntro limit={quota?.limit} />
    </div>
  );
}
