import { useRef, useState } from "react";
import { useT } from "../i18n";
import { openPdf, shareFile } from "../platform";
import { buildStandaloneGameHtml } from "../gameExport";
import { Icon, type IconName } from "../ui";
import type { GameResult, GenerateResult, MaterialFormat, Task } from "../types";
import type { SessionRef } from "../App";
import { RatingCard } from "./RatingCard";
import { POINTS } from "../punches";

function slug(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 50) || "paperpunch";
}

const TASKS_PER_PAGE = 4;

/** Vollbild-Vorschau des Arbeitsblatts / Tests: Seiten zum Wischen, unten Drucken und Lösen. */
function SheetViewer({ title, intro, tasks, onClose, onPrint, onSolve }: { title: string; intro: string; tasks: Task[]; onClose: () => void; onPrint: () => void; onSolve: () => void }) {
  const { t } = useT();
  const [page, setPage] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const pages: Task[][] = [];
  for (let i = 0; i < tasks.length; i += TASKS_PER_PAGE) pages.push(tasks.slice(i, i + TASKS_PER_PAGE));
  if (pages.length === 0) pages.push([]);

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={t.preview}>
      <div className="viewer-top">
        <button type="button" className="home-b-profile" onClick={onClose} aria-label={t.close}>
          <Icon name="close" size={20} stroke={2.4} />
        </button>
        <span className="viewer-title">
          <b>{t.preview}</b>
          <span>{t.pageOf(page + 1, pages.length)}</span>
        </span>
        <span style={{ width: 44 }} />
      </div>
      <div
        className="viewer-pages"
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          setPage(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {pages.map((list, p) => (
          <div className="viewer-slot" key={p}>
            <div className="viewer-paper">
              <span className="sheet-head">
                <span className="sheet-brand">Paper<b>Punch</b></span>
                <span>{t.sheetNameLine}</span>
              </span>
              {p === 0 && (
                <>
                  <span className="sheet-title">{title}</span>
                  {intro && <span className="sheet-intro">{intro}</span>}
                </>
              )}
              {list.map((task) => (
                <span className="sheet-task" key={task.number}>
                  <b>{t.taskLabel(task.number)} · {task.points} P.</b>
                  <span>{task.question.replace("___", "________")}</span>
                  {task.options ? (
                    <span className="sheet-options">{task.options.map((o) => `○ ${o}`).join("   ")}</span>
                  ) : task.type === "zuordnen" && task.pairs ? (
                    <span className="sheet-options">{task.pairs.map((x) => x.left).join(" · ")}</span>
                  ) : task.type !== "lueckentext" ? (
                    <span className="sheet-line" />
                  ) : null}
                </span>
              ))}
              <span className="sheet-foot">{t.pageOf(p + 1, pages.length)}</span>
            </div>
          </div>
        ))}
      </div>
      {pages.length > 1 && (
        <div className="sheet-dots" aria-hidden="true">
          {pages.map((_, i) => <span key={i} className={i === page ? "on" : ""} />)}
        </div>
      )}
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
  /** Früher "Neu mischen" – bewusst entfernt (spart KI-Aufrufe); bleibt optional für Aufrufer. */
  onRegenerate?: (format: MaterialFormat) => void;
  onShareSources?: () => void;
}) {
  const { t, lang } = useT();
  const [showScript, setShowScript] = useState(false);
  const [preview, setPreview] = useState(false);

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

  type Opt = { icon: IconName; title: string; sub: string; onClick: () => void; main?: boolean };
  const options: Opt[] = [];
  if (isSheet) options.push({ icon: "play", title: t.optSolve, sub: t.optSolveSub, onClick: onPractice, main: true });
  if (result.format === "game") options.push({ icon: "play", title: t.optPlay, sub: t.optSolveSub, onClick: () => onPlay(result.game), main: true });
  if (isSheet) options.push({ icon: "print", title: t.optPrint, sub: t.optPrintSub, onClick: () => void view() });
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
            <button key={o.title} type="button" className={o.main ? "result-e-opt main" : "result-e-opt"} onClick={o.onClick}>
              <span className="result-e-opt-icon"><Icon name={o.icon} size={22} stroke={2} filled={o.icon === "play"} /></span>
              <span className="result-e-opt-text">
                <span className="result-e-opt-title">{o.title}</span>
                <span className="result-e-opt-sub">{o.sub}</span>
              </span>
              <Icon name="chevron" size={18} stroke={2.6} />
            </button>
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
          title={result.data.title}
          intro={result.data.introduction}
          tasks={result.data.tasks}
          onClose={() => setPreview(false)}
          onPrint={() => void view()}
          onSolve={() => { setPreview(false); onPractice(); }}
        />
      )}
    </div>
  );
}
