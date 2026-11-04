import { useState } from "react";
import { useT } from "./i18n";
import { reportProblem, type ReportPayload } from "./api";
import { Icon } from "./ui";

// "Fehler melden" unter jeder beantworteten Frage (Lernspiel, Üben, Lernplan-Test).
// Gegenstück auf der Website: components/ReportProblem.tsx. Meldungen landen im Feedback-Sheet (kind = "report").

type Reason = ReportPayload["reason"];
const REASONS: Reason[] = ["unclear", "wrong-solution", "my-answer-right", "other"];

export function ReportProblem({ context }: { context: Omit<ReportPayload, "reason" | "note" | "lang"> }) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  if (state === "done") return <p className="report-thanks">{t.reportThanks}</p>;
  if (!open) {
    return (
      <button type="button" className="report-link" onClick={() => setOpen(true)}>
        <Icon name="flag" size={14} stroke={2.2} /> {t.reportOpen}
      </button>
    );
  }

  async function send() {
    if (!reason) return;
    setState("busy");
    const ok = await reportProblem({ ...context, reason, note: note.trim() || undefined, lang });
    setState(ok ? "done" : "error");
  }

  return (
    <div className="report-box">
      <b>{t.reportTitle}</b>
      <div className="row" style={{ gap: 8 }}>
        {REASONS.map((r) => (
          <button key={r} type="button" className={reason === r ? "pill on" : "pill"} aria-pressed={reason === r} onClick={() => setReason(r)}>{t.reportReasons[r]}</button>
        ))}
      </div>
      <textarea className="input" rows={2} maxLength={1000} value={note} placeholder={t.reportNotePh} onChange={(e) => setNote(e.target.value)} />
      {state === "error" && <p className="check-failed">{t.reportError}</p>}
      <div className="grid2">
        <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>{t.cancel}</button>
        <button type="button" className="btn primary small" disabled={!reason || state === "busy"} onClick={() => void send()}>{t.reportSend}</button>
      </div>
    </div>
  );
}
