import { useRef, useState } from "react";
import { useT } from "../i18n";
import { openPdf, shareFile } from "../platform";
import { buildStandaloneGameHtml } from "../gameExport";
import { Icon, type IconName } from "../ui";
import type { GameResult, GenerateResult, MaterialFormat, Task } from "../types";
import type { SessionRef } from "../App";
import { RatingCard } from "./RatingCard";

function slug(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 50) || "paperpunch";
}

const TASKS_PER_PAGE = 4;

/** Kleine Papier-Vorschau des Arbeitsblatts / Tests, seitenweise wischbar. Tippen öffnet das PDF. */
function SheetPreview({ title, intro, tasks, onOpen }: { title: string; intro: string; tasks: Task[]; onOpen: () => void }) {
  const { t } = useT();
  const [page, setPage] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const pages: Task[][] = [];
  for (let i = 0; i < tasks.length; i += TASKS_PER_PAGE) pages.push(tasks.slice(i, i + TASKS_PER_PAGE));
  if (pages.length === 0) pages.push([]);

  return (
    <div className="sheet-preview">
      <div
        className="sheet-pages"
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          setPage(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {pages.map((list, p) => (
          <div className="sheet-slot" key={p}>
            {p === 0 && <div className="sheet-behind" aria-hidden="true" />}
            <button type="button" className="sheet-paper" onClick={onOpen} aria-label={`${t.openPdf}: ${title}, ${t.pageOf(p + 1, pages.length)}`}>
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
            </button>
            <button type="button" className="sheet-pdf-badge" onClick={onOpen} aria-label={t.openPdf}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
              </svg>
              <span>PDF</span>
            </button>
          </div>
        ))}
      </div>
      {pages.length > 1 && (
        <div className="sheet-dots" aria-hidden="true">
          {pages.map((_, i) => <span key={i} className={i === page ? "on" : ""} />)}
        </div>
      )}
    </div>
  );
}

/** Vorschau eines Lernspiels: die Level als gestapelte Karten. */
function GamePreview({ game }: { game: GameResult["game"] }) {
  const { t } = useT();
  return (
    <div className="game-preview">
      {game.levels.map((level, i) => (
        <div className="game-preview-level" key={level.id}>
          <span className="game-preview-num">{i + 1}</span>
          <span className="stack" style={{ gap: 2, minWidth: 0 }}>
            <span className="material-title">{level.title}</span>
            <span className="material-sub">{t.questionsCount(level.questions.length)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Ergebnis (Design A): das fertige Material groß als Vorschau, darunter Lösen und die wichtigsten Aktionen. */
export function Result({
  result,
  from,
  say,
  onPlay,
  onPractice,
  onDone,
  onNew,
  onHome,
  rated = true,
  onRate,
  sourcesCount = 0,
  onRegenerate,
  onShareSources,
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
  sourcesCount?: number;
  onRegenerate?: (format: MaterialFormat) => void;
  onShareSources?: () => void;
}) {
  const { t, lang } = useT();
  const [showScript, setShowScript] = useState(false);

  const isSheet = result.format === "worksheet" || result.format === "test";
  const title = result.format === "game" ? result.game.gameTitle : result.format === "podcast" ? result.title : result.data.title;
  const subject = result.format === "game" ? result.game.subject : "";

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

  const tiles: { icon: IconName; label: string; onClick: () => void }[] = [];
  if (isSheet) tiles.push({ icon: "print", label: t.print, onClick: () => void view() });
  tiles.push({ icon: "share", label: t.share, onClick: () => void share() });
  if (onRegenerate && sourcesCount > 0 && result.format !== "podcast") {
    tiles.push({ icon: "review", label: t.reshuffle, onClick: () => onRegenerate(result.format) });
  }

  const questionTotal = result.format === "game" ? result.game.levels.reduce((s, l) => s + l.questions.length, 0) : 0;

  return (
    <div className="screen result-a">
      <div className="result-a-top">
        <button type="button" className="iconbtn plain" onClick={from ? onNew : onHome} aria-label={from ? t.backToPlan : t.back}>
          <Icon name="back" size={22} stroke={2.4} />
        </button>
        <span className="result-a-done">{t.done}</span>
        <button type="button" className="iconbtn plain" onClick={onHome} aria-label={t.home}>
          <Icon name="home" size={22} stroke={2} />
        </button>
      </div>

      <div className="stack" style={{ gap: 4, marginTop: 10 }}>
        <span className="home-a-label">
          {t.formats[result.format]}
          {subject ? ` · ${subject}` : ""}
        </span>
        <h1 className="result-a-title">{title}</h1>
      </div>

      {isSheet && <SheetPreview title={result.data.title} intro={result.data.introduction} tasks={result.data.tasks} onOpen={() => void view()} />}
      {result.format === "game" && <GamePreview game={result.game} />}
      {result.format === "podcast" && (
        <div className="card" style={{ marginTop: 18 }}>
          <audio controls src={`data:audio/mpeg;base64,${result.audioBase64}`} style={{ width: "100%" }}>
            {t.listen}
          </audio>
          <button type="button" className="btn ghost small" onClick={() => setShowScript((v) => !v)} aria-expanded={showScript}>
            {t.transcript}
          </button>
          {showScript && <p style={{ whiteSpace: "pre-line", fontSize: 15 }}>{result.script}</p>}
        </div>
      )}

      <div className="stack result-a-actions">
        {isSheet && (
          <button type="button" className="home-a-cta result-a-cta" onClick={onPractice}>
            <Icon name="play" size={22} filled />
            <span>{t.solveCount(result.data.tasks.length)}</span>
          </button>
        )}
        {result.format === "game" && (
          <button type="button" className="home-a-cta result-a-cta" onClick={() => onPlay(result.game)}>
            <Icon name="play" size={22} filled />
            <span>{t.playCount(questionTotal)}</span>
          </button>
        )}

        <div className="result-a-tiles" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
          {tiles.map((tile) => (
            <button key={tile.label} type="button" className="result-a-tile" onClick={tile.onClick}>
              <Icon name={tile.icon} size={20} stroke={2} />
              {tile.label}
            </button>
          ))}
        </div>
        {result.format === "game" && <p className="muted" style={{ fontSize: 13, textAlign: "center", margin: 0 }}>{t.shareHint}</p>}

        <span className="result-a-meta">
          {sourcesCount > 0 ? (
            <>
              {t.fromPhotos(sourcesCount)}
              {onShareSources && (
                <>
                  {" · "}
                  <button type="button" className="link-btn inline" onClick={onShareSources}>{t.sharePhotos}</button>
                </>
              )}
            </>
          ) : (
            t.savedInMaterials
          )}
        </span>

        <p className="result-a-ainote">{t.aiNote}</p>

        {!rated && onRate && <RatingCard onSend={onRate} />}

        <button type="button" className="btn ghost block" onClick={onDone}>
          <Icon name={from ? "check" : "plus"} /> {from ? t.markDone : t.newMaterial}
        </button>
      </div>
    </div>
  );
}
