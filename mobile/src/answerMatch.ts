// Toleranter Vergleich von Freitext-Antworten – identisch in lib/answer-match.ts der Website (bei Änderungen beide anpassen).
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

/** Zahl aus "3/4", "0,75", "0.75", "75 %" – sonst null. */
function asNumber(s: string): number | null {
  const t = s.replace(/\s/g, "").replace(",", ".");
  const frac = t.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (frac) return Number(frac[2]) === 0 ? null : Number(frac[1]) / Number(frac[2]);
  const pct = t.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (pct) return Number(pct[1]) / 100;
  return /^-?\d+(?:\.\d+)?$/.test(t) ? Number(t) : null;
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
  for (const part of expected.split(/\s+(?:oder|or|bzw\.)\s+|\s*\/\s*(?=\D)/)) if (part.trim()) out.add(part);
  // ohne Artikel am Anfang
  for (const v of [...out]) out.add(v.replace(/^(der|die|das|den|dem|ein|eine|einen|the|a|an)\s+/i, ""));
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

/** true, wenn `given` als richtig gilt. `prompt` (optional) = Aufgabentext mit "___" für Lückentexte. `strict` = Rechtschreib-Übung. */
export function answerMatches(given: string, expected: string, accepted: string[] = [], prompt = "", strict = false): boolean {
  if (strict) {
    const g = foldKeep(given);
    return !!g && [expected, ...accepted].some((a) => foldKeep(a) === g);
  }
  const g = fold(given).replace(/^(der|die|das|den|dem|ein|eine|einen|the|a|an)\s+/, "");
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
    // ein Tippfehler bei Wörtern ab 5 Buchstaben, zwei ab 12
    const allowed = c.length >= 12 ? 2 : c.length >= 5 ? 1 : 0;
    if (allowed && distance(g, c) <= allowed) return true;
  }
  return false;
}
