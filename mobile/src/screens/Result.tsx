import { Fragment, useCallback, useState } from "react";
import { useT } from "../i18n";
import { openPdf, shareFile } from "../platform";
import { buildStandaloneGameHtml } from "../gameExport";
import { Icon, type IconName } from "../ui";
import type { GameResult, GenerateResult, MaterialFormat } from "../types";
import { PdfPages } from "../pdfView";
import { savedNickname, sendChallenge as sendChallengeLink } from "../challenge";
import type { SessionRef } from "../App";
import { RatingCard } from "./RatingCard";
import { POINTS } from "../punches";

function slug(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 50) || "paperpunch";
}

/** Vollbild-Vorschau: das echte PDF mit allen Seiten, unten Drucken und Lösen. */
function SheetViewer({ base64, onClose, onPrint, onSolve }: { base64: string; onClose: () => void; onPrint: () => void; onSolve: () => void }) {
  const { t } = useT();
  const [pages, setPages] = useState(0);
  const onPages = useCallback((n: number) => setPages(n), []);
  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={t.preview}>
      <div className="viewer-top">
        <button type="button" className="home-b-profile" onClick={onClose} aria-label={t.close}>
          <Icon name="close" size={20} stroke={2.4} />
        </button>
        <span className="viewer-title">
          <b>{t.preview}</b>
          {pages > 0 && <span>{t.pagesCount(pages)}</span>}
        </span>
        <span style={{ width: 44 }} />
      </div>
      <div className="viewer-scroll">
        <PdfPages base64={base64} onPages={onPages} errorText={t.previewError} />
      </div>
      <div className="viewer-actions">
        <button type="button" className="btn ghost" onClick={onPrint}><Icon name="print" size={20} stroke={2} /> {t.print}</button>
        <button type="button" className="btn primary" onClick={onSolve}><Icon name="play" size={20} filled /> {t.solve}</button>
      </div>
    </div>
  );
}

/** Konfetti hinter dem Haken: feste Positionen, damit nichts über dem Text liegt. */
const CONFETTI: [number, number, number, string, number][] = [
  [6, 8, 12, "var(--teal)", 12], [88, 4, 10, "var(--pink)", -20], [82, 42, 14, "var(--green)", 30], [12, 52, 9, "var(--pink)", 45],
  [72, 16, 8, "var(--teal)", -10], [24, 26, 7, "var(--green)", 20], [92, 70, 8, "var(--teal)", 15], [3, 80, 10, "var(--green)", -25],
];

