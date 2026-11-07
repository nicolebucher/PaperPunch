import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "../i18n";
import { MathText } from "../math";
import { Icon } from "../ui";
import { PunchIcon } from "../rewards";
import { hapticRight, hapticWin, hapticWrong } from "../feedback";
import { answerMatches, splitLanguageNote } from "../answerMatch";
import { BLITZ_PUNCHES, BLITZ_SECONDS, blitzRecord, buildBlitzDeck, saveBlitzRecord, type BlitzItem, type BlitzSource } from "../blitz";
import { countCorrect, MatchBoard, matchRights } from "../MatchBoard";
import type { Question } from "../types";

/**
 * Blitzrunde: 60 Sekunden, so viele Fragen wie möglich (Auswahl, Richtig/Falsch, Zuordnen, kurze Lücke).
 * Falsch → richtige Lösung blitzt kurz auf, dann geht es weiter. Punches nur für richtige Antworten über dem
 * bisherigen Rekord (sonst ließe sich die Runde endlos für Punches wiederholen).
 */
export function BlitzPlay({
  questions,
  gameKey,
  onQuit,
  onDone,
  onPractice,
}: {
  questions: Question[];
  gameKey: string;
  onQuit: () => void;
  onDone: (r: { points: number; correct: number; total: number; missed: string[] }) => void;
  onPractice: (qs: Question[]) => void;
}) {
  const { t } = useT();
  const [phase, setPhase] = useState<"intro" | "play" | "end">("intro");
  const [deck, setDeck] = useState<BlitzItem[]>(() => buildBlitzDeck(questions));
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(BLITZ_SECONDS);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(0);
  const [missed, setMissed] = useState<BlitzItem[]>([]);
  // Rückmeldung nach einer Antwort: richtig/falsch, gewählte Antwort
  const [flash, setFlash] = useState<null | { ok: boolean; pick?: string }>(null);
  const [typed, setTyped] = useState("");
  const [link, setLink] = useState<Record<number, number>>({});
  const endsAt = useRef(0);
  const oldRecord = useMemo(() => blitzRecord(gameKey), [gameKey]);
  const result = useRef<{ points: number; newRecord: boolean }>({ points: 0, newRecord: false });

  const item = deck[idx % Math.max(1, deck.length)];
  const rights = useMemo(() => (item?.kind === "match" ? matchRights(item.pairs, item.prompt) : []), [item]);

  useEffect(() => {
    if (phase !== "play") return;
    const id = window.setInterval(() => {
      const s = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setLeft(s);
    }, 200);
    return () => window.clearInterval(id);
  }, [phase]);

  // Zeit um: Runde beenden (eine gerade gezeigte Rückmeldung läuft noch zu Ende)
  useEffect(() => {
    if (phase === "play" && left === 0 && !flash) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, flash, phase]);

  function start() {
    setDeck(buildBlitzDeck(questions));
    setIdx(0);
    setCorrect(0);
    setDone(0);
    setMissed([]);
    setFlash(null);
    setTyped("");
    setLink({});
    endsAt.current = Date.now() + BLITZ_SECONDS * 1000;
    setLeft(BLITZ_SECONDS);
    setPhase("play");
  }

  function finish() {
    const record = Math.max(oldRecord, correct);
    const points = Math.max(0, correct - oldRecord) * BLITZ_PUNCHES;
    result.current = { points, newRecord: correct > oldRecord };
    if (correct > oldRecord) saveBlitzRecord(gameKey, record);
    setPhase("end");
    hapticWin();
  }

  function answer(ok: boolean, pick?: string) {
    if (flash || !item) return;
    setDone((d) => d + 1);
    if (ok) {
      setCorrect((c) => c + 1);
      hapticRight();
    } else {
      setMissed((m) => (m.some((x) => x.prompt === item.prompt) ? m : [...m, item]));
      hapticWrong();
    }
    setFlash({ ok, pick });
    const wait = ok ? 350 : item.kind === "match" ? 1600 : 1100;
    window.setTimeout(() => {
      setFlash(null);
      setTyped("");
      setLink({});
      setIdx((i) => {
        const n = i + 1;
        // Stapel durch: neu mischen und weiter
        if (n >= deck.length) {
          setDeck(buildBlitzDeck(questions));
          return 0;
        }
        return n;
      });
    }, wait);
  }

  if (deck.length === 0) {
    return (
      <div className="screen light play">
        <div className="inner stack" style={{ gap: 16, padding: "40px 0" }}>
          <h1>{t.blitzTitle}</h1>
          <p className="muted">{t.blitzEmpty}</p>
          <button type="button" className="btn dark block" onClick={onQuit}>{t.backToMap}</button>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="screen light play">
        <div className="inner stack" style={{ gap: 18, padding: "16px 0 28px" }}>
          <div className="row"><button type="button" className="iconbtn" onClick={onQuit} aria-label={t.back}><Icon name="close" size={20} stroke={2.6} /></button></div>
          <div className="stack" style={{ alignItems: "center", textAlign: "center", gap: 12, marginTop: 24 }}>
            <span style={{ fontSize: 64 }} aria-hidden="true">⏱</span>
            <h1 className="display">{t.blitzTitle}</h1>
            <p className="muted" style={{ maxWidth: 320 }}>{t.blitzRules(BLITZ_SECONDS)}</p>
            {oldRecord > 0 && <p style={{ fontWeight: 800 }}>{t.blitzRecord(oldRecord)}</p>}
            <p className="muted" style={{ fontSize: 13 }}>{t.blitzPunchNote}</p>
          </div>
          <button type="button" className="btn primary block" style={{ marginTop: "auto" }} onClick={start}>{t.blitzStart}</button>
        </div>
      </div>
    );
  }

  if (phase === "end") {
    const { points, newRecord } = result.current;
    return (
      <div className="screen level-end">
        <div className="stack" style={{ alignItems: "center", textAlign: "center", gap: 12, marginTop: 32 }}>
          <span style={{ fontSize: 56 }} aria-hidden="true">⏱</span>
          <h1 className="display">{t.blitzResult(correct, BLITZ_SECONDS)}</h1>
          <p className="muted">{newRecord ? t.blitzNewRecord : t.blitzRecord(Math.max(oldRecord, correct))}</p>
          {points > 0 && <div className="end-points"><PunchIcon size={20} /> +{points}</div>}
        </div>
        {missed.length > 0 && (
          <div className="stack blitz-missed" style={{ gap: 8, marginTop: 20 }}>
            <b>{t.blitzMissed}</b>
            {missed.map((m, i) => (
              <div key={i} className="blitz-miss">
                <span><MathText text={m.prompt.replace("___", "____")} /></span>
                <b>→ {solutionOf(m)}</b>
                {m.src.explanation && <small className="muted">{m.src.explanation}</small>}
              </div>
            ))}
          </div>
        )}
        <div className="stack" style={{ marginTop: "auto", gap: 10, padding: "20px 0 28px" }}>
          {missed.length > 0 && (
            <button type="button" className="btn primary block" onClick={() => onPractice(missed.map((m) => m.src as Question))}>{t.blitzPractice(missed.length)}</button>
          )}
          <button type="button" className="btn ghost block" onClick={start}>{t.blitzAgain}</button>
          <button type="button" className="btn ghost block" onClick={() => onDone({ points, correct, total: done, missed: missed.map((m) => m.prompt) })}>{t.backToMap}</button>
        </div>
      </div>
    );
  }

  const { text, note } = splitLanguageNote(item.prompt);
  const pct = (left / BLITZ_SECONDS) * 100;
  return (
    <div className="screen light play blitz-play">
      <div className="inner" style={{ gap: 16, padding: "16px 0 28px" }}>
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <button type="button" className="iconbtn" onClick={onQuit} aria-label={t.back}><Icon name="close" size={20} stroke={2.6} /></button>
          <div className={`progress blitz-bar${left <= 10 ? " hurry" : ""}`} aria-hidden="true"><div style={{ width: `${pct}%` }} /></div>
          <span className="blitz-time" aria-label={t.blitzLeft(left)}>{left}s</span>
        </div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--pink)" }}>⏱ {t.blitzTitle}</span>
          <span className="combo c1">✓ {correct}</span>
        </div>

        <div className={`qcard ${flash && !flash.ok ? "shake" : ""}`} key={`b${idx}-${done}`}>
          {note && <h2 className="lang-note">🌐 {note}</h2>}
          <h1 style={{ fontSize: 22, lineHeight: 1.3 }}><MathText text={item.kind === "gap" ? text.replace("___", "______") : text} /></h1>
        </div>

        {item.kind === "mc" && (
          <div className="stack">
            {item.options.map((o, oi) => {
              const isAns = o === item.answer;
              const cls = flash ? (isAns ? "option right" : o === flash.pick ? "option wrong" : "option") : "option";
              return (
                <button key={oi} type="button" className={cls} style={{ fontSize: 18 }} disabled={!!flash} onClick={() => answer(isAns, o)}>
                  <MathText text={o} />
                </button>
              );
            })}
          </div>
        )}

        {item.kind === "tf" && (
          <div className="stack">
            <div className="blitz-candidate"><small className="muted">{t.blitzIsAnswer}</small><b><MathText text={item.candidate} /></b></div>
            <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
              {[true, false].map((v) => {
                const cls = flash ? (v === item.truth ? "option right" : flash.pick === String(v) ? "option wrong" : "option") : "option";
                return (
                  <button key={String(v)} type="button" className={cls} style={{ flex: 1, textAlign: "center", fontSize: 18 }} disabled={!!flash} onClick={() => answer(v === item.truth, String(v))}>
                    {v ? `✓ ${t.blitzTrue}` : `✗ ${t.blitzFalse}`}
                  </button>
                );
              })}
            </div>
            {flash && !flash.ok && !item.truth && <p className="check-failed">{t.blitzRight(item.answer)}</p>}
          </div>
        )}

        {item.kind === "match" && (
          <div className="stack">
            <MatchBoard pairs={item.pairs} rights={rights} link={link} onLink={setLink} solved={!!flash} />
            {!flash && (
              <button type="button" className="btn dark block" disabled={!item.pairs.every((_, i) => link[i] !== undefined)} onClick={() => answer(countCorrect(item.pairs, rights, link) === item.pairs.length)}>
                {t.check}
              </button>
            )}
          </div>
        )}

        {item.kind === "gap" && (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) answer(answerMatches(typed, item.answer, item.accepted, item.prompt)); }}>
            <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!!flash} autoComplete="off" autoCapitalize="off" autoFocus aria-label={t.typeAnswer} />
            {!flash && <button type="submit" className="btn dark block" disabled={!typed.trim()}>{t.check}</button>}
            {flash && !flash.ok && <p className="check-failed">{t.blitzRight(item.answer)}</p>}
          </form>
        )}

        {flash?.ok && <p className="blitz-ok" aria-live="polite">✓</p>}
      </div>
    </div>
  );
}

function solutionOf(m: BlitzItem): string {
  if (m.kind === "match") return m.pairs.map((p) => `${p.left} = ${p.right}`).join(" · ");
  if (m.kind === "gap") return m.answer;
  return m.answer;
}

export type { BlitzSource };
