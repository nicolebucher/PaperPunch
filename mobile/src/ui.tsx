import type { ReactNode } from "react";
import { useT } from "./i18n";
import { getCountry } from "./countries";
import { kindOf } from "./files";
import type { MaterialFormat, Profile } from "./types";

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="logo" style={{ fontSize: size }}>
      Paper<span>Punch</span>
    </span>
  );
}

export function Toast({ text }: { text: string }) {
  return (
    <div className="toast" role="status">
      {text}
    </div>
  );
}

const PATHS = {
  back: "M15 18l-6-6 6-6",
  close: "M6 6l12 12M18 6L6 18",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  gallery: "M3 4h18v16H3zM9 10a2 2 0 1 0 0-.01M21 16l-5-5-9 9",
  camera: "M3 7h3l2-3h8l2 3h3v13H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  check: "M5 12l5 5 9-10",
  play: "M7 4l12 8-12 8z",
  share: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
  calendar: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
  flag: "M5 21V4h11l-1 4 4 4H5",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  worksheet: "M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h6",
  test: "M9 11l3 3 8-8M20 12v7H4V5h11",
  game: "M6 9h4M8 7v4M15 10h.01M18 8h.01M3 6h18v10a3 3 0 0 1-5 2l-2-2h-4l-2 2a3 3 0 0 1-5-2z",
  podcast: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  review: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, stroke = 2.2 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}

export const FORMATS: MaterialFormat[] = ["worksheet", "test", "game", "podcast"];

export function TopBar({ onBack, right, light }: { onBack?: () => void; right?: ReactNode; light?: boolean }) {
  const { t } = useT();
  return (
    <div className="topbar">
      <div className="row" style={{ flexWrap: "nowrap" }}>
        {onBack && (
          <button type="button" className="iconbtn" onClick={onBack} aria-label={t.back}>
            <Icon name="back" />
          </button>
        )}
        <Logo size={light ? 22 : 24} />
      </div>
      {right}
    </div>
  );
}

export function FileChips({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  const { t } = useT();
  return (
    <div className="chips">
      {files.map((f, i) => {
        const kind = kindOf(f) ?? "JPG";
        const label = f.name.length > 16 ? f.name.slice(0, 13) + "…" : f.name;
        return (
          <span className="chip" key={`${f.name}-${i}`}>
            <span className={kind === "PDF" ? "badge pdf" : "badge"}>{kind}</span>
            {label}
            <button type="button" className="x" onClick={() => onRemove(i)} aria-label={t.remove(f.name)}>
              <Icon name="close" size={16} stroke={2.6} />
            </button>
          </span>
        );
      })}
    </div>
  );
}

/** Klasse und Schulart als Dropdowns, passend zum Land im Profil. */
export function ProfileSelects({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const { t, lang } = useT();
  const country = getCountry(profile.country);
  return (
    <div className="grid2">
      <label className="field">
        {t.grade}
        <select
          className={profile.grade ? "input set" : "input"}
          value={profile.grade || ""}
          onChange={(e) => onChange({ ...profile, grade: Number(e.target.value) })}
        >
          <option value="">{t.choose}</option>
          {country.grades.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label[lang]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {t.schoolType}
        <select
          className={profile.schoolType ? "input set" : "input"}
          value={profile.schoolType}
          onChange={(e) => onChange({ ...profile, schoolType: e.target.value })}
        >
          <option value="">{t.choose}</option>
          {country.schoolTypes.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label[lang]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Unsichtbares Datei-Feld über einem Button: öffnet Galerie/Dateiauswahl (auch PDF). */
export function FilePick({ className, label, onFiles, children, capture }: { className: string; label: string; onFiles: (files: File[]) => void; children: ReactNode; capture?: boolean }) {
  return (
    <label className={`${className} filepick`} title={label}>
      {children}
      <input
        type="file"
        multiple={!capture}
        accept={capture ? "image/*" : "image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf"}
        capture={capture ? "environment" : undefined}
        aria-label={label}
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </label>
  );
}
