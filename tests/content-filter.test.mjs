// Tests für die Prüfung geteilter Lernspiele (lib/content-filter.ts). Ausführen: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSharedGame, containsLink, containsSlur } from "../lib/content-filter.ts";

const q = (prompt, extra = {}) => ({ type: "multiple-choice", prompt, options: ["A", "B"], correctIndex: 0, explanation: "Weil.", ...extra });
const game = (questions, extra = {}) => ({ gameTitle: "Zweiter Weltkrieg", subject: "Geschichte", levels: [{ id: 1, title: "Level 1", difficulty: "leicht", questions }], ...extra });

test("normale Schulinhalte gehen durch", () => {
  assert.equal(checkSharedGame(game([q("Wann kam Hitler an die Macht?"), q("Welche Funktion hat der Penis bei der Fortpflanzung?"), q("Was heißt sex auf Latein?"), q("What does 'fickle' mean?"), q("Berechne 3,5 kg + 1.000 g."), q("Was bedeutet z.B. die Abkürzung usw.?")])), null);
});

test("Links werden abgelehnt", () => {
  for (const t of ["Hier klicken: https://evil.example", "www.gewinnspiel.de", "Schau auf freerobux.xyz", "gratis.com/abc"]) {
    assert.equal(containsLink(t), true, t);
  }
  assert.equal(checkSharedGame(game([q("Frage", { explanation: "mehr auf www.example.org" })])), "link");
  assert.equal(containsLink("Das ist z.B. ein Beispiel. Die Antwort ist 3.5"), false);
});

test("eindeutige Beleidigungen werden abgelehnt, auch verschleiert", () => {
  for (const t of ["Du Hurensohn", "f u c k", "F1ck dich", "kys"]) assert.equal(containsSlur(t), true, t);
  assert.equal(checkSharedGame(game([q("Frage", { options: ["ok", "du wichser"] })])), "offensive");
  assert.equal(containsSlur("Die Schifffahrt auf dem Rhein"), false);
});

test("zu lange Texte werden abgelehnt", () => {
  assert.equal(checkSharedGame(game([q("x".repeat(1001))])), "too-long");
  assert.equal(checkSharedGame(game([q("Frage")], { gameTitle: "y".repeat(201) })), "too-long");
});

test("Boss-Fragen werden mitgeprüft", () => {
  assert.equal(checkSharedGame(game([q("Frage")], { boss: [q("Besuche www.abzocke.ru")] })), "link");
});
