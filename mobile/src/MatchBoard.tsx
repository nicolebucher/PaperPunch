import { useState, type CSSProperties } from "react";
import { MathText } from "./math";
import { useT } from "./i18n";

// Zuordnen im Spiel: links antippen, dann rechts (oder umgekehrt) – wie beim Online-Lösen von Arbeitsblättern
// (screens/Practice.tsx). Die rechte Spalte wird fest je Frage gemischt, höchstens ein Drittel neben seinem Partner.

export interface Pair {
  left: string;
  right: string;
}

const MATCH_COLORS = ["#1FD6EA", "#F23A8E", "#A8E43A", "#F59E0B", "#8B5CF6", "#14B8A6", "#EF4444", "#3B82F6"];

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function matchRights(pairs: Pair[], seedText: string): string[] {
  const rights = pairs.map((p) => p.right);
  if (rights.length < 2) return rights;
  let seed = 2166136261;
  for (const ch of seedText) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const fixed = (a: string[]) => a.filter((v, i) => v === rights[i]).length;
  let out = [...rights];
  for (let tries = 0; tries < 12 && (tries === 0 || fixed(out) > Math.floor(rights.length / 3)); tries++) {
    out = [...rights];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
  }
  if (fixed(out) > Math.floor(rights.length / 3)) out = [...rights.slice(1), rights[0]];
  return out;
}

/** Wie viele Paare richtig verbunden sind (link: linke Zeile → Index in der gemischten rechten Spalte). */
export function countCorrect(pairs: Pair[], rights: string[], link: Record<number, number>): number {
  return pairs.filter((p, i) => link[i] !== undefined && norm(rights[link[i]] ?? "") === norm(p.right)).length;
}

export function MatchBoard({
  pairs,
  rights,
  link,
  onLink,
  solved,
}: {
  pairs: Pair[];
  rights: string[];
  link: Record<number, number>;
  onLink: (next: Record<number, number>) => void;
  /** Aufgelöst: richtige Paare grün, falsche durchgestrichen mit der Lösung */
  solved: boolean;
}) {
  const { t } = useT();
  const [selLeft, setSelLeft] = useState<number | null>(null);
  const [selRight, setSelRight] = useState<number | null>(null);

  if (solved) {
    return (
      <div className="stack" style={{ gap: 8 }}>
        {pairs.map((p, i) => {
          const given = link[i] !== undefined ? rights[link[i]] : undefined;
          const okRow = norm(given ?? "") === norm(p.right);
          return (
            <div key={i} className={okRow ? "pair match ok" : "pair match no"}>
              <span><MathText text={p.left} /></span>
              <span className="muted">→</span>
              <span>{okRow ? <MathText text={p.right} /> : <><s className="muted">{given ?? "–"}</s> <MathText text={p.right} /></>}</span>
            </div>
          );
        })}
      </div>
    );
  }

  function connect(l: number, r: number) {
    const next: Record<number, number> = {};
    for (const [k, v] of Object.entries(link)) if (v !== r && Number(k) !== l) next[Number(k)] = v;
    next[l] = r;
    onLink(next);
    setSelLeft(null);
    setSelRight(null);
  }
  function tapLeft(l: number) {
    if (selRight !== null) return connect(l, selRight);
    if (link[l] !== undefined) {
      const n = { ...link };
      delete n[l];
      onLink(n);
      setSelLeft(l);
      return;
    }
    setSelLeft((s) => (s === l ? null : l));
  }
  function tapRight(r: number) {
    if (selLeft !== null) return connect(selLeft, r);
    const owner = Object.entries(link).find(([, v]) => v === r);
    if (owner) {
      const n = { ...link };
      delete n[Number(owner[0])];
      onLink(n);
      setSelRight(r);
      return;
    }
    setSelRight((s) => (s === r ? null : r));
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <p className="muted match-hint">{t.matchTapHint}</p>
      <div className="match-board">
        <div className="match-col">
          {pairs.map((p, i) => {
            const color = link[i] !== undefined ? MATCH_COLORS[i % MATCH_COLORS.length] : undefined;
            return (
              <button key={i} type="button" className={`match-item${selLeft === i ? " sel" : ""}${color ? " linked" : ""}`} style={color ? ({ "--mc": color } as CSSProperties) : undefined} aria-pressed={selLeft === i} onClick={() => tapLeft(i)}>
                <MathText text={p.left} />
              </button>
            );
          })}
        </div>
        <div className="match-col">
          {rights.map((rv, ri) => {
            const owner = Object.entries(link).find(([, v]) => v === ri);
            const color = owner ? MATCH_COLORS[Number(owner[0]) % MATCH_COLORS.length] : undefined;
            return (
              <button key={ri} type="button" className={`match-item right${selRight === ri ? " sel" : ""}${color ? " linked" : ""}`} style={color ? ({ "--mc": color } as CSSProperties) : undefined} aria-pressed={selRight === ri} onClick={() => tapRight(ri)}>
                <MathText text={rv} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
