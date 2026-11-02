import { useState } from "react";
import { COUNTRIES, getCountry, guessCountry, type CountryCode } from "../countries";
import { DICTS, deviceLang, LangProvider, type Lang } from "../i18n";
import { BrandMark } from "../brand";
import { Icon, ProfileSelects, TopBar } from "../ui";
import type { Profile } from "../types";

const FEATURES = [
  { icon: "camera", key: "obFeat1" },
  { icon: "game", key: "obFeat2" },
  { icon: "flag", key: "obFeat3" },
] as const;

/**
 * Erster Start: animierter Willkommensbildschirm, dann zwei kurze Schritte (Sprache/Land, Schule).
 * Als Einstellungen: nur das Formular.
 */
export function Onboarding({ initial, isSettings, onSave, onBack }: { initial: Profile | null; isSettings: boolean; onSave: (p: Profile) => void; onBack: () => void }) {
  const [profile, setProfile] = useState<Profile>(
    () => initial ?? { lang: deviceLang(), country: guessCountry(), schoolType: "", grade: 0 }
  );
  const [step, setStep] = useState(isSettings ? 1 : 0);
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

  const langPicker = (
    <div className="stack" style={{ gap: 8 }}>
      <span className="field-label">{t.language}</span>
      <div className="row">
        {(["de", "en"] as Lang[]).map((l) => (
          <button key={l} type="button" className={profile.lang === l ? "pill on" : "pill"} aria-pressed={profile.lang === l} onClick={() => setProfile({ ...profile, lang: l })}>
            {l === "de" ? "Deutsch" : "English"}
          </button>
        ))}
      </div>
    </div>
  );

  const countryPicker = (
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
  );

  // ---------- Einstellungen: alles auf einer Seite ----------
  if (isSettings) {
    return (
      <LangProvider lang={profile.lang}>
        <div className="screen">
          <TopBar onBack={onBack} />
          <div className="stack" style={{ gap: 20, paddingBottom: 28, flex: 1 }}>
            <h1 className="display">{t.settings}</h1>
            {langPicker}
            {countryPicker}
            <ProfileSelects profile={profile} onChange={setProfile} />
            <button type="button" className="btn primary block" style={{ marginTop: "auto" }} disabled={!ready} onClick={() => onSave(profile)}>
              {t.save}
            </button>
          </div>
        </div>
      </LangProvider>
    );
  }

  // ---------- Willkommen ----------
  if (step === 0) {
    return (
      <LangProvider lang={profile.lang}>
        <div className="screen ob-welcome">
          <div className="ob-rain" aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}
          </div>
          <div className="ob-lang">
            {(["de", "en"] as Lang[]).map((l) => (
              <button key={l} type="button" className={profile.lang === l ? "on" : ""} aria-pressed={profile.lang === l} onClick={() => setProfile({ ...profile, lang: l })}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="ob-hero">
            <BrandMark mode="punch" className="ob-mark" />
            <div className="ob-word" aria-label="PaperPunch">
              <span className="logo-paper">Paper</span><span className="logo-punch">Punch</span>
            </div>
            <h1 className="display ob-title">{t.obTitle}</h1>
          </div>

          <div className="stack ob-features" style={{ gap: 10 }}>
            {FEATURES.map((f, i) => (
              <div key={f.key} className="ob-feature" style={{ ["--d" as string]: `${0.5 + i * 0.15}s` }}>
                <span className="ob-feature-icon"><Icon name={f.icon} size={22} /></span>
                <span>{t[f.key]}</span>
              </div>
            ))}
          </div>

          <div className="stack" style={{ marginTop: "auto", gap: 10, paddingBottom: 24 }}>
            <button type="button" className="btn primary block ob-cta" onClick={() => setStep(1)}>
              {t.obStart} <Icon name="chevron" size={20} stroke={2.6} />
            </button>
            <p className="muted" style={{ fontSize: 13, textAlign: "center" }}>{t.obPrivacy}</p>
          </div>
        </div>
      </LangProvider>
    );
  }

  // ---------- Schritte 1 und 2 ----------
  return (
    <LangProvider lang={profile.lang}>
      <div className="screen">
        <div className="topbar">
          <button type="button" className="iconbtn" onClick={() => setStep(step - 1)} aria-label={t.back}>
            <Icon name="back" />
          </button>
          <div className="ob-steps" aria-label={`${step} / 2`}>
            {[1, 2].map((n) => <span key={n} className={n <= step ? "on" : ""} />)}
          </div>
          <span style={{ width: 44 }} />
        </div>

        <div className="stack ob-step" key={step} style={{ gap: 20, paddingBottom: 28, flex: 1 }}>
          {step === 1 ? (
            <>
              <div className="stack" style={{ gap: 8 }}>
                <span className="eyebrow">{t.obStep(1)}</span>
                <h1 className="display">{t.obWhere}</h1>
              </div>
              {langPicker}
              {countryPicker}
              <button type="button" className="btn primary block" style={{ marginTop: "auto" }} onClick={() => setStep(2)}>
                {t.next}
              </button>
            </>
          ) : (
            <>
              <div className="stack" style={{ gap: 8 }}>
                <span className="eyebrow">{t.obStep(2)}</span>
                <h1 className="display">{t.obSchool}</h1>
                <p className="muted">{t.welcomeText}</p>
              </div>
              <ProfileSelects profile={profile} onChange={setProfile} />
              <button type="button" className="btn primary block" style={{ marginTop: "auto" }} disabled={!ready} onClick={() => onSave(profile)}>
                {t.start}
              </button>
            </>
          )}
        </div>
      </div>
    </LangProvider>
  );
}
