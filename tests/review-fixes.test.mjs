// Tests für die Fixes aus dem Security-Review (M3 Jobs, M4 Sheet, M5 Lerngruppen-Punkte). Ausführen: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { sheetSafeRow, sheetSafeText } from "../lib/sheet-safe.ts";
import { scoreGroupResult } from "../lib/group-score.ts";
import { jobStatus, STALE_AFTER_MS } from "../lib/jobs.ts";

test("M4: Formel-Anfänge bekommen ein Apostroph", () => {
  assert.equal(sheetSafeText("=IMPORTXML(\"x\")"), "'=IMPORTXML(\"x\")");
  for (const s of ["+1", "-1", "@a", "\tx"]) assert.equal(sheetSafeText(s), `'${s}`);
  assert.equal(sheetSafeText("Tolles Spiel"), "Tolles Spiel");
  assert.deepEqual(sheetSafeRow({ a: "=1+1", n: 5, list: ["=x", "ok"], b: true }), { a: "'=1+1", n: 5, list: ["'=x", "ok"], b: true });
});

const game = {
  gameTitle: "T",
  subject: "Mathe",
  levels: [
    {
      id: 1,
      title: "L1",
      difficulty: "leicht",
      questions: [
        { type: "multiple-choice", prompt: "2+2?", options: ["3", "4"], correctIndex: 1, explanation: "" },
        { type: "lueckentext", prompt: "5+5 = ___", correctAnswer: "10", explanation: "" },
      ],
    },
    {
      id: 2,
      title: "L2",
      difficulty: "mittel",
      questions: [{ type: "multiple-choice", prompt: "3+3?", options: ["6", "7"], correctIndex: 0, explanation: "" }],
    },
  ],
};

test("M5: Punkte kommen vom Server, nicht vom Browser", () => {
  // gefälschtes "richtig" bei Multiple Choice zählt nicht, doppelte und unbekannte Fragen auch nicht
  const r = scoreGroupResult(game, {
    correct: 99,
    answers: [
      { l: 1, i: 0, ok: true, a: "3" },
      { l: 1, i: 0, ok: true, a: "4" },
      { l: 1, i: 1, ok: true, a: "10" },
      { l: 2, i: 0, ok: true, a: "6" },
      { l: 9, i: 0, ok: true, a: "x" },
    ],
  });
  assert.deepEqual([r.correct, r.total, r.pct], [2, 3, 67]);
  assert.equal(r.answers.length, 3);
  assert.equal(r.answers[0].ok, false);
});

test("M5: ohne Einzelantworten höchstens alle Fragen", () => {
  assert.deepEqual(scoreGroupResult(game, { correct: 500 }).pct, 100);
  assert.deepEqual(scoreGroupResult(game, { correct: 500 }).correct, 3);
  assert.deepEqual(scoreGroupResult(game, { correct: 1 }).pct, 33);
});

test("M3: abgebrochener Job wird nach ein paar Minuten zum Fehler", () => {
  const start = { status: "running", startedAt: 1_000, staleError: "kaputt" };
  assert.deepEqual(jobStatus(start, 1_000 + 60_000), { status: "running" });
  assert.deepEqual(jobStatus(start, 1_000 + STALE_AFTER_MS + 1), { status: "error", error: "kaputt" });
  assert.deepEqual(jobStatus(null), { status: "running" });
  assert.deepEqual(jobStatus({ status: "done", result: 1 }), { status: "done", result: 1 });
});
