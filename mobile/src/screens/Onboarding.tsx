import { useEffect, useState } from "react";
import { COUNTRIES, getCountry, guessCountry, type CountryCode } from "../countries";
import { DICTS, deviceLang, LangProvider, type Lang } from "../i18n";
import { BrandMark } from "../brand";
import { Icon, ProfileSelects, TopBar } from "../ui";
import type { Profile } from "../types";

/**
 * Erster Start: animierter Willkommensbildschirm, dann ein Einrichtungs-Schritt (Sprache, Land, Schule, Darstellung).
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

  // Hell/Dunkel sofort sichtbar machen, während man wählt
  useEffect(() => {
    document.documentElement.dataset.theme = profile.theme ?? "dark";
  }, [profile.theme]);

  const themePicker = (
    <div className="stack" style={{ gap: 8 }}>
      <span className="field-label">{t.theme}</span>
      <div className="row">
        {(["dark", "light"] as const).map((m) => (
          <button key={m} type="button" className={(profile.theme ?? "dark") === m ? "pill on" : "pill"} aria-pressed={(profile.theme ?? "dark") === m} onClick={() => setProfile({ ...profile, theme: m })}>
            {m === "dark" ? t.themeDark : t.themeLight}
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
            {themePicker}
            {countryPicker}
            <ProfileSelects profile={profile} onChange={setProfile} />
            <div className="stack" style={{ gap: 4 }}>
              <span className="field-label">{t.contactTitle}</span>
              <span className="muted" style={{ fontSize: 15 }}>{t.contactText}</span>
              <a href="mailto:hello@paper-punch.com" className="contact-link">hello@paper-punch.com</a>
              <span className="legal-links">
                <a href="https://paper-punch.com/terms" target="_blank" rel="noopener noreferrer">{t.legalTerms}</a>
                <a href="https://paper-punch.com/privacy" target="_blank" rel="noopener noreferrer">{t.legalPrivacy}</a>
                <a href="https://paper-punch.com/imprint" target="_blank" rel="noopener noreferrer">{t.legalImprint}</a>
              </span>
            </div>
            <button type="button" className="btn primary block" style={{ marginTop: "auto" }} disabled={!ready} onClick={() => onSave(profile)}>
              {t.save}
            </button>
          </div>
        </div>
      </LangProvider>
    );
  }

  // ---------- Willkommen: nur das Logo, das langsam einfliegt, danach der Button ----------
  if (step === 0) {
    return (
      <LangProvider lang={profile.lang}>
        <div className="screen ob-intro">
          <div className="ob-intro-stage">
            <BrandMark mode="intro" className="ob-intro-mark" />
            <div className="ob-intro-word" aria-label="PaperPunch">
              <span className="logo-paper">Paper</span><span className="logo-punch">Punch</span>
            </div>
          </div>
          <div className="ob-intro-cta">
            <button type="button" className="btn primary block ob-cta" onClick={() => setStep(1)}>
              {t.obStart}
            </button>
          </div>
        </div>
      </LangProvider>
    );
  }

  // ---------- Ein Einrichtungs-Schritt: Sprache, Land, Schule, Darstellung ----------
  return (
    <LangProvider lang={profile.lang}>
      <div className="screen">
        <div className="topbar">
          <button type="button" className="iconbtn" onClick={() => setStep(0)} aria-label={t.back}>
            <Icon name="back" />
          </button>
        </div>
        <div className="stack ob-step" style={{ gap: 20, paddingBottom: 28, flex: 1 }}>
          <div className="stack" style={{ gap: 8 }}>
            <h1 className="display">{t.obSetup}</h1>
            <p className="muted">{t.welcomeText}</p>
          </div>
          {langPicker}
          {countryPicker}
          <ProfileSelects profile={profile} onChange={setProfile} />
          {themePicker}
          <button type="button" className="btn primary block" style={{ marginTop: "auto" }} disabled={!ready} onClick={() => onSave(profile)}>
            {t.start}
          </button>
        </div>
      </div>
    </LangProvider>
  );
}
