// Filter für öffentlich sichtbare Namen (Spitznamen, Lerngruppen-Namen) – Ranglisten und Challenges
// sehen alle, die den Link haben, und die Nutzer:innen sind oft minderjährig.
// Kopie in mobile/src/nameFilter.ts – beide Dateien gleich halten (außer dieser Kopfzeile).
//
// Vorgehen: Text normalisieren (klein, Umlaute, Leetspeak wie 4→a, 1→i, @→a), dann gegen eine
// Wortliste prüfen. Drei Arten von Treffern, damit harmlose Wörter nicht anschlagen
// ("Marsch" enthält "arsch", "Nudel" beginnt mit "nude", "As" ist kein Schimpfwort):
//   sub   – irgendwo in einem Wort, auch mit gedehnten Buchstaben ("fuuuck") und über einzeln
//           getrennte Buchstaben hinweg ("f.i.c.k", "f i c k") → nur für eindeutige Wörter
//   start – ein Wort beginnt damit ("Arschloch", aber nicht "Marsch")
//   word  – nur als ganzes Wort

const SUB = [
  // Deutsch
  "fick", "fotze", "hurensohn", "wichser", "schlampe", "nutte", "schwuchtel", "missgeburt", "behindert",
  "kanake", "judensau", "vergewaltig", "pimmel", "titten", "arschloch", "siegheil", "hitler", "kinderschaender",
  // Englisch
  "fuck", "motherf", "bitch", "nigger", "nigga", "whore", "faggot", "retard", "pussy", "boobs", "porn",
  "bastard", "bullshit", "shitty", "asshole", "penis", "killyourself", "dickhead", "cocksuck",
];

const START = ["arsch", "hure", "spast", "neger", "wichs", "cunt", "slut", "rape", "wanker", "wanking", "schwanz", "1488"];

const WORD = [
  "nazi", "nazis", "kz", "mongo", "muschi", "heil", "sex", "sexy", "nude", "nudes", "fag", "fags",
  "tits", "cock", "twat", "kys", "milf", "shit", "shits",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i", "€": "e" };

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function leet(text: string): string {
  return text.replace(/[0134578@$!€]/g, (c) => LEET[c] ?? c);
}

const squeeze = (s: string) => s.replace(/(.)\1+/g, "$1");

/** true, wenn der Name ein Schimpfwort o. Ä. enthält und nicht öffentlich angezeigt werden soll. */
export function isBlockedName(name: string): boolean {
  const base = normalize(name);
  if (!base.trim()) return false;
  const variants = [base, leet(base)];
  for (const v of variants) {
    const words = v.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    // einzeln getrennte Buchstaben wieder zusammenziehen: "f.i.c.k" → "fick"
    const merged: string[] = [];
    let run = "";
    for (const t of words) {
      if (t.length === 1) run += t;
      else {
        if (run) merged.push(run);
        run = "";
        merged.push(t);
      }
    }
    if (run) merged.push(run);
    // Umlaute wurden zu "ae/oe/ue" – Listenwörter sind ohne Umlaut geschrieben, daher beide Formen prüfen
    const forms = merged.flatMap((t) => [t, squeeze(t), t.replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u")]);
    if (forms.some((t) => SUB.some((w) => t.includes(w) || t.includes(squeeze(w))))) return true;
    if (forms.some((t) => START.some((w) => t.startsWith(w) || t.startsWith(squeeze(w))))) return true;
    if (merged.some((t) => WORD.includes(t))) return true;
  }
  return false;
}
