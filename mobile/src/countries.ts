import type { Lang } from "./i18n";

// Schulsystem je Land: Schularten (der Wert geht an die API), Klassenbezeichnung und Notenskala.
// Die API kennt dieselben Ländercodes (types/generation.ts → countries).

export type CountryCode = "DE" | "AT" | "CH" | "GB" | "IE" | "US" | "CA" | "AU" | "OTHER";

type Text = Record<Lang, string>;

export interface Country {
  code: CountryCode;
  name: Text;
  schoolTypes: { value: string; label: Text }[];
  grades: { value: number; label: Text }[];
  // Notenskala, beste Note zuerst. "value" geht als Wunschnote an die API.
  gradeScale: { value: string; label: Text }[];
}

const OTHER_SCHOOL = { value: "Other", label: { de: "Sonstiges", en: "Other" } };

function range(from: number, to: number, label: (n: number) => Text) {
  const out = [];
  for (let n = from; n <= to; n++) out.push({ value: n, label: label(n) });
  return out;
}

const klasse = (n: number): Text => ({ de: `${n}. Klasse`, en: `Grade ${n}` });
const year = (n: number): Text => ({ de: `Year ${n}`, en: `Year ${n}` });
const usGrade = (n: number): Text => ({ de: `${n}. Klasse (Grade ${n})`, en: `Grade ${n}` });

const GERMAN_SCALE = [
  { value: "1", label: { de: "1 – sehr gut", en: "1 – very good" } },
  { value: "2", label: { de: "2 – gut", en: "2 – good" } },
  { value: "3", label: { de: "3 – befriedigend", en: "3 – satisfactory" } },
  { value: "4", label: { de: "4 – ausreichend", en: "4 – sufficient" } },
  { value: "5", label: { de: "5 – mangelhaft", en: "5 – poor" } },
];

const LETTER_SCALE = ["A", "B", "C", "D"].map((l) => ({ value: l, label: { de: l, en: l } }));

const PERCENT_SCALE = ["90%+", "80%+", "70%+", "60%+", "50%+"].map((p) => ({ value: p, label: { de: p, en: p } }));

