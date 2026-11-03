import { useEffect, useState } from "react";
import { useT } from "../i18n";
import { Logo } from "../ui";
import { BrandMark, PIXEL_COLORS } from "../brand";
import type { MaterialFormat } from "../types";

// Erwartete Dauer je Vorgang (Sekunden). Die API meldet keinen Fortschritt, die Anzeige läuft nach Zeit
// und bleibt kurz vor dem Ende stehen, bis die Antwort da ist.
const EXPECTED: Record<string, number> = { plan: 35, adjust: 25, podcast: 110, game: 90, worksheet: 60, test: 50 };
const CELLS = 12;

/** Ladebildschirm: Pixel werden aus dem Buch "gestanzt", darunter füllt sich eine Pixel-Leiste, dazu Lerntipps. */
export function Working({ format, fileCount }: { format: MaterialFormat | "plan" | "adjust"; fileCount: number }) {
  const { t } = useT();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const expected = EXPECTED[format] ?? 60;
  // schnell am Anfang, langsamer gegen Ende, nie ganz voll
  const progress = Math.min(0.94, 1 - Math.exp((-2.2 * seconds) / expected));
  const filled = Math.floor(progress * CELLS);
  const step = progress < 0.25 ? 0 : progress < 0.7 ? 1 : 2;
  const steps = [t.stepRead(fileCount), t.stepThink, t.stepBuild];
  const tip = t.loadingTips[Math.floor(seconds / 7) % t.loadingTips.length];

  const title = format === "plan" ? t.planCreating : format === "adjust" ? t.adjusting : t.working(t.formats[format]);

  return (
    <div className="screen working">
      <div className="topbar" style={{ justifyContent: "center" }}>
        <Logo size={22} />
      </div>

      <div className="working-body">
      <div className="working-stage" aria-hidden="true">
        <span className="glow" />
        <BrandMark mode="punch" className="working-mark" />
      </div>

      <div className="stack" style={{ alignItems: "center", textAlign: "center", gap: 10 }}>
        <h1 className="working-title" aria-live="polite">{title}</h1>
        <span className="step-now" key={step}>{steps[step]} …</span>
      </div>

      <div className="pixelbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={title}>
        {Array.from({ length: CELLS }, (_, i) => (
          <span key={i} className={i < filled ? "on" : i === filled ? "next" : ""} style={{ background: i < filled ? PIXEL_COLORS[i % 3] : undefined }} />
        ))}
      </div>
      </div>

      <div className="tip" key={tip}>
        <span className="eyebrow">{t.tipLabel}</span>
        <p>{seconds > expected * 1.4 ? t.loadingSlow : tip}</p>
      </div>
    </div>
  );
}