/** Ergebnis (Design E3 "Erfolgsmoment"): Haken, Titel, darunter "Wie willst du üben?" mit großen Optionen. */
export function Result({
  result,
  from,
  say,
  onPlay,
  onPractice,
  onDone,
  onHome,
  onNew,
  rated = true,
  onRate,
  challengePct,
}: {
  result: GenerateResult;
  from?: SessionRef;
  say: (msg: string) => void;
  onPlay: (game: GameResult["game"]) => void;
  onPractice: () => void;
  onDone: () => void;
  onNew: () => void;
  onHome: () => void;
  rated?: boolean;
  onRate?: (stars: number, text: string) => void;
  /** Werden auf dem Ergebnis-Screen nicht mehr angezeigt; bleiben optional für Aufrufer. */
  sourcesCount?: number;
  /** Anteil richtiger Antworten (0–100) nach einem fertig gespielten Lernspiel – Ziel für die Challenge. */
  challengePct?: number;
  /** Früher "Neu mischen" – bewusst entfernt (spart KI-Aufrufe); bleibt optional für Aufrufer. */
  onRegenerate?: (format: MaterialFormat) => void;
  onShareSources?: () => void;
}) {
  const { t, lang } = useT();
  const [showScript, setShowScript] = useState(false);
  const [preview, setPreview] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [nickname, setNickname] = useState(savedNickname);
  const [challengeBusy, setChallengeBusy] = useState(false);

  const isSheet = result.format === "worksheet" || result.format === "test";
  const title = result.format === "game" ? result.game.gameTitle : result.format === "podcast" ? result.title : result.data.title;
  const subject = result.format === "game" ? result.game.subject : "";
  const questionTotal = result.format === "game" ? result.game.levels.reduce((s, l) => s + l.questions.length, 0) : 0;
  const count = isSheet ? t.tasksCount(result.data.tasks.length) : result.format === "game" ? t.questionsCount(questionTotal) : "";
  // Ungefähre Arbeitszeit und maximal erreichbare Punches (wie in Practice/Game vergeben)
  const minutes = isSheet
    ? Math.max(5, Math.round((result.data.tasks.length * 1.5) / 5) * 5)
    : result.format === "game"
      ? Math.max(3, Math.round(questionTotal / 3))
      : 0;
  const maxPunches = isSheet
    ? result.data.tasks.length * POINTS.sheetAnswer
    : result.format === "game"
      ? result.game.levels.reduce((s, l) => s + l.questions.length * (POINTS.answer[l.difficulty] ?? 10), 0)
      : 0;
  const meta = [count, minutes ? t.approxMinutes(minutes) : "", subject].filter(Boolean).join(" · ");

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

  async function sendChallenge() {
    if (result.format !== "game" || challengeBusy) return;
    setChallengeBusy(true);
    try {
      const outcome = await sendChallengeLink(result.game, nickname, challengePct, lang, t);
      if (outcome === "copied") say(t.inviteCopied);
      if (outcome !== "cancelled") setChallengeOpen(false);
    } catch {
      say(t.errGeneric);
    } finally {
      setChallengeBusy(false);
    }
  }

  type Opt = { icon: IconName; title: string; sub: string; onClick: () => void; main?: boolean };
  const options: Opt[] = [];
  if (isSheet) options.push({ icon: "play", title: t.optSolve, sub: t.optSolveSub, onClick: onPractice, main: true });
  if (result.format === "game") options.push({ icon: "play", title: t.optPlay, sub: t.optSolveSub, onClick: () => onPlay(result.game), main: true });
  if (isSheet) options.push({ icon: "print", title: t.optPrint, sub: t.optPrintSub, onClick: () => void view() });
  if (result.format === "game") {
    options.push({
      icon: "punch",
      title: t.challengeOpt,
      sub: challengePct !== undefined ? t.challengeOptSub(challengePct) : t.challengeOptSubNew,
      onClick: () => setChallengeOpen((v) => !v),
    });
  }
  if (result.format !== "podcast") {
    options.push({ icon: "share", title: t.share, sub: result.format === "game" ? t.optShareGameSub : t.optShareSub, onClick: () => void share() });
  }

  return (
    <div className="screen result-e">
      <div className="result-e-top">
        <button type="button" className="home-b-profile" onClick={from ? onNew : onHome} aria-label={from ? t.backToPlan : t.back}>
          <Icon name="back" size={20} stroke={2.4} />
        </button>
        <button type="button" className="home-b-profile" onClick={onHome} aria-label={t.home}>
          <Icon name="home" size={20} stroke={2} />
        </button>
      </div>

      <div className="result-e-hero">
        <div className="result-e-confetti" aria-hidden="true">
          {CONFETTI.map(([x, y, size, color, rot], i) => (
            <i key={i} style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color, transform: `rotate(${rot}deg)` }} />
          ))}
        </div>
        <div className="result-e-head">
          <span className="result-e-check"><Icon name="check" size={36} stroke={2.6} /></span>
          <span className="result-e-ready">{t.resultReady(result.format)}</span>
          <h1 className="result-e-title">{title}</h1>
          {meta && <span className="result-e-meta">{meta}</span>}
          {(maxPunches > 0 || isSheet) && (
            <span className="result-e-chips">
              {maxPunches > 0 && <span className="result-e-punches">{t.upToPunches(maxPunches)}</span>}
              {isSheet && (
                <button type="button" className="result-e-preview" onClick={() => setPreview(true)}>
                  <Icon name="eye" size={16} stroke={2.2} /> {t.preview}
                </button>
              )}
            </span>
          )}
        </div>
      </div>

      {result.format === "podcast" && (
        <div className="card" style={{ marginBottom: 14 }}>
          <audio controls src={`data:audio/mpeg;base64,${result.audioBase64}`} style={{ width: "100%" }}>
            {t.listen}
          </audio>
          <button type="button" className="btn ghost small" onClick={() => setShowScript((v) => !v)} aria-expanded={showScript}>
            {t.transcript}
          </button>
          {showScript && <p style={{ whiteSpace: "pre-line", fontSize: 15 }}>{result.script}</p>}
          <button type="button" className="btn ghost small" onClick={() => void share()}>
            <Icon name="share" size={18} /> {t.share}
          </button>
        </div>
      )}

      {options.length > 0 && (
        <div className="result-e-options">
          <span className="result-e-label">{t.howPractice}</span>
          {options.map((o) => (
            <Fragment key={o.title}>
            <button type="button" className={o.main ? "result-e-opt main" : "result-e-opt"} onClick={o.onClick}>
              <span className="result-e-opt-icon"><Icon name={o.icon} size={22} stroke={2} filled={o.icon === "play"} /></span>
              <span className="result-e-opt-text">
                <span className="result-e-opt-title">{o.title}</span>
                <span className="result-e-opt-sub">{o.sub}</span>
              </span>
              <Icon name="chevron" size={18} stroke={2.6} />
            </button>
          {o.icon === "punch" && challengeOpen && result.format === "game" && (
            <div className="result-e-challenge">
              <span className="result-e-label">{t.nickname}</span>
              <input className="input set" value={nickname} maxLength={20} placeholder={t.nicknamePh} onChange={(e) => setNickname(e.target.value)} />
              <button type="button" className="btn primary block" disabled={challengeBusy} onClick={() => void sendChallenge()}>
                <Icon name="share" size={20} /> {challengeBusy ? t.challengeBusy : t.challengeSend}
              </button>
              <span className="result-e-opt-sub">{t.challengeHint}</span>
            </div>
          )}
            </Fragment>
          ))}
        </div>
      )}

      {from && (
        <button type="button" className="btn ghost block" style={{ marginTop: 12 }} onClick={onDone}>
          <Icon name="check" /> {t.markDone}
        </button>
      )}

      {!rated && onRate && <RatingCard onSend={onRate} />}

      <p className="result-e-foot">{t.aiShort}</p>

      {preview && isSheet && (
        <SheetViewer
          base64={result.pdfBase64}
          onClose={() => setPreview(false)}
          onPrint={() => void view()}
          onSolve={() => { setPreview(false); onPractice(); }}
        />
      )}
    </div>
  );
}
