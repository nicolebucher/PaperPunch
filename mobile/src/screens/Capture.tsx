import { useState } from "react";
import { useT } from "../i18n";
import { addFiles, formatMb, isNative, MAX_BYTES, MAX_FILES, takeNativePhoto, totalBytes, type FileError } from "../files";
import { FileChips, FilePick, FORMATS, Icon, ProfileSelects, TopBar } from "../ui";
import type { MaterialFormat, Profile } from "../types";

/** Prototyp D: Kamera zuerst, alternativ Thema tippen; danach Auswahl-Sheet mit Format, Klasse, Schulart. */
export function Capture({
  profile: initialProfile,
  initialMode,
  initialTopic,
  say,
  onBack,
  onCreate,
}: {
  profile: Profile;
  initialMode: "photo" | "topic";
  initialTopic?: string;
  say: (msg: string) => void;
  onBack: () => void;
  onCreate: (format: MaterialFormat, files: File[], topic: string, profile: Profile, notes: string) => void;
}) {
  const { t, lang } = useT();
  const [mode, setMode] = useState(initialMode);
  const [files, setFiles] = useState<File[]>([]);
  const [sheet, setSheet] = useState(initialMode === "topic");
  const [topic, setTopic] = useState(initialTopic ?? "");
  const [notes, setNotes] = useState("");
  const [format, setFormat] = useState<MaterialFormat | null>(null);
  const [profile, setProfile] = useState(initialProfile);
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);

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
            <span className="muted" style={{ fontSize: 15, fontWeight: 700 }}>{t.topicIdeas}</span>
            <div className="row">
              {t.ideas.map((idea) => (
                <button key={idea} type="button" className={topic === idea ? "pill on" : "pill"} onClick={() => setTopic(idea)}>
                  {idea}
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

              <ProfileSelects profile={profile} onChange={setProfile} />

              <button
                type="button"
                className="btn dark block"
                disabled={!!blocker}
                onClick={() => format && onCreate(format, mode === "photo" ? files : [], mode === "topic" ? topic.trim() : "", profile, notes.trim())}
              >
                {blocker || t.create}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
