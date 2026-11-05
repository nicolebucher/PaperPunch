import { useEffect, useState, type ReactNode } from "react";
import { COUNTRIES, getCountry, guessCountry, type CountryCode } from "../countries";
import { DICTS, deviceLang, LangProvider, type Lang } from "../i18n";
import { BrandMark } from "../brand";
import { Icon, ProfileSelects, TopBar } from "../ui";
import type { Child, Profile, Role } from "../types";
import { isParent, kidsComplete, kidsOf, MAX_CHILDREN, newChildId, setKids, syncActive } from "../children";

/**
 * Erster Start: animierter Willkommensbildschirm, dann eine Frage pro Screen (Sprache, Rolle, Land, Schulart,
 * Klasse, Darstellung) mit automatischem Weiter nach dem Antippen, zum Schluss "So funktioniert's".
 * Als Einstellungen: alles auf einer Seite.
 */
const ROLES: Role[] = ["student", "parent", "teacher"];

export function Onboarding({ initial, isSettings, onSave, onBack }: { initial: Profile | null; isSettings: boolean; onSave: (p: Profile) => void; onBack: () => void }) {
  const [profile, setProfile] = useState<Profile>(
    () => initial ?? { lang: deviceLang(), country: guessCountry(), schoolType: "", grade: 0 }
  );
  const [step, setStep] = useState(isSettings ? 1 : 0);
  const [showAll, setShowAll] = useState(false);
  const [detected] = useState(() => guessCountry());
  const t = DICTS[profile.lang];
  const ready = !!profile.schoolType && profile.grade > 0 && (!isParent(profile) || kidsComplete(profile));
  // Eltern: Kinder beim Speichern immer mitführen (erstes Kind aus Schulart/Klasse)
  const finalProfile = (p: Profile): Profile => (isParent(p) ? syncActive(p) : p);

  function setCountry(code: CountryCode) {
    const country = getCountry(code);
    setProfile((p) => ({
      ...p,
      country: code,
      // Schulart/Klasse nur behalten, wenn es sie im neuen Land gibt.
      schoolType: country.schoolTypes.some((s) => s.value === p.schoolType) ? p.schoolType : "",
      grade: country.grades.some((g) => g.value === p.grade) ? p.grade : 0,
      teachGrades: p.teachGrades?.filter((g) => country.grades.some((x) => x.value === g)),
    }));
  }

  // Hell/Dunkel sofort sichtbar machen, während man wählt
  useEffect(() => {
    document.documentElement.dataset.theme = profile.theme ?? "dark";
  }, [profile.theme]);

  // ---------- Einstellungen: alles auf einer Seite ----------
  if (isSettings) {
    return (
      <LangProvider lang={profile.lang}>
        <div className="screen">
          <TopBar onBack={onBack} />
          <div className="stack" style={{ gap: 20, paddingBottom: 28, flex: 1 }}>
            <h1 className="display">{t.settings}</h1>
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
            <div className="stack" style={{ gap: 8 }}>
              <span className="field-label">{t.roleLabel}</span>
              <div className="row" style={{ flexWrap: "wrap" }}>
                {ROLES.map((r) => (
                  <button key={r} type="button" className={(profile.role ?? "student") === r ? "pill on" : "pill"} aria-pressed={(profile.role ?? "student") === r} onClick={() => setProfile({ ...profile, role: r })}>
                    {t.roles[r]}
                  </button>
                ))}
              </div>
            </div>
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
            {profile.role === "teacher" && (
              <>
                <div className="stack" style={{ gap: 8 }}>
                  <span className="field-label">{t.teachGradesLabel}</span>
                  <div className="kid-chips">
                    {getCountry(profile.country).grades.map((g) => {
                      const on = (profile.teachGrades ?? []).includes(g.value);
                      return <button key={g.value} type="button" className={on ? "pill on" : "pill"} aria-pressed={on} onClick={() => setProfile(toggleTeachGrade(profile, g.value))}>{g.value}</button>;
                    })}
                  </div>
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  <span className="field-label">{t.subjectsLabel}</span>
                  <SubjectChips profile={profile} onChange={setProfile} />
                </div>
              </>
            )}
            {isParent(profile) ? (
              <div className="stack" style={{ gap: 8 }}>
                <span className="field-label">{t.kidsLabel}</span>
                <KidsEditor profile={profile} onChange={setProfile} />
              </div>
            ) : (
              <ProfileSelects profile={profile} onChange={setProfile} />
            )}
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
            <button type="button" className="btn primary block" style={{ marginTop: "auto" }} disabled={!ready} onClick={() => onSave(finalProfile(profile))}>
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

  // ---------- Einrichtung: eine Frage pro Screen, zum Schluss "So funktioniert's" ----------
  type StepKey = "lang" | "role" | "country" | "school" | "grade" | "kids" | "subjects" | "theme" | "how";
  const isTeacher = profile.role === "teacher";
  const keys: StepKey[] = ["lang", "role", "country", "school", "grade", ...(isParent(profile) ? (["kids"] as StepKey[]) : []), ...(isTeacher ? (["subjects"] as StepKey[]) : []), "theme", "how"];
  const TOTAL = keys.length;
  const key = keys[Math.min(step, TOTAL) - 1];
  const country = getCountry(profile.country);
  const theme = profile.theme ?? "dark";
  // Erkanntes Land zuerst, dann die übrigen; "Anderes Land" steht immer am Ende.
  const countryList = [getCountry(detected), ...COUNTRIES.filter((c) => c.code !== detected)].filter((c) => c.code !== "OTHER");
  const shownCountries = showAll ? countryList : countryList.slice(0, 3);
  const shownSchools = showAll ? country.schoolTypes : country.schoolTypes.slice(0, 5);

  function go(next: number) {
    setShowAll(false);
    setStep(next);
  }
  // Nach dem Antippen kurz zeigen, was gewählt ist, dann automatisch weiter.
  function advance() {
    const from = step;
    window.setTimeout(() => setStep((s) => (s === from ? from + 1 : s)), 260);
    setShowAll(false);
  }

  const answered = key === "role" ? !!profile.role : key === "school" ? !!profile.schoolType : key === "grade" ? profile.grade > 0 : key === "kids" ? kidsComplete(profile) : true;
  const role = profile.role ?? "student";

  const option = (key: string, label: string, on: boolean, onClick: () => void, sub?: string) => (
    <button key={key} type="button" className={on ? "ob-opt on" : "ob-opt"} aria-pressed={on} onClick={onClick}>
      <span className="ob-opt-text">
        <span className="ob-opt-label">{label}</span>
        {sub && <span className="ob-opt-sub">{sub}</span>}
      </span>
      <span className="ob-opt-mark">{on && <Icon name="check" size={15} stroke={3} />}</span>
    </button>
  );

  let content: ReactNode;
  if (key === "how") {
    content = (
      <>
        <div className="ob-q">
          <h1>{t.obHowTitle}</h1>
          <p>{t.obHowSub}</p>
        </div>
        <div className="ob-how">
          <div className="ob-how-item">
            <span className="ob-how-icon c1"><Icon name="camera" size={24} /></span>
            <span className="ob-how-text"><b>{t.obHow1}</b><span>{t.obHow1Text}</span></span>
          </div>
          <span className="ob-how-sep" />
          <div className="ob-how-item">
            <span className="ob-how-icon c2"><Icon name="worksheet" size={24} /></span>
            <span className="ob-how-text">
              <b>{t.obHow2}</b>
              <span>{t.obHow2Text}</span>
              <span className="ob-how-formats">
                <span><i className="c1" />{t.formats.worksheet}</span>
                <span><i className="c2" />{t.formats.test}</span>
                <span><i className="c3" />{t.formats.game}</span>
              </span>
            </span>
          </div>
          <span className="ob-how-sep" />
          <div className="ob-how-item">
            <span className="ob-how-icon c3"><Icon name="play" size={24} filled /></span>
            <span className="ob-how-text"><b>{t.obHow3}</b><span>{t.obHow3Text}</span></span>
          </div>
        </div>
      </>
    );
  } else if (key === "lang") {
    content = (
      <>
        <div className="ob-q"><h1>{t.obQLang}</h1><p>{t.obQLangSub}</p></div>
        <div className="ob-opts">
          {(["de", "en"] as Lang[]).map((l) =>
            option(l, l === "de" ? "Deutsch" : "English", profile.lang === l, () => { setProfile((p) => ({ ...p, lang: l })); advance(); })
          )}
        </div>
      </>
    );
  } else if (key === "role") {
    content = (
      <>
        <div className="ob-q"><h1>{t.obQRole}</h1><p>{t.obQRoleSub}</p></div>
        <div className="ob-opts">
          {ROLES.map((r) => option(r, t.roles[r], profile.role === r, () => { setProfile((p) => ({ ...p, role: r })); advance(); }, t.roleSubs[r]))}
        </div>
      </>
    );
  } else if (key === "country") {
    content = (
      <>
        <div className="ob-q"><h1>{t.obQCountry}</h1><p>{t.obQCountrySub}</p></div>
        <div className="ob-opts">
          {shownCountries.map((c) =>
            option(c.code, c.name[profile.lang], profile.country === c.code, () => { setCountry(c.code); advance(); }, c.code === detected ? t.obDetected : undefined)
          )}
          {option("OTHER", getCountry("OTHER").name[profile.lang], profile.country === "OTHER", () => { setCountry("OTHER"); advance(); })}
          {!showAll && countryList.length > 3 && (
            <button type="button" className="ob-more" onClick={() => setShowAll(true)}>{t.obMoreCountries}</button>
          )}
        </div>
      </>
    );
  } else if (key === "school") {
    content = (
      <>
        <div className="ob-q"><h1>{t.obQSchoolBy[role]}</h1><p>{country.name[profile.lang]}</p></div>
        <div className="ob-opts">
          {shownSchools.map((sc) =>
            option(sc.value, sc.label[profile.lang], profile.schoolType === sc.value, () => { setProfile((p) => syncActive({ ...p, schoolType: sc.value })); advance(); })
          )}
          {!showAll && country.schoolTypes.length > 5 && (
            <button type="button" className="ob-more" onClick={() => setShowAll(true)}>{t.obMoreSchools}</button>
          )}
        </div>
      </>
    );
  } else if (key === "grade" && isTeacher) {
    const school = country.schoolTypes.find((x) => x.value === profile.schoolType);
    content = (
      <>
        <div className="ob-q"><h1>{t.obQTeachGrades}</h1><p>{[school?.label[profile.lang], t.obQTeachGradesSub].filter(Boolean).join(" · ")}</p></div>
        <div className="ob-grades">
          {country.grades.map((g) => {
            const on = (profile.teachGrades ?? []).includes(g.value);
            return (
              <button key={g.value} type="button" className={on ? "ob-grade on" : "ob-grade"} aria-pressed={on} aria-label={g.label[profile.lang]} onClick={() => setProfile((p) => toggleTeachGrade(p, g.value))}>
                {g.value}
              </button>
            );
          })}
        </div>
      </>
    );
  } else if (key === "subjects") {
    content = (
      <>
        <div className="ob-q"><h1>{t.obQSubjects}</h1><p>{t.obQSubjectsSub}</p></div>
        <SubjectChips profile={profile} onChange={setProfile} />
      </>
    );
  } else if (key === "grade") {
    const school = country.schoolTypes.find((x) => x.value === profile.schoolType);
    content = (
      <>
        <div className="ob-q"><h1>{t.obQGradeBy[role]}</h1><p>{[school?.label[profile.lang], country.name[profile.lang]].filter(Boolean).join(" · ")}</p></div>
        <div className="ob-grades">
          {country.grades.map((g) => (
            <button
              key={g.value}
              type="button"
              className={profile.grade === g.value ? "ob-grade on" : "ob-grade"}
              aria-pressed={profile.grade === g.value}
              aria-label={g.label[profile.lang]}
              onClick={() => { setProfile((p) => syncActive({ ...p, grade: g.value })); advance(); }}
            >
              {g.value}
            </button>
          ))}
        </div>
      </>
    );
  } else if (key === "kids") {
    content = (
      <>
        <div className="ob-q"><h1>{t.obQKids}</h1><p>{t.obQKidsSub}</p></div>
        <KidsEditor profile={profile} onChange={setProfile} />
      </>
    );
  } else {
    content = (
      <>
        <div className="ob-q"><h1>{t.obQTheme}</h1><p>{t.obQThemeSub}</p></div>
        <div className="ob-themes">
          {(["dark", "light"] as const).map((m) => (
            <button key={m} type="button" className={theme === m ? "ob-theme on" : "ob-theme"} aria-pressed={theme === m} onClick={() => setProfile({ ...profile, theme: m })}>
              <span className={`ob-theme-prev ${m}`} aria-hidden="true">
                <i className="l1" /><i className="l2" /><i className="hero" />
                <span className="tiles"><i /><i /></span>
                <i className="card" />
              </span>
              <span className="ob-theme-label">
                {m === "dark" ? t.themeDark : t.themeLight}
                <span className="ob-opt-mark">{theme === m && <Icon name="check" size={15} stroke={3} />}</span>
              </span>
            </button>
          ))}
        </div>
      </>
    );
  }

  const last = step === TOTAL;
  return (
    <LangProvider lang={profile.lang}>
      <div className="screen ob-flow">
        <div className="ob-top">
          <button type="button" className="home-b-profile" onClick={() => go(step - 1)} aria-label={t.back}>
            <Icon name="back" size={20} stroke={2.4} />
          </button>
          <span className="ob-progress" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step} aria-label={t.stepOf(step, TOTAL)}>
            {Array.from({ length: TOTAL }, (_, i) => <i key={i} className={i < step ? "on" : ""} />)}
          </span>
        </div>
        <div className="ob-body" key={step}>{content}</div>
        <div className="ob-foot">
          <button
            type="button"
            className="btn primary block"
            disabled={last ? !ready : !answered}
            onClick={() => (last ? onSave(finalProfile(profile)) : go(step + 1))}
          >
            {last ? t.obLetsGo : t.next}
          </button>
          {key !== "theme" && key !== "kids" && key !== "subjects" && !(key === "grade" && isTeacher) && <span className="ob-hint">{last ? t.obFirstTime : t.obAutoNext}</span>}
        </div>
      </div>
    </LangProvider>
  );
}

/** Eltern: Kinder mit Name (optional), Schulart und Klasse – im Onboarding und in den Einstellungen. */
function KidsEditor({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const t = DICTS[profile.lang];
  const kids = kidsOf(profile);
  const update = (i: number, patch: Partial<Child>) => onChange(setKids(profile, kids.map((k, j) => (j === i ? { ...k, ...patch } : k))));
  return (
    <div className="stack" style={{ gap: 12 }}>
      {kids.map((k, i) => (
        <div key={k.id} className="kid-card">
          <div className="kid-head">
            <input className="input set" value={k.name} maxLength={20} placeholder={t.childN(i + 1)} aria-label={t.childName} onChange={(e) => update(i, { name: e.target.value })} />
            {kids.length > 1 && (
              <button type="button" className="iconbtn" aria-label={t.childRemove} onClick={() => onChange(setKids(profile, kids.filter((_, j) => j !== i)))}>
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
          <LangProvider lang={profile.lang}>
            <ProfileSelects profile={{ ...profile, schoolType: k.schoolType, grade: k.grade }} onChange={(p) => update(i, { schoolType: p.schoolType, grade: p.grade })} />
          </LangProvider>
        </div>
      ))}
      {kids.length < MAX_CHILDREN && (
        <button type="button" className="ob-more" onClick={() => onChange(setKids(profile, [...kids, { id: newChildId(), name: "", schoolType: kids[kids.length - 1]?.schoolType ?? "", grade: 0 }]))}>
          + {t.childAdd}
        </button>
      )}
      <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{t.childHint}</span>
    </div>
  );
}

/** Lehrkraft: Klassenstufe an-/abwählen; grade folgt der kleinsten gewählten (oder bleibt, wenn noch enthalten). */
function toggleTeachGrade(p: Profile, g: number): Profile {
  const cur = p.teachGrades ?? (p.grade ? [p.grade] : []);
  const next = (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]).sort((a, b) => a - b);
  return { ...p, teachGrades: next, grade: next.includes(p.grade) ? p.grade : next[0] ?? 0 };
}

/** Lehrkraft: Fächer als Chips (Mehrfachauswahl). */
function SubjectChips({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const t = DICTS[profile.lang];
  const chosen = profile.subjects ?? [];
  return (
    <div className="kid-chips">
      {t.subjectList.map((sub) => {
        const on = chosen.includes(sub);
        return (
          <button key={sub} type="button" className={on ? "pill on" : "pill"} aria-pressed={on} onClick={() => onChange({ ...profile, subjects: on ? chosen.filter((x) => x !== sub) : [...chosen, sub] })}>
            {sub}
          </button>
        );
      })}
    </div>
  );
}