export const COUNTRIES: Country[] = [
  {
    code: "DE",
    name: { de: "Deutschland", en: "Germany" },
    schoolTypes: [
      { value: "Grundschule", label: { de: "Grundschule", en: "Primary school" } },
      { value: "Gymnasium", label: { de: "Gymnasium", en: "Gymnasium (academic track)" } },
      { value: "Realschule", label: { de: "Realschule", en: "Realschule" } },
      { value: "Haupt-/Mittelschule", label: { de: "Haupt-/Mittelschule", en: "Hauptschule/Mittelschule" } },
      { value: "Oberschule/Gesamtschule", label: { de: "Oberschule/Gesamtschule", en: "Oberschule/Comprehensive school" } },
      { value: "Berufsschule", label: { de: "Berufsschule", en: "Vocational school" } },
      { value: "Abendschule", label: { de: "Abendschule", en: "Evening school" } },
      { value: "Sonstiges", label: { de: "Sonstiges", en: "Other" } },
    ],
    grades: range(1, 13, klasse),
    gradeScale: GERMAN_SCALE,
  },
  {
    code: "AT",
    name: { de: "Österreich", en: "Austria" },
    schoolTypes: [
      { value: "Volksschule", label: { de: "Volksschule", en: "Primary school" } },
      { value: "Mittelschule", label: { de: "Mittelschule", en: "Middle school" } },
      { value: "AHS", label: { de: "AHS (Gymnasium)", en: "AHS (academic secondary)" } },
      { value: "BHS/BMS", label: { de: "BHS/BMS", en: "Vocational secondary (BHS/BMS)" } },
      { value: "Polytechnische Schule", label: { de: "Polytechnische Schule", en: "Pre-vocational school" } },
      { value: "Sonstiges", label: { de: "Sonstiges", en: "Other" } },
    ],
    grades: range(1, 13, (n) => ({ de: `${n}. Schulstufe`, en: `Grade ${n}` })),
    gradeScale: [
      { value: "1", label: { de: "1 – Sehr gut", en: "1 – Excellent" } },
      { value: "2", label: { de: "2 – Gut", en: "2 – Good" } },
      { value: "3", label: { de: "3 – Befriedigend", en: "3 – Satisfactory" } },
      { value: "4", label: { de: "4 – Genügend", en: "4 – Sufficient" } },
    ],
  },
  {
    code: "CH",
    name: { de: "Schweiz", en: "Switzerland" },
    schoolTypes: [
      { value: "Primarschule", label: { de: "Primarschule", en: "Primary school" } },
      { value: "Sekundarschule", label: { de: "Sekundarschule", en: "Lower secondary school" } },
      { value: "Gymnasium", label: { de: "Gymnasium", en: "Gymnasium (academic track)" } },
      { value: "Berufsschule", label: { de: "Berufsschule", en: "Vocational school" } },
      { value: "Sonstiges", label: { de: "Sonstiges", en: "Other" } },
    ],
    grades: range(1, 13, klasse),
    gradeScale: [
      { value: "6", label: { de: "6 – sehr gut", en: "6 – excellent" } },
      { value: "5.5", label: { de: "5,5", en: "5.5" } },
      { value: "5", label: { de: "5 – gut", en: "5 – good" } },
      { value: "4.5", label: { de: "4,5", en: "4.5" } },
      { value: "4", label: { de: "4 – genügend", en: "4 – pass" } },
    ],
  },
  {
    code: "GB",
    name: { de: "Vereinigtes Königreich", en: "United Kingdom" },
    schoolTypes: [
      { value: "Primary school", label: { de: "Primary school", en: "Primary school" } },
      { value: "Secondary school (KS3)", label: { de: "Secondary school (KS3)", en: "Secondary school (KS3)" } },
      { value: "GCSE", label: { de: "GCSE (Year 10–11)", en: "GCSE (Year 10–11)" } },
      { value: "Sixth form / A-level", label: { de: "Sixth Form / A-Level", en: "Sixth form / A-level" } },
      { value: "College", label: { de: "College", en: "College" } },
      OTHER_SCHOOL,
    ],
    grades: range(1, 13, year),
    gradeScale: ["9", "8", "7", "6", "5", "4"].map((g) => ({ value: g, label: { de: `GCSE ${g}`, en: `GCSE ${g}` } })),
  },
  {
    code: "IE",
    name: { de: "Irland", en: "Ireland" },
    schoolTypes: [
      { value: "Primary school", label: { de: "Primary school", en: "Primary school" } },
      { value: "Junior Cycle", label: { de: "Junior Cycle", en: "Junior Cycle" } },
      { value: "Leaving Certificate", label: { de: "Leaving Certificate", en: "Leaving Certificate" } },
      OTHER_SCHOOL,
    ],
    grades: range(1, 13, year),
    gradeScale: PERCENT_SCALE,
  },
  {
    code: "US",
    name: { de: "USA", en: "United States" },
    schoolTypes: [
      { value: "Elementary school", label: { de: "Elementary School", en: "Elementary school" } },
      { value: "Middle school", label: { de: "Middle School", en: "Middle school" } },
      { value: "High school", label: { de: "High School", en: "High school" } },
      { value: "Community college", label: { de: "Community College", en: "Community college" } },
      OTHER_SCHOOL,
    ],
    grades: range(1, 12, usGrade),
    gradeScale: LETTER_SCALE,
  },
  {
    code: "CA",
    name: { de: "Kanada", en: "Canada" },
    schoolTypes: [
      { value: "Elementary school", label: { de: "Elementary School", en: "Elementary school" } },
      { value: "Middle school", label: { de: "Middle School", en: "Middle school" } },
      { value: "High school", label: { de: "High School", en: "High school" } },
      OTHER_SCHOOL,
    ],
    grades: range(1, 12, usGrade),
    gradeScale: LETTER_SCALE,
  },
  {
    code: "AU",
    name: { de: "Australien", en: "Australia" },
    schoolTypes: [
      { value: "Primary school", label: { de: "Primary School", en: "Primary school" } },
      { value: "Secondary school", label: { de: "Secondary School", en: "Secondary school" } },
      { value: "Senior secondary (Year 11-12)", label: { de: "Senior Secondary (Year 11–12)", en: "Senior secondary (Year 11–12)" } },
      OTHER_SCHOOL,
    ],
    grades: range(1, 12, year),
    gradeScale: LETTER_SCALE,
  },
  {
    code: "OTHER",
    name: { de: "Anderes Land", en: "Other country" },
    schoolTypes: [
      { value: "Primary school", label: { de: "Grundschule", en: "Primary school" } },
      { value: "Secondary school", label: { de: "Weiterführende Schule", en: "Secondary school" } },
      { value: "Vocational school", label: { de: "Berufsschule", en: "Vocational school" } },
      { value: "Other", label: { de: "Sonstiges", en: "Other" } },
    ],
    grades: range(1, 13, (n) => ({ de: `${n}. Klasse`, en: `Grade ${n}` })),
    gradeScale: PERCENT_SCALE,
  },
];

export function getCountry(code: CountryCode): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[COUNTRIES.length - 1];
}

/** Guesses the country from the device locale, e.g. "de-AT" → AT, "en-GB" → GB. */
export function guessCountry(): CountryCode {
  const region = (navigator.language.split("-")[1] ?? "").toUpperCase();
  const lang = navigator.language.slice(0, 2).toLowerCase();
  const known = COUNTRIES.find((c) => c.code === region);
  if (known) return known.code;
  if (region === "UK") return "GB";
  if (lang === "de") return "DE";
  return "OTHER";
}
