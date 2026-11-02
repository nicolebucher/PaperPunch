import { useState } from "react";
import { useT } from "../i18n";
import { openPdf, shareFile } from "../platform";
import { buildStandaloneGameHtml } from "../gameExport";
import { Icon, TopBar } from "../ui";
import type { GameResult, GenerateResult } from "../types";
import type { SessionRef } from "../App";

function slug(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 50) || "paperpunch";
}

/** Ergebnis: ansehen bzw. spielen/anhören – und alles lässt sich teilen. */
export function Result({
  result,
  from,
  say,
  onPlay,
  onDone,
  onNew,
  onHome,
}: {
  result: GenerateResult;
  from?: SessionRef;
  say: (msg: string) => void;
  onPlay: (game: GameResult["game"]) => void;
  onDone: () => void;
  onNew: () => void;
  onHome: () => void;
}) {
  const { t, lang } = useT();
  const [showScript, setShowScript] = useState(false);

  const isSheet = result.format === "worksheet" || result.format === "test";
  const title = result.format === "game" ? result.game.gameTitle : result.format === "podcast" ? result.title : result.data.title;
  const subtitle =
    result.format === "game"
      ? result.game.levels.map((l) => l.title).join(" · ")
      : result.format === "podcast"
        ? t.formats.podcast
        : t.tasks(result.data.tasks.length);

  async function share() {
    try {
      const outcome =
        result.format === "game"
          ? await shareFile({
              filename: `${slug(result.game.gameTitle)}.html`,
              mime: "text/html",
              title: result.game.gameTitle,
              text: buildStandaloneGameHtml(result.game, lang),
            })
          : result.format === "podcast"
            ? await shareFile({ filename: result.filename, mime: "audio/mpeg", title: result.title, base64: result.audioBase64 })
            : await shareFile({ filename: result.filename, mime: "application/pdf", title: result.data.title, base64: result.pdfBase64 });
      if (outcome === "shared") say(t.shared);
      if (outcome === "downloaded") say(t.downloaded);
    } catch {
      say(t.errGeneric);
    }
  }

  async function view() {
    if (!isSheet) return;
    try {
      await openPdf(result.pdfBase64, result.filename, result.data.title);
    } catch {
      say(t.errGeneric);
    }
  }

  return (
    <div className="screen">
      <TopBar
        right={
          from ? (
            <button type="button" className="btn ghost small" onClick={onNew}>
              <Icon name="back" size={18} /> {t.backToPlan}
            </button>
          ) : (
            <button type="button" className="iconbtn" onClick={onHome} aria-label={t.home}>
              <Icon name="home" size={20} />
            </button>
          )
        }
      />
      <div className="stack" style={{ alignItems: "center", textAlign: "center", padding: "4px 0 18px" }}>
        <h1 className="display">{t.done}</h1>
        <span className="muted" style={{ fontWeight: 700 }}>{t.formats[result.format]} · {subtitle}</span>
      </div>

      <div className="card" style={{ background: "#fff", color: "var(--sheet-fg)", boxShadow: "0 12px 40px rgba(31,214,234,0.25)" }}>
        <h2 style={{ fontSize: 19 }}>{title}</h2>
        {isSheet && (
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
            {t.questionsCount(result.game.levels.reduce((s, l) => s + l.questions.length, 0))} · {result.game.subject}
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
        <div className="grid2">
          {result.format === "game" && (
            <button type="button" className="btn primary" onClick={() => onPlay(result.game)}>
              <Icon name="play" /> {t.playGame}
            </button>
          )}
          {isSheet && (
            <button type="button" className="btn primary" onClick={() => void view()}>
              <Icon name="eye" /> {t.view}
            </button>
          )}
          <button type="button" className={result.format === "podcast" ? "btn primary" : "btn ghost"} style={result.format === "podcast" ? { gridColumn: "1 / -1" } : undefined} onClick={() => void share()}>
            <Icon name="share" /> {t.share}
          </button>
        </div>
        {result.format === "game" && <p className="muted" style={{ fontSize: 13, textAlign: "center" }}>{t.shareHint}</p>}
        {from ? (
          <button type="button" className="btn ghost block" onClick={onDone}>
            <Icon name="check" /> {t.markDone}
          </button>
        ) : (
          <button type="button" className="btn ghost block" onClick={onDone}>
            <Icon name="plus" /> {t.newMaterial}
          </button>
        )}
      </div>
    </div>
  );
}
