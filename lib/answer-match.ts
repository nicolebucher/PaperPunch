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

/** true, wenn `given` als richtig gilt. */
export function answerMatches(given: string, expected: string, accepted: string[] = []): boolean {
  const g = fold(given).replace(/^(der|die|das|den|dem|ein|eine|einen|the|a|an)\s+/, "");
  if (!g) return false;
  const candidates = [expected, ...accepted].flatMap(variants);
  const gNum = asNumber(g);
  for (const c of candidates) {
    if (g === c) return true;
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
