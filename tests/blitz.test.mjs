import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildBlitzDeck, isShortGap } from "../lib/blitz.ts";

test("App-Kopie der Blitzrunde ist identisch (bis auf die Kopfzeile)", () => {
  const body = (path) => readFileSync(new URL(path, import.meta.url), "utf8").split("\n").slice(1).join("\n");
  assert.equal(body("../mobile/src/blitz.ts"), body("../lib/blitz.ts"));
});

test("blitz deck: fast types only, short gaps, max 4 pairs, true/false from multiple choice", () => {
  const mc = (i) => ({ type: "multiple-choice", prompt: `Frage ${i}?`, options: ["A", "B", "C"], correctIndex: 1, explanation: "" });
  const qs = [
    ...Array.from({ length: 9 }, (_, i) => mc(i)),
    { type: "lueckentext", prompt: "Hund heißt ___.", correctAnswer: "perro", explanation: "" },
    { type: "lueckentext", prompt: "Lang ___.", correctAnswer: "der sehr lange Satz hier", explanation: "" },
    { type: "zuordnen", prompt: "Ordne zu.", pairs: [1, 2, 3, 4, 5].map((n) => ({ left: `l${n}`, right: `r${n}` })), explanation: "" },
    { type: "satzbau", prompt: "Bilde.", correctAnswer: "a b c", explanation: "" },
  ];
  const deck = buildBlitzDeck(qs);
  assert.equal(deck.filter((d) => d.kind === "gap").length, 1);
  assert.equal(deck.find((d) => d.kind === "match").pairs.length, 4);
  assert.equal(deck.filter((d) => d.kind === "tf").length, 3);
  assert.equal(deck.length, 11);
  for (const d of deck.filter((d) => d.kind === "tf")) assert.equal(d.truth, d.candidate === "B");
  assert.ok(isShortGap("el perro") && !isShortGap("uno dos tres"));
});
