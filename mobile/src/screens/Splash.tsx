import { useEffect, useState } from "react";
import { BrandMark } from "../brand";

const DURATION_MS = 4200; // so lang wie die Logo-Animation beim ersten Start (Wortmarke erscheint nach ~3,8 s)

/**
 * Startbildschirm bei jedem App-Start: dieselbe Logo-Animation wie beim ersten Onboarding.
 * Läuft automatisch weiter, ein Tipp überspringt sie. Bei "weniger Bewegung" nur kurz.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setLeaving(true), reduced ? 700 : DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(onDone, 320);
    return () => window.clearTimeout(timer);
  }, [leaving, onDone]);

  return (
    <button type="button" className={leaving ? "splash leaving" : "splash"} onClick={() => setLeaving(true)} aria-label="PaperPunch">
      <span className="ob-intro-stage">
        <BrandMark mode="intro" className="ob-intro-mark" />
        <span className="ob-intro-word" aria-hidden="true">
          <span className="logo-paper">Paper</span><span className="logo-punch">Punch</span>
        </span>
      </span>
    </button>
  );
}
