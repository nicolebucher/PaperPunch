// Tests für den toleranten Antwortvergleich (lib/answer-match.ts, Kopie in mobile/src/answerMatch.ts).
// Ausführen: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { answerMatches, spellingNote } from "../lib/answer-match.ts";

const right = [
  // [Eingabe, erwartet]
  ["12 cm", "12 cm"],
  ["12cm", "12 cm"],
  ["12 cn", "12 cm"],
  ["1000", "1.000"],
  ["1 000", "1000"],
  ["1.000", "1000"],
  ["12.500.000", "12500000"],
  ["1,5", "1.5"],
  ["0,125", "0.125"],
  ["3/4", "0,75"],
  ["10 %", "1/10"],
  ["km/h", "km/h"],
  ["Mitose", "Mitose/Meiose"],
  ["Meiose", "Mitose / Meiose"],
  ["Fotosynthese", "Photosynthese"],
  ["Hauptstadt", "die Hauptstadt"],
  ["GCF", "greatest common factor (GCF)"],
  ["Zehntel Hundertstel", "Zehntel und Hundertstel"],
];

const wrong = [
  ["13 cm", "12 cm"],
  ["x = 6", "x = 5"],
  ["2,5 kg", "3,5 kg"],
  ["h", "km/h"],
  ["km", "km/h"],
  ["m", "m/s"],
  ["1", "1.000"],
  ["-5", "5"],
  ["1915", "1914"],
  ["Meiose", "Mitose"],
  ["1914 n. Chr.", "1915 n. Chr."],
];

for (const [given, expected] of right) {
  test(`richtig: "${given}" für "${expected}"`, () => assert.equal(answerMatches(given, expected), true));
}
for (const [given, expected] of wrong) {
  test(`falsch: "${given}" für "${expected}"`, () => assert.equal(answerMatches(given, expected), false));
}

test("Lückentext: Wort aus dem Satz muss nicht mitgetippt werden", () => {
  assert.equal(answerMatches("proper", "proper fraction", [], "It is called a ___ fraction."), true);
});

test("Rechtschreib-Modus ist streng", () => {
  assert.equal(answerMatches("Apfel", "Äpfel", [], "", true), false);
  assert.equal(answerMatches("Äpfel", "Äpfel", [], "", true), true);
});

test("Schreibweisen-Hinweis bei Tippfehler", () => {
  assert.equal(spellingNote("Fotosintese", "Fotosynthese"), "Fotosynthese");
  assert.equal(spellingNote("Fotosynthese", "Fotosynthese"), null);
});

test("App-Kopie ist identisch (bis auf die Kopfzeile)", () => {
  const body = (path) => readFileSync(new URL(path, import.meta.url), "utf8").split("\n").slice(1).join("\n");
  assert.equal(body("../mobile/src/answerMatch.ts"), body("../lib/answer-match.ts"));
});
