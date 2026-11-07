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

test("sentence building: tiles are shuffled, check ignores case and punctuation", async () => {
  const { sentenceTiles, sentenceMatches } = await import("../lib/answer-match.ts");
  const tiles = sentenceTiles("¿Cómo te llamas?", "q1");
  assert.deepEqual([...tiles].sort(), ["Cómo", "llamas", "te"].sort());
  assert.notEqual(tiles.join(" "), "Cómo te llamas");
  assert.equal(sentenceTiles("Me gusta jugar al fútbol.", "x").length, 5);
  assert.ok(sentenceMatches("cómo te llamas", "¿Cómo te llamas?"));
  assert.ok(!sentenceMatches("te cómo llamas", "¿Cómo te llamas?"));
  assert.ok(sentenceMatches("Gestern bin ich ins Kino gegangen", "Ich bin gestern ins Kino gegangen.", ["Gestern bin ich ins Kino gegangen."]));
  assert.ok(!sentenceMatches("", "Hallo Welt"));
});

test("order: tiles shuffled, exact order required", async () => {
  const { orderTiles, orderMatches } = await import("../lib/answer-match.ts");
  const items = ["Eiszeit", "Römer", "Mittelalter", "Neuzeit"];
  const t = orderTiles(items, "q");
  assert.notDeepEqual(t, items);
  assert.deepEqual([...t].sort(), [...items].sort());
  assert.ok(orderMatches(["eiszeit", "Römer", "Mittelalter", "Neuzeit"], items));
  assert.ok(!orderMatches(["Römer", "Eiszeit", "Mittelalter", "Neuzeit"], items));
});

test("order/sentence shuffle: at most a third in place, first entry never first", async () => {
  const { orderTiles, sentenceTiles } = await import("../lib/answer-match.ts");
  for (let n = 3; n <= 9; n++) {
    const items = Array.from({ length: n }, (_, i) => `w${i}`);
    for (let s = 0; s < 200; s++) {
      const t = orderTiles(items, `seed-${n}-${s}`);
      assert.ok(t.filter((v, i) => v === items[i]).length <= Math.floor(n / 3), `n=${n} s=${s}`);
      assert.notEqual(t[0], items[0]);
    }
  }
  assert.notEqual(sentenceTiles("Ich spiele gern Fußball.", "a")[0], "Ich");
});

test("stripAnswerLeak removes brackets that give the answer away", async () => {
  const { stripAnswerLeak } = await import("../lib/answer-match.ts");
  assert.equal(stripAnswerLeak("Write the number as a word: ___ (five).", "five"), "Write the number as a word: ___.");
  assert.equal(stripAnswerLeak("Pau toca ___ (die Gitarre).", "la guitarra"), "Pau toca ___ (die Gitarre).");
  assert.equal(stripAnswerLeak("Pau spielt ___ (auf Spanisch: Gitarre).", "la guitarra", ["guitarra"]), "Pau spielt ___ (auf Spanisch: Gitarre).");
  assert.equal(stripAnswerLeak("Der ___ bellt (Hund).", "der Hund", ["Hund"]), "Der ___ bellt.");
  assert.equal(stripAnswerLeak("3 + 4 = ___ (Tipp: zähle weiter)", "7"), "3 + 4 = ___ (Tipp: zähle weiter)");
});

test("detectForeignLanguage", async () => {
  const { detectForeignLanguage } = await import("../lib/answer-match.ts");
  assert.equal(detectForeignLanguage("Spanisch Vokabeln Unidad 3", "de"), "es");
  assert.equal(detectForeignLanguage("Englisch: simple past", "de"), "en");
  assert.equal(detectForeignLanguage("English grammar", "en"), null);
  assert.equal(detectForeignLanguage("Latein Lektion 5", "de"), "la");
  assert.equal(detectForeignLanguage("Bruchrechnen", "de"), null);
});
