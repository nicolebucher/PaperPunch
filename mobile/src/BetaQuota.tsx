import { useEffect, useState } from "react";
import { useT } from "./i18n";
import { fetchQuota, type Quota } from "./api";

// Beta-Kontingent: einmaliger Hinweis beim ersten Erstellen, Zähler mit Balken, Hinweis bei leerer Woche.
// Gezählt wird auf dem Server (/api/quota) – offline oder ohne Antwort wird nichts angezeigt oder gesperrt.

const INTRO_KEY = "paperpunch-beta-intro";
const DEFAULT_LIMIT = 10;

export function useQuota(): Quota | null {
  const [quota, setQuota] = useState<Quota | null>(null);
  useEffect(() => {
    let alive = true;
    void fetchQuota().then((q) => alive && q && setQuota(q));
    return () => {
      alive = false;
    };
  }, []);
  return quota;
}

function Bars({ total, filled }: { total: number; filled: number }) {
  return (
    <div className="beta-dots" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => <span key={i} className={i < filled ? "on" : ""} />)}
    </div>
  );
}

/** Einmaliger Beta-Hinweis als Bottom-Sheet; danach nie wieder. */
export function BetaIntro({ limit }: { limit?: number }) {
  const { t } = useT();
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem(INTRO_KEY);
    } catch {
      return false;
    }
  });
  if (!open) return null;
  const n = limit ?? DEFAULT_LIMIT;
  const [a, b, c] = t.betaText(n);
  const close = () => {
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      // egal
    }
    setOpen(false);
  };
  return (
    <>
      <div className="backdrop beta-backdrop" />
      <div className="sheet home-b-sheet beta-sheet" role="dialog" aria-modal="true" aria-label={t.betaTitle}>
        <div className="grabber" />
        <div className="beta-top"><span className="beta-badge">BETA</span></div>
        <h2>{t.betaTitle}</h2>
        <p className="beta-text">{a}<b>{b}</b>{c}</p>
        <div className="stack" style={{ gap: 6 }}>
          <Bars total={n} filled={n} />
          <div className="beta-dots-label"><span>{t.betaPerWeek(n)}</span><span>↻ {t.betaMonday}</span></div>
        </div>
        <button type="button" className="btn primary block" onClick={close}>{t.betaOk}</button>
      </div>
    </>
  );
}

/** "Beta · noch 7 von 10 diese Woche" mit Balken – nur, wenn der Server zählt. */
export function QuotaLine({ quota }: { quota: Quota | null }) {
  const { t } = useT();
  if (!quota?.enforced) return null;
  return (
    <div className="quota-line">
      <span>{t.quotaLine(quota.remaining, quota.limit)}</span>
      <Bars total={quota.limit} filled={quota.remaining} />
    </div>
  );
}

/** Ersetzt den Erstellen-Button, wenn die Woche aufgebraucht ist. */
export function QuotaEmpty({ limit }: { limit: number }) {
  const { t } = useT();
  return (
    <div className="quota-empty">
      <p>{t.quotaEmpty(limit)}</p>
      <a href="mailto:hello@paper-punch.com">{t.quotaFeedback} →</a>
    </div>
  );
}
