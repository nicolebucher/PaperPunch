import type { CSSProperties } from "react";

// Bildmarke aus dem Logo (public/brand/logo-white.svg): aufgeschlagenes Buch, aus dem Pixel "herausgestanzt" werden.
// Die Pixel lassen sich einzeln animieren – das ist das wiederkehrende Motiv von Start- und Ladebildschirm.

const CYAN = "#1FD6EA";
const PINK = "#F23A8E";
const GREEN = "#A8E43A";

// Positionen wie im Logo, Reihenfolge = Reihenfolge, in der sie im Ladebildschirm erscheinen (vom Buch weg).
export const PIXELS: { x: number; y: number; c: string }[] = [
  { x: 114, y: 44, c: CYAN },
  { x: 118, y: 72, c: CYAN },
  { x: 124, y: 28, c: PINK },
  { x: 132, y: 86, c: GREEN },
  { x: 134, y: 56, c: PINK },
  { x: 150, y: 46, c: GREEN },
  { x: 150, y: 74, c: PINK },
  { x: 150, y: 92, c: CYAN },
  { x: 148, y: 14, c: GREEN },
  { x: 160, y: 30, c: PINK },
  { x: 170, y: 56, c: CYAN },
  { x: 172, y: 82, c: PINK },
];

export const PIXEL_COLORS = [CYAN, PINK, GREEN];

type Mode = "still" | "punch" | "float" | "intro";

/**
 * still: wie das Logo. punch: Pixel springen nacheinander aus dem Buch (Ladebildschirm, in Schleife).
 * float: Pixel schweben leicht (Startseite).
 * intro: einmalig – das Buch zeichnet sich, dann fliegen die Pixel nacheinander von weit her ein (Willkommen).
 */
export function BrandMark({ mode = "still", stroke = "#FFFFFF", className, style }: { mode?: Mode; stroke?: string; className?: string; style?: CSSProperties }) {
  return (
    <svg className={`mark mark-${mode} ${className ?? ""}`} style={style} viewBox="14 6 180 112" role="img" aria-label="PaperPunch">
      <g className="mark-book" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M92 30C78 20 58 17 40 19V88C58 86 78 89 92 98Z" />
        <path d="M32 26V94C52 92 74 94 92 104" />
        <path d="M24 33V100C48 98 72 100 92 110" />
        <path d="M92 30C100 24 108 21 114 20" />
        <path d="M92 98C98 94 104 92 110 91" />
        <path d="M92 30V98" />
        <path className="mark-line" d="M52 38C64 37 74 39 82 43" />
        <path className="mark-line" d="M52 52C64 51 74 53 82 57" />
        <path className="mark-line" d="M52 66C62 65 70 67 78 70" />
      </g>
      {PIXELS.map((p, i) => (
        <rect
          key={i}
          className="mark-px"
          x={p.x}
          y={p.y}
          width="13"
          height="13"
          fill={p.c}
          style={{
            "--i": i,
            "--dx": `${(p.x - 92) * 0.35}px`,
            "--dy": `${(p.y - 60) * 0.35}px`,
            "--fx": `${Math.cos(i * 2.4) * 160}px`,
            "--fy": `${Math.sin(i * 2.4) * 140 - 40}px`,
            "--fr": `${(i % 2 ? 1 : -1) * (120 + i * 25)}deg`,
            transformOrigin: `${p.x + 6.5}px ${p.y + 6.5}px`,
          } as CSSProperties}
        />
      ))}
    </svg>
  );
}

/** Reihe aus Pixel-Quadraten, z. B. ein Quadrat pro Tag bis zum Test. */
export function PixelStrip({ cells, label }: { cells: { state: "done" | "today" | "open" | "missed" | "test"; color?: string }[]; label: string }) {
  return (
    <div className="pixelstrip" role="img" aria-label={label}>
      {cells.map((c, i) => (
        <span key={i} className={`px px-${c.state}`} style={c.color ? ({ "--c": c.color } as CSSProperties) : undefined} />
      ))}
    </div>
  );
}
