import { useState } from "react";
import { useT } from "../i18n";
import { sharePdf } from "../platform";
import { Icon, TopBar } from "../ui";
import type { GameResult, GenerateResult } from "../types";
import type { SessionRef } from "../App";

export function Result({
  result,
  from,
  say,
  onPlay,
  onDone,
  onNew,
}: {
  result: GenerateResult;
  from?: SessionRef;
  say: (msg: string) => void;
  onPlay: (game: GameResult["game"]) => void;
  onDone: () => void;
  onNew: () => void;
}) {
  const { t } = useT();
  const [showScript, setShowScript] = useState(false);

  const title =
    result.format === "game" ? result.game.gameTitle : result.format === "podcast" ? result.title : result.data.title;
  const subtitle =
    result.format === "game"
      ? result.game.levels.map((l) => l.title).join(" · ")
      : result.format === "podcast"
        ? t.formats.podcast
        : t.tasks(result.data.tasks.length);

  async function openPdf() {
    if (result.format !== "worksheet" && result.format !== "test") return;
    try {
      await sharePdf(result.pdfBase64, result.filename, result.data.title);
    } catch {
      say(t.errGeneric);
    }
  }

  return (
    <div className="screen">
      <TopBar
        right={
          <button type="button" className="btn ghost small" onClick={onNew}>
            <Icon name={from ? "back" : "camera"} size={18} /> {from ? t.backToPlan : t.newPhoto}
          </button>
        }
      />
      <div className="stack" style={{ alignItems: "center", textAlign: "center", padding: "4px 0 18px" }}>
        <h1>{t.done}</h1>
        <span className="muted" style={{ fontWeight: 700 }}>{t.formats[result.format]} · {subtitle}</span>
      </div>

      <div className="card" style={{ background: "#fff", color: "var(--sheet-fg)", boxShadow: "0 12px 40px rgba(45,212,191,0.25)" }}>
        <h2 style={{ fontSize: 19 }}>{title}</h2>
        {(result.format === "worksheet" || result.format === "test") && (
          <>
            <p style={{ color: "var(--sheet-muted)" }}>{result.data.introduction}</p>
            <ol style={{ margin: 0, paddingLeft: 20, color: "#374151", fontSize: 14, lineHeight: 1.4 }}>
              {result.data.tasks.slice(0, 3).map((task) => (
                <li key={task.number}>{task.question}</li>
              ))}
            </ol>
          </>
        )}
        {result.format === "game" && (
          <p style={{ color: "var(--sheet-muted)" }}>
            {result.game.levels.reduce((s, l) => s + l.questions.length, 0)} · {result.game.subject}
          </p>
        )}
        {result.format === "podcast" && (
          <>
            <audio controls src={`data:audio/mpeg;base64,${result.audioBase64}`} style={{ width: "100%" }}>
              {t.listen}
            </audio>
            <button type="button" className="btn ghost small" onClick={() => setShowScript((v) => !v)} aria-expanded={showScript}>
              {t.transcript}
            </button>
            {showScript && <p style={{ whiteSpace: "pre-line", textAlign: "left", fontSize: 15 }}>{result.script}</p>}
          </>
        )}
      </div>

      <div className="stack" style={{ marginTop: "auto", padding: "20px 0 28px" }}>
        {result.format === "game" && (
          <button type="button" className="btn primary block" onClick={() => onPlay(result.game)}>
            <Icon name="play" /> {t.playGame}
          </button>
        )}
        {(result.format === "worksheet" || result.format === "test") && (
          <button type="button" className="btn primary block" onClick={() => void openPdf()}>
            <Icon name="share" /> {t.openPdf}
          </button>
        )}
        {from && result.format !== "game" && (
          <button type="button" className="btn ghost block" onClick={onDone}>
            <Icon name="check" /> {t.markDone}
          </button>
        )}
        {!from && (
          <button type="button" className="btn ghost block" onClick={onDone}>
            {t.home}
          </button>
        )}
      </div>
    </div>
  );
}
