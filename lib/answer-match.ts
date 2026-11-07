// Toleranter Vergleich von Freitext-Antworten – identisch in mobile/src/answerMatch.ts (bei Änderungen beide anpassen).
// Ziel: richtige Antworten nicht an Schreibweise scheitern lassen (Groß/klein, Satzzeichen, Klammerzusätze,
// Abkürzungen, Zahlenformate, ein Tippfehler), ohne falsche Antworten durchzulassen.

function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[“”„"'`´’]/g, "")
    .replace(/[.,;:!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Zahl aus "3/4", "0,75", "0.75", "75 %", "1.000" (Tausenderpunkt) – sonst null. */
function asNumber(s: string): number | null {
  const raw = s.replace(/\s/g, "");
  // Tausendertrennzeichen: "1.000", "12.500.000" (deutsch) bzw. "1,000" (englisch) = ganze Zahl,
  // nicht 1,0. Drei Ziffern nach dem Trenner und keine führende Null ("0,125" bleibt eine Dezimalzahl).
  if (/^-?[1-9]\d{0,2}([.,]\d{3})+$/.test(raw)) {
    return Number(raw.replace(/[.,]/g, ""));
  }
  const t = raw.replace(",", ".");
  const frac = t.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (frac) return Number(frac[2]) === 0 ? null : Number(frac[1]) / Number(frac[2]);
  const pct = t.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (pct) return Number(pct[1]) / 100;
  return /^-?\d+(?:\.\d+)?$/.test(t) ? Number(t) : null;
}

/** Alle Zahlen im Text, in Reihenfolge ("x = 5 cm" → [5]). */
function numbersIn(s: string): (number | null)[] {
  return (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map(asNumber);
}

function sameNumbers(a: string, b: string): boolean {
  const x = numbersIn(a);
  const y = numbersIn(b);
  return x.length === y.length && x.every((n, i) => n !== null && y[i] !== null && Math.abs(n - (y[i] as number)) < 1e-9);
}

function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/** Alle Formen einer erwarteten Antwort: "greatest common factor (GCF)" → ganze Antwort, ohne Klammer, Klammerinhalt. */
function variants(expected: string): string[] {
  const out = new Set<string>([expected]);
  const paren = expected.match(/^(.*?)\s*\(([^)]+)\)\s*(.*)$/);
  if (paren) {
    out.add(`${paren[1]} ${paren[3]}`.trim());
    out.add(paren[2]);
  }
  // "/" nur als "oder" werten, wenn Leerzeichen drumherum stehen oder auf beiden Seiten ganze Wörter
  // (ab 4 Buchstaben): "Mitose / Meiose", "Mitose/Meiose" – aber Einheiten wie "km/h", "m/s" bleiben ganz.
  for (const part of expected.split(/\s+(?:oder|or|bzw\.)\s+|\s+\/\s+|(?<=\p{L}{4})\/(?=\p{L}{4})/u)) if (part.trim()) out.add(part);
  // ohne Artikel am Anfang
  for (const v of [...out]) out.add(v.replace(/^(der|die|das|den|dem|ein|eine|einen|the|a|an|el|la|los|las|un|una|le|les|il|lo|gli)\s+/i, ""));
  return [...out].map(fold).filter(Boolean);
}

/**
 * Lückentext: Wörter, die direkt vor/nach "___" schon im Satz stehen, muss niemand mittippen.
 * "… is called a ___ fraction." mit Lösung "proper fraction" → auch "proper" ist richtig.
 */
function gapVariants(prompt: string, answers: string[]): string[] {
  const at = prompt.indexOf("___");
  if (at < 0) return [];
  // Satzzeichen an jedem Wort weg ("fraction," → "fraction")
  const words = (t: string) => fold(t).split(" ").map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")).filter(Boolean);
  const before = words(prompt.slice(0, at)).slice(-3);
  const after = words(prompt.slice(at).replace(/^_+/, "")).slice(0, 3);
  const out: string[] = [];
  for (const a of answers) {
    let words = fold(a).split(" ").filter(Boolean);
    for (let n = Math.min(after.length, words.length - 1); n > 0; n--) {
      if (words.slice(-n).join(" ") === after.slice(0, n).join(" ")) { words = words.slice(0, -n); break; }
    }
    for (let n = Math.min(before.length, words.length - 1); n > 0; n--) {
      if (words.slice(0, n).join(" ") === before.slice(-n).join(" ")) { words = words.slice(n); break; }
    }
    const v = words.join(" ");
    if (v && v !== fold(a)) out.push(v);
  }
  return out;
}

/** Aufzählungen vergleichbar machen: "Zehntel, Hundertstel und Tausendstel" = "Zehntel Hundertstel Tausendstel". */
function listKey(s: string): string {
  return s.replace(/\s*(?:,|;|\/|&|\+|\bund\b|\band\b|\bsowie\b)\s*/g, " ").replace(/\s+/g, " ").trim();
}

/** Rechtschreib-Übungen: dort zählt jeder Buchstabe (keine Tippfehler-Toleranz, Umlaute müssen stimmen). */
export function isSpellingContext(text: string): boolean {
  return /rechtschreib|spelling|diktat|schreibweise|gro(ß|ss)- und kleinschreibung/i.test(text);
}

/** Wie fold, aber Umlaute/ß bleiben – um "äpfel" von "apfel" zu unterscheiden. */
function foldKeep(s: string): string {
  return s.toLowerCase().replace(/[“”„"'`´’]/g, "").replace(/[.,;:!?]+$/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Wurde die Antwort nur dank Toleranz als richtig gewertet (Tippfehler, fehlende Umlaute)?
 * Dann die richtige Schreibweise zurückgeben, damit die App "Achte auf die Schreibweise: Äpfel" zeigen kann.
 */
export function spellingNote(given: string, expected: string, accepted: string[] = [], prompt = ""): string | null {
  if (!answerMatches(given, expected, accepted, prompt)) return null;
  const g = foldKeep(given).replace(/^(der|die|das|den|dem|ein|eine|einen|the|a|an)\s+/, "");
  if (asNumber(g) !== null) return null;
  for (const a of [expected, ...accepted]) {
    const k = foldKeep(a);
    if (g === k || g === k.replace(/^(der|die|das|den|dem|ein|eine|einen|the|a|an)\s+/, "")) return null;
  }
  // Nur melden, wenn die Antwort wirklich nah an der erwarteten Schreibweise liegt (nicht bei Varianten/Listen)
  const e = foldKeep(expected).replace(/^(der|die|das|den|dem|ein|eine|einen|the|a|an)\s+/, "");
  return distance(fold(g), fold(e)) <= 2 && (fold(g) !== fold(e) || g !== e) ? expected : null;
}

/**
 * Antwort mit Schrägstrich in Einzelformen zerlegen: "el despistado/la despistada" → beide Formen,
 * "despistado/a" → "despistado", "despistada"; "Lehrer/in" → "Lehrer", "Lehrerin". null = kein Schrägstrich.
 */
function slashForms(given: string): string[] | null {
  if (!given.includes("/")) return null;
  const parts = given.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const out: string[] = [parts[0]];
  for (const p of parts.slice(1)) {
    // kurze Endung (a, in, e, innen …) = nur die weibliche/andere Form derselben Antwort ("despistado/a",
    // "Lehrer/in") – dann zählt die erste Form; eigenständige Formen ("la despistada") müssen selbst stimmen
    if (/^\p{L}{4,}$/u.test(parts[0]) && /^\p{L}{1,5}$/u.test(p) && p.length < parts[0].length / 2 + 1) continue;
    out.push(p);
  }
  return out;
}

/** true, wenn `given` als richtig gilt. `prompt` (optional) = Aufgabentext mit "___" für Lückentexte. `strict` = Rechtschreib-Übung. */
export function answerMatches(given: string, expected: string, accepted: string[] = [], prompt = "", strict = false): boolean {
  if (strict) {
    const g = foldKeep(given);
    return !!g && [expected, ...accepted].some((a) => foldKeep(a) === g);
  }
  if (matchOne(given, expected, accepted, prompt)) return true;
  // Mehrere Formen mit Schrägstrich ("despistado/a", "el amigo/la amiga"): richtig, wenn jede Form für sich richtig ist
  const forms = slashForms(given);
  return !!forms && forms.every((f) => matchOne(f, expected, accepted, prompt));
}

function matchOne(given: string, expected: string, accepted: string[], prompt: string): boolean {
  const g = fold(given).replace(/^(der|die|das|den|dem|ein|eine|einen|the|a|an|el|la|los|las|un|una|le|les|il|lo|gli)\s+/, "");
  if (!g) return false;
  const answers = [expected, ...accepted];
  const candidates = [...answers, ...gapVariants(prompt, answers)].flatMap(variants);
  const gNum = asNumber(g);
  for (const c of candidates) {
    if (g === c) return true;
    if (c.includes(" ") && listKey(g) === listKey(c)) return true;
    const cNum = asNumber(c);
    if (gNum !== null && cNum !== null) {
      if (Math.abs(gNum - cNum) < 1e-9) return true;
      continue; // Zahlen nie per Tippfehler-Toleranz
    }
    // Zahlen mit Einheit o. Ä. ("12 cm", "x = 5"): die Zahlen müssen exakt stimmen, Toleranz nur für den Rest
    if (!sameNumbers(g, c)) continue;
    // ein Tippfehler bei Wörtern ab 5 Buchstaben, zwei ab 12
    const allowed = c.length >= 12 ? 2 : c.length >= 5 ? 1 : 0;
    if (allowed && distance(g, c) <= allowed) return true;
  }
  return false;
}


/**
 * Tipp für Lückentexte: erster Buchstabe jedes Worts, Rest als Striche ("la guitarra" → "l_ g_______").
 * Satzzeichen und Leerzeichen bleiben. Bei Zahlen (auch mit Einheit) und sehr kurzen Antworten (≤ 2 Zeichen) kein Tipp (null).
 */
export function answerHint(answer: string): string | null {
  const a = answer.trim();
  if (a.length <= 2 || /\d/.test(a) || !/\p{L}/u.test(a)) return null;
  return a
    .split(/(\s+)/)
    .map((w) => (/^\s+$/.test(w) ? w : w.replace(/(\p{L})([\p{L}'’-]*)/u, (_, first: string, rest: string) => first + rest.replace(/\p{L}/gu, "_"))))
    .join("");
}

const LANGS =
  "Spanisch|Englisch|Französisch|Italienisch|Latein|Deutsch|Russisch|Türkisch|Polnisch|Niederländisch|Portugiesisch|Griechisch|Chinesisch|Japanisch|Arabisch|" +
  "Spanish|English|French|Italian|Latin|German|Russian|Turkish|Polish|Dutch|Portuguese|Greek|Chinese|Japanese|Arabic";
const NOTE = `(?:auf|in)\\s+(?:${LANGS})`;

/**
 * Sprachhinweis aus der Aufgabe lösen, damit er klein über der Frage steht statt in der großen Überschrift:
 * "Paul spielt ___ (auf Spanisch: Gitarre)." → { text: "Paul spielt ___ (Gitarre).", note: "Auf Spanisch" }.
 * Erkennt "(auf Spanisch)", "(auf Spanisch: Gitarre)", "– auf Spanisch" am Ende und "Auf Spanisch:" am Anfang.
 */
export function splitLanguageNote(question: string): { text: string; note: string | null } {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const tidy = (s: string) => s.replace(/\s{2,}/g, " ").replace(/\s+([.,!?;:])/g, "$1").trim();
  let m = question.match(new RegExp(`\\(\\s*(${NOTE})\\s*[:,]\\s*([^)]+)\\)`, "i"));
  if (m) return { text: tidy(question.replace(m[0], `(${m[2].trim()})`)), note: cap(m[1].replace(/\s+/g, " ")) };
  m = question.match(new RegExp(`\\(\\s*(${NOTE})\\s*\\)`, "i"));
  if (m) return { text: tidy(question.replace(m[0], "")), note: cap(m[1].replace(/\s+/g, " ")) };
  m = question.match(new RegExp(`\\s+[–—-]\\s*(${NOTE})\\s*([.!?]?)\\s*$`, "i"));
  if (m) return { text: tidy(question.slice(0, m.index) + m[2]), note: cap(m[1].replace(/\s+/g, " ")) };
  m = question.match(new RegExp(`^\\s*(${NOTE})\\s*:\\s*`, "i"));
  if (m && question.length > m[0].length) return { text: tidy(question.slice(m[0].length)), note: cap(m[1].replace(/\s+/g, " ")) };
  return { text: question, note: null };
}

/** Satz bauen: Wortkärtchen aus dem Lösungssatz, fest gemischt (nie in der richtigen Reihenfolge). Satzzeichen am
 *  Satzanfang/-ende (¿ ¡ . ! ?) kommen nicht auf die Kärtchen – sie zählen beim Prüfen ohnehin nicht. */
export function sentenceTiles(answer: string, seedText: string): string[] {
  const words = answer.trim().replace(/^[¿¡"„“'«]+/, "").replace(/[.!?…"“”'»]+$/, "").split(/\s+/).filter(Boolean);
  return orderTiles(words, seedText);
}

/** Reihenfolge: Einträge fest gemischt, nie in der richtigen Reihenfolge (auch Grundlage für die Satz-Kärtchen). */
export function orderTiles(items: string[], seedText: string): string[] {
  const words = items;
  if (words.length < 2) return [...words];
  let seed = 2166136261;
  for (const ch of seedText) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let out = [...words];
  for (let tries = 0; tries < 12 && (tries === 0 || out.join(" ") === words.join(" ")); tries++) {
    out = [...words];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
  }
  if (out.join(" ") === words.join(" ")) out = [...words.slice(1), words[0]];
  return out;
}

/** Gebauten Satz prüfen: Reihenfolge zählt, Groß/klein und Satzzeichen nicht; andere richtige Wortstellungen aus acceptedAnswers zählen auch. */
export function sentenceMatches(built: string, answer: string, accepted: string[] = []): boolean {
  const key = (s: string) =>
    s
      .toLowerCase()
      .replace(/[¿¡.,!?;:…"„“”'«»()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const b = key(built);
  return b !== "" && [answer, ...accepted].some((a) => key(a) === b);
}

/** Reihenfolge prüfen: gleiche Einträge in derselben Folge (Groß/klein und Leerzeichen egal). */
export function orderMatches(built: string[], items: string[]): boolean {
  const k = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return built.length === items.length && built.every((b, i) => k(b) === k(items[i]));
}
