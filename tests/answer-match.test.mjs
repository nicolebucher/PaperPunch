// Tests für den toleranten Antwortvergleich (lib/answer-match.ts, Kopie in mobile/src/answerMatch.ts).
// Ausführen: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { answerHint, answerMatches, spellingNote } from "../lib/answer-match.ts";

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
  ["despistado/a", "despistado"],
  ["el despistado/la despistada", "despistado"],
  ["el despistado / la despistada", "el despistado"],
  ["Lehrer/in", "Lehrer"],
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
  ["Mitose/Meiose", "Mitose"],
  ["Hund/Katze", "Hund"],
  ["km/m", "km"],
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

test("Schrägstrich-Formen mit erlaubten Varianten", () => {
  assert.equal(answerMatches("el despistado/la despistada", "despistado", ["despistada", "el despistado", "la despistada"], "Die Person … nennt man 'el/la ___'."), true);
  assert.equal(answerMatches("despistado/a", "despistado", ["despistada"]), true);
});

test("Rechtschreib-Modus ist streng", () => {
  assert.equal(answerMatches("Apfel", "Äpfel", [], "", true), false);
  assert.equal(answerMatches("Äpfel", "Äpfel", [], "", true), true);
});

test("Schreibweisen-Hinweis bei Tippfehler", () => {
  assert.equal(spellingNote("Fotosintese", "Fotosynthese"), "Fotosynthese");
  assert.equal(spellingNote("Fotosynthese", "Fotosynthese"), null);
});

test("Tipp: erster Buchstabe je Wort", () => {
  assert.equal(answerHint("la guitarra"), "l_ g_______");
  assert.equal(answerHint("Spielplatz"), "S_________");
  assert.equal(answerHint("12 cm"), null);
  assert.equal(answerHint("1914"), null);
  assert.equal(answerHint("ab"), null);
});

test("App-Kopie ist identisch (bis auf die Kopfzeile)", () => {
  const body = (path) => readFileSync(new URL(path, import.meta.url), "utf8").split("\n").slice(1).join("\n");
  assert.equal(body("../mobile/src/answerMatch.ts"), body("../lib/answer-match.ts"));
});

test("splitLanguageNote moves the answer-language note out of the question", async () => {
  const { splitLanguageNote } = await import("../lib/answer-match.ts");
  assert.deepEqual(splitLanguageNote("Pau spielt sehr gut ___ (auf Spanisch: Gitarre)."), { text: "Pau spielt sehr gut ___ (Gitarre).", note: "Auf Spanisch" });
  assert.deepEqual(splitLanguageNote("Paul spielt ___ (Gitarre) – auf Spanisch"), { text: "Paul spielt ___ (Gitarre)", note: "Auf Spanisch" });
  assert.deepEqual(splitLanguageNote("Wie heißt „Hund“? (in English)"), { text: "Wie heißt „Hund“?", note: "In English" });
  assert.deepEqual(splitLanguageNote("Auf Französisch: Ich heiße Tom."), { text: "Ich heiße Tom.", note: "Auf Französisch" });
  assert.deepEqual(splitLanguageNote("Pau toca muy bien ___ (die Gitarre)."), { text: "Pau toca muy bien ___ (die Gitarre).", note: null });
  assert.deepEqual(splitLanguageNote("Was ist 3/4 von 12?"), { text: "Was ist 3/4 von 12?", note: null });
});
