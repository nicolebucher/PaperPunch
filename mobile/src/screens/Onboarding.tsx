import { useState } from "react";
import { COUNTRIES, getCountry, guessCountry, type CountryCode } from "../countries";
import { DICTS, deviceLang, LangProvider, type Lang } from "../i18n";
import { ProfileSelects, TopBar } from "../ui";
import type { Profile } from "../types";

/** Erster Start und Einstellungen: Sprache, Land, Schulart, Klasse. */
export function Onboarding({ initial, isSettings, onSave, onBack }: { initial: Profile | null; isSettings: boolean; onSave: (p: Profile) => void; onBack: () => void }) {
  const [profile, setProfile] = useState<Profile>(
    () => initial ?? { lang: deviceLang(), country: guessCountry(), schoolType: "", grade: 0 }
  );
  const t = DICTS[profile.lang];
  const ready = !!profile.schoolType && profile.grade > 0;

  function setCountry(code: CountryCode) {
    const country = getCountry(code);
    setProfile((p) => ({
      ...p,
      country: code,
      // Schulart/Klasse nur behalten, wenn es sie im neuen Land gibt.
      schoolType: country.schoolTypes.some((s) => s.value === p.schoolType) ? p.schoolType : "",
      grade: country.grades.some((g) => g.value === p.grade) ? p.grade : 0,
    }));
  }

  return (
    <LangProvider lang={profile.lang}>
      <div className="screen">
        <TopBar onBack={isSettings ? onBack : undefined} />
        <div className="stack" style={{ gap: 20, paddingBottom: 28, flex: 1 }}>
          <div className="stack" style={{ gap: 8 }}>
            <h1>{isSettings ? t.settings : t.welcomeTitle}</h1>
            {!isSettings && <p className="muted">{t.welcomeText}</p>}
          </div>

          <div className="stack">
            <span className="muted" style={{ fontSize: 14, fontWeight: 700 }}>{t.language}</span>
            <div className="row">
              {(["de", "en"] as Lang[]).map((l) => (
                <button key={l} type="button" className={profile.lang === l ? "pill on" : "pill"} aria-pressed={profile.lang === l} onClick={() => setProfile({ ...profile, lang: l })}>
                  {l === "de" ? "Deutsch" : "English"}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            {t.country}
            <select className="input set" value={profile.country} onChange={(e) => setCountry(e.target.value as CountryCode)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name[profile.lang]}
                </option>
              ))}
            </select>
          </label>

          <ProfileSelects profile={profile} onChange={setProfile} />

          <button type="button" className="btn primary block" style={{ marginTop: "auto" }} disabled={!ready} onClick={() => onSave(profile)}>
            {isSettings ? t.save : t.start}
          </button>
        </div>
      </div>
    </LangProvider>
  );
}
