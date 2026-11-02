import { useEffect, useState } from "react";
import { useT } from "../i18n";
import { Icon, Logo } from "../ui";
import type { MaterialFormat } from "../types";

/** Ladebildschirm mit Scan-Animation. Die Schritte laufen nach Zeit, die API meldet keinen Fortschritt. */
export function Working({ format, fileCount }: { format: MaterialFormat | "plan" | "adjust"; fileCount: number }) {
  const { t } = useT();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [1, 2].map((n) => window.setTimeout(() => setStep(n), n * (format === "plan" || format === "adjust" ? 6000 : 15000)));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [format]);

  const title = format === "plan" ? t.planCreating : format === "adjust" ? t.adjusting : t.working(t.formats[format]);
  const steps = [t.stepRead(fileCount), t.stepThink, t.stepBuild];

  return (
    <div className="screen" style={{ alignItems: "center" }}>
      <div className="topbar" style={{ justifyContent: "center" }}>
        <Logo />
      </div>
      <div className="scanbox" aria-hidden="true">
        <div className="paper" style={{ width: "100%", height: "100%" }}>
          <i /><i /><i style={{ width: "90%" }} /><i /><i style={{ width: "70%" }} />
        </div>
        <div className="scanline" />
      </div>
      <h1 style={{ textAlign: "center", fontSize: 26, margin: "26px 0" }} aria-live="polite">{title}</h1>
      <div className="steps" style={{ width: "100%" }}>
        {steps.map((label, i) => (
          <div key={label} className={i > step ? "step todo" : "step"}>
            <span className={i < step ? "dot done" : i === step ? "dot active" : "dot"}>{i < step && <Icon name="check" size={20} stroke={3} />}</span>
            {label}
          </div>
        ))}
      </div>
      <p className="muted" style={{ marginTop: "auto", padding: "24px 0", textAlign: "center" }}>{t.workingNote}</p>
    </div>
  );
}
