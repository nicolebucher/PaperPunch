import { MathText } from "./math";
import { useT } from "./i18n";

// Satz bauen und Reihenfolge im Spiel: Kärtchen unten antippen → sie wandern nach oben (Satzzeile bzw.
// nummerierte Liste); oben antippen schickt sie zurück. Kärtchen und Prüfung aus answerMatch.ts (wie auf der Website).

export function TileBoard({
  mode,
  tiles,
  picked,
  onPick,
  solved,
  ok,
}: {
  mode: "sentence" | "order";
  tiles: string[];
  /** Indizes der Kärtchen in der gebauten Reihenfolge */
  picked: number[];
  onPick: (next: number[]) => void;
  solved: boolean;
  ok: boolean;
}) {
  const { t } = useT();
  const sentence = mode === "sentence";
  return (
    <div className="stack" style={{ gap: 10 }}>
      {!solved && <p className="muted match-hint">{sentence ? t.sentenceHint : t.orderHint}</p>}
      <div className={`${sentence ? "sentence-line" : "order-list"}${solved ? (ok ? " ok" : " no") : ""}`} aria-live="polite">
        {picked.length === 0 && <span className="muted sentence-empty">{sentence ? t.sentenceEmpty : t.orderEmpty}</span>}
        {picked.map((ti, pos) => (
          <button key={`${ti}-${pos}`} type="button" className={sentence ? "word-tile in" : "order-tile in"} disabled={solved} onClick={() => onPick(picked.filter((_, i) => i !== pos))}>
            {!sentence && <span className="order-num">{pos + 1}</span>}
            <MathText text={tiles[ti]} />
          </button>
        ))}
      </div>
      {!solved && (
        <div className={sentence ? "tile-pool" : "order-pool"}>
          {tiles.map((w, ti) =>
            picked.includes(ti) ? (
              sentence ? <span key={ti} className="word-tile ghost" aria-hidden="true">{w}</span> : null
            ) : (
              <button key={ti} type="button" className={sentence ? "word-tile" : "order-tile"} onClick={() => onPick([...picked, ti])}>
                <MathText text={w} />
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
