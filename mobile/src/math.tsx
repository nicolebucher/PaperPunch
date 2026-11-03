import type { ReactNode } from "react";

// Brüche wie in der Schule: 3/4 → Zähler über Bruchstrich über Nenner. Nicht in Datumsangaben (1/2/2025)
// oder Einheiten (km/h). Screenreader lesen "3 von 4" bzw. "3 over 4" über das aria-label.
const FRACTION = /(?<![\d/])(\d{1,4})\s*\/\s*(\d{1,4})(?![\d/])/g;

export function MathText({ text }: { text: string }) {
  if (!text) return null;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(FRACTION)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    parts.push(
      <span key={at} className="frac" role="img" aria-label={`${m[1]}/${m[2]}`}>
        <span>{m[1]}</span>
        <span>{m[2]}</span>
      </span>
    );
    last = at + m[0].length;
  }
  if (!parts.length) return <>{text}</>;
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
