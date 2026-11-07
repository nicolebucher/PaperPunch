import type { GameData } from "@/types/generation";
import { t, type Locale } from "@/lib/i18n/translations";

/**
 * Baut ein einzelnes, eigenständiges HTML-Dokument, das das Lernspiel ohne Server oder
 * Build-Tooling offline abspielt (Doppelklick reicht). Reine Vanilla-JS-Neuimplementierung
 * der gleichen Level-/Frage-/Snaps-Logik wie GameShell/LevelPlayer (unverschlossene Level,
 * Mixed-Modus, Snaps-Zähler), damit der Schüler das Spiel herunterladen und weitergeben kann.
 */
export function buildStandaloneGameHtml(game: GameData, locale: Locale): string {
  const labels = t(locale);
  // </script> im generierten Text darf das Script-Tag nicht vorzeitig beenden.
  // Die HTML-Datei kennt nur Auswahl- und Lückenfragen – Zuordnen-Fragen bleiben draußen
  const plain = { ...game, levels: game.levels.map((l) => ({ ...l, questions: l.questions.filter((q) => q.type !== "zuordnen") })).filter((l) => l.questions.length > 0) };
  const safeJson = JSON.stringify(plain).replace(/</g, "\\u003c");
  const difficultyMap = JSON.stringify(labels.difficulty).replace(/</g, "\\u003c");
  const strings = JSON.stringify({
    back: labels.game.back,
    correct: labels.game.correct,
    wrong: labels.game.wrong,
    next: labels.game.next,
    finishLevel: labels.game.finishLevel,
    done: labels.game.done,
    snapsUnit: labels.game.snapsUnit,
    mixedTitle: labels.game.mixedTitle,
    mixedSubtitle: labels.game.mixedSubtitle,
    typeAnswerPlaceholder: labels.game.typeAnswerPlaceholder,
    check: labels.game.check,
    // "{word}" placeholder gets swapped in client-side (see substituteWord in the script below) -
    // labels.game.correctAnswerWas is a template function, not serializable as-is into the page.
    correctAnswerWas: labels.game.correctAnswerWas("{word}"),
  }).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap" rel="stylesheet" />
<title>${escapeHtml(game.gameTitle)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #000000;
    color: #ffffff;
    font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    min-height: 100vh;
  }
  #app { max-width: 640px; margin: 0 auto; padding: 32px 20px; }
  .brand {
    display: inline-block;
    font-family: "Permanent Marker", cursive;
    font-size: 20px;
    color: #1fd6ea;
    transform: rotate(-4deg);
    text-shadow: 1.5px 1.5px 0 #000, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000;
    margin: 0 0 20px;
  }
  .brand .dot { color: #ffffff; }
  .top-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .subject { color: #9ca3af; font-size: 13px; margin: 0 0 24px; }
  .snaps-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(31, 214, 234, 0.1); color: #6fe6f2;
    border-radius: 999px; padding: 6px 12px; font-size: 13px; font-weight: 600;
    transition: transform 0.2s ease;
  }
  .snaps-badge.bump { transform: scale(1.25); }
  .level-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  .level-card {
    border: 1px solid #27272a;
    border-radius: 12px;
    padding: 16px;
    text-align: left;
    background: #09090b;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
  }
  .level-card:hover { border-color: #1fd6ea; }
  .level-card.mixed { border-color: rgba(31, 214, 234, 0.6); background: rgba(31, 214, 234, 0.05); }
  .level-card .row { display: flex; justify-content: space-between; align-items: center; font-weight: 600; }
  .level-card .difficulty { text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: #71717a; margin-top: 4px; }
  .level-card .stars { margin-top: 8px; font-size: 14px; }
  .top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .back-link { background: none; border: none; color: #71717a; cursor: pointer; font-size: 13px; padding: 0; }
  .back-link:hover { color: #d4d4d8; }
  .question-index { color: #71717a; font-size: 13px; }
  .card {
    position: relative;
    border: 1px solid #27272a;
    border-radius: 12px;
    padding: 20px;
    background: #09090b;
  }
  .prompt { font-weight: 600; margin: 0 0 16px; }
  .option {
    display: block;
    width: 100%;
    text-align: left;
    padding: 10px 14px;
    margin-bottom: 8px;
    border-radius: 8px;
    border: 1px solid #27272a;
    background: transparent;
    color: #ffffff;
    font: inherit;
    cursor: pointer;
  }
  .option:hover:not(:disabled) { border-color: #1fd6ea; }
  .option:disabled { cursor: not-allowed; }
  .option.correct { border-color: #4ade80; background: rgba(74, 222, 128, 0.1); }
  .option.wrong { border-color: #fb923c; background: rgba(251, 146, 60, 0.1); }
  .option.muted { border-color: #18181b; color: #52525b; }
  .feedback { margin-top: 16px; padding: 14px; border-radius: 8px; font-size: 14px; }
  .feedback.correct { background: rgba(74, 222, 128, 0.1); color: #86efac; }
  .feedback.wrong { background: rgba(251, 146, 60, 0.1); color: #fdba74; }
  .feedback p:first-child { font-weight: 600; margin: 0 0 4px; }
  .feedback p { margin: 0; }
  .blank-wrap { font-size: 15px; line-height: 1.7; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0; }
  .blank-input {
    min-width: 8rem; text-align: center; background: transparent; border: none;
    border-bottom: 2px solid #1fd6ea; color: #ffffff; font: inherit; padding: 2px 4px; outline: none;
  }
  .blank-input.correct { border-color: #4ade80; color: #86efac; }
  .blank-input.wrong { border-color: #fb923c; color: #fdba74; }
  .check-btn { margin-top: 14px; }
  .snap-float {
    position: absolute; top: 8px; right: 12px; color: #1fd6ea; font-weight: 700; font-size: 16px;
    animation: snap-float 1.1s ease-out forwards;
  }
  @keyframes snap-float {
    0% { opacity: 0; transform: translateY(0); }
    15% { opacity: 1; transform: translateY(-4px); }
    100% { opacity: 0; transform: translateY(-36px); }
  }
  .primary-btn {
    margin-top: 16px;
    background: #1fd6ea;
    color: #000000;
    border: none;
    border-radius: 999px;
    padding: 10px 20px;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .primary-btn:hover { background: #6fe6f2; }
  .result-banner { background: rgba(31, 214, 234, 0.1); border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; }
  .result-banner p:first-child { font-size: 17px; font-weight: 600; margin: 0 0 4px; }
  .result-banner p { margin: 0; color: #a1a1aa; font-size: 14px; }
</style>
</head>
<body>
<div id="app"></div>
<script>
var GAME = ${safeJson};
var DIFFICULTY = ${difficultyMap};
var STR = ${strings};
var SNAPS_BY_DIFFICULTY = { leicht: 10, mittel: 15, schwer: 20 };
var realLevels = GAME.levels.slice().sort(function (a, b) { return a.id - b.id; });
var mixedLevel = buildMixedLevel(realLevels);
var tiles = mixedLevel ? [mixedLevel].concat(realLevels) : realLevels;
var state = { results: {}, activeLevelId: null, questionIndex: 0, correctCount: 0, selected: null, typedValue: "", checked: false, totalSnaps: 0, justSnapped: false };

function splitBlank(sentence) {
  var gapIndex = sentence.indexOf("___");
  if (gapIndex === -1) return [sentence, ""];
  return [sentence.slice(0, gapIndex), sentence.slice(gapIndex + 3)];
}

function shuffle(list) {
  var copy = list.slice();
  for (var i = copy.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function buildMixedLevel(levels) {
  if (levels.length < 2) return null;
  var perLevel = Math.max(5, Math.ceil(15 / levels.length));
  var pooled = [];
  levels.forEach(function (level) {
    pooled = pooled.concat(shuffle(level.questions).slice(0, perLevel));
  });
  if (pooled.length < 10) return null;
  return { id: -1, title: STR.mixedTitle, difficulty: "mittel", questions: shuffle(pooled).slice(0, 15) };
}

function starsFor(ratio) {
  if (ratio === 1) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.4) return 1;
  return 0;
}

function starString(stars) {
  return "\\u2b50".repeat(stars) + "\\u2606".repeat(3 - stars);
}

function brandHtml() {
  return '<div class="brand">snap<span class="dot">.</span>it</div>';
}

function render() {
  var app = document.getElementById("app");
  if (state.activeLevelId !== null) {
    app.innerHTML = brandHtml() + renderLevel();
  } else {
    app.innerHTML = brandHtml() + renderMap();
  }
  attachHandlers();
}

function renderMap() {
  var allDone = realLevels.every(function (level) { return state.results[level.id] !== undefined; });
  var totalStars = realLevels.reduce(function (sum, level) { return sum + ((state.results[level.id] && state.results[level.id].stars) || 0); }, 0);
  var maxStars = realLevels.length * 3;

  var banner = allDone
    ? '<div class="result-banner"><p>' + escapeHtml(STR.done) + '</p><p>' + totalStars + " / " + maxStars + " \\u2b50</p></div>"
    : "";

  var cards = tiles
    .map(function (level) {
      var isMixed = level.id === -1;
      var result = state.results[level.id];
      var starsHtml = result ? '<div class="stars">' + starString(result.stars) + "</div>" : "";
      var difficultyLabel = isMixed ? STR.mixedSubtitle : (DIFFICULTY[level.difficulty] || level.difficulty);
      return (
        '<button class="level-card' + (isMixed ? " mixed" : "") + '" data-level-id="' +
        level.id +
        '"><div class="row"><span>' +
        (isMixed ? "\\u{1F500} " : "") +
        escapeHtml(level.title) +
        '</span></div><div class="difficulty">' +
        escapeHtml(difficultyLabel) + " \\u00b7 " + level.questions.length + "</div>" +
        starsHtml +
        "</button>"
      );
    })
    .join("");

  var snapsBadge =
    '<div class="snaps-badge' + (state.justSnapped ? " bump" : "") + '">\\u26A1 ' + state.totalSnaps + " " + escapeHtml(STR.snapsUnit) + "</div>";

  return (
    '<div class="top-header"><div><h1>' +
    escapeHtml(GAME.gameTitle) +
    '</h1><p class="subject">' +
    escapeHtml(GAME.subject) +
    "</p></div>" +
    snapsBadge +
    "</div>" +
    banner +
    '<div class="level-grid">' +
    cards +
    "</div>"
  );
}

function renderLevel() {
  var level = tiles.find(function (l) { return l.id === state.activeLevelId; });
  var question = level.questions[state.questionIndex];
  var isLast = state.questionIndex === level.questions.length - 1;
  var isMultipleChoice = question.type === "multiple-choice";
  var answered = isMultipleChoice ? state.selected !== null : state.checked;
  var isCorrect = isMultipleChoice
    ? state.selected === question.correctIndex
    : state.typedValue.trim() === question.correctAnswer;

  var cardBody;
  if (isMultipleChoice) {
    cardBody =
      '<p class="prompt">' +
      escapeHtml(question.prompt) +
      "</p>" +
      question.options
        .map(function (option, i) {
          var cls = "option";
          if (answered) {
            if (i === question.correctIndex) cls += " correct";
            else if (i === state.selected) cls += " wrong";
            else cls += " muted";
          }
          return (
            '<button class="' + cls + '" data-option-index="' + i + '" ' + (answered ? "disabled" : "") + ">" +
            escapeHtml(option) +
            "</button>"
          );
        })
        .join("");
  } else {
    var parts = splitBlank(question.prompt);
    var inputCls = "blank-input" + (answered ? (isCorrect ? " correct" : " wrong") : "");
    cardBody =
      '<p class="blank-wrap"><span>' +
      escapeHtml(parts[0]) +
      '</span><input type="text" id="blank-input" class="' +
      inputCls +
      '" placeholder="' +
      escapeHtml(STR.typeAnswerPlaceholder) +
      '" value="' +
      escapeHtml(state.typedValue) +
      '" ' +
      (answered ? "disabled" : "") +
      "/><span>" +
      escapeHtml(parts[1]) +
      "</span></p>" +
      (answered
        ? ""
        : '<button class="primary-btn check-btn" id="check-btn" ' +
          (state.typedValue.trim() === "" ? "disabled" : "") +
          ">" +
          escapeHtml(STR.check) +
          "</button>");
  }

  var feedback = "";
  var snapFloat = "";
  if (answered) {
    if (isCorrect) {
      var earned = SNAPS_BY_DIFFICULTY[level.difficulty] || 10;
      snapFloat = '<div class="snap-float">+' + earned + " " + escapeHtml(STR.snapsUnit) + "</div>";
    }
    var correctAnswerLine = !isCorrect && !isMultipleChoice
      ? "<p>" + escapeHtml(STR.correctAnswerWas.replace("{word}", question.correctAnswer)) + "</p>"
      : "";
    feedback =
      '<div class="feedback ' +
      (isCorrect ? "correct" : "wrong") +
      '"><p>' +
      escapeHtml(isCorrect ? STR.correct : STR.wrong) +
      "</p>" +
      correctAnswerLine +
      "<p>" +
      escapeHtml(question.explanation) +
      "</p></div>" +
      '<button class="primary-btn" id="next-btn">' +
      escapeHtml(isLast ? STR.finishLevel : STR.next) +
      "</button>";
  }

  return (
    '<div class="top-row"><button class="back-link" id="back-btn">\\u2190 ' +
    escapeHtml(STR.back) +
    '</button><span class="question-index">' +
    (state.questionIndex + 1) +
    "/" +
    level.questions.length +
    '</span></div><h2>' +
    escapeHtml(level.title) +
    '</h2><div class="card">' +
    cardBody +
    snapFloat +
    "</div>" +
    feedback
  );
}

function attachHandlers() {
  var app = document.getElementById("app");
  var levelButtons = app.querySelectorAll(".level-card");
  for (var i = 0; i < levelButtons.length; i++) {
    levelButtons[i].addEventListener("click", function (e) {
      state.activeLevelId = Number(e.currentTarget.getAttribute("data-level-id"));
      state.questionIndex = 0;
      state.correctCount = 0;
      state.selected = null;
      state.typedValue = "";
      state.checked = false;
      state.justSnapped = false;
      render();
    });
  }

  var backBtn = app.querySelector("#back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", function () {
      state.activeLevelId = null;
      render();
    });
  }

  var optionButtons = app.querySelectorAll(".option");
  for (var j = 0; j < optionButtons.length; j++) {
    optionButtons[j].addEventListener("click", function (e) {
      if (state.selected !== null) return;
      var level = tiles.find(function (l) { return l.id === state.activeLevelId; });
      var question = level.questions[state.questionIndex];
      var optionIndex = Number(e.currentTarget.getAttribute("data-option-index"));
      state.selected = optionIndex;
      if (optionIndex === question.correctIndex) {
        state.correctCount += 1;
        state.totalSnaps += SNAPS_BY_DIFFICULTY[level.difficulty] || 10;
        state.justSnapped = true;
      }
      render();
    });
  }

  var blankInput = app.querySelector("#blank-input");
  if (blankInput) {
    blankInput.addEventListener("input", function (e) {
      state.typedValue = e.target.value;
      var checkBtn = app.querySelector("#check-btn");
      if (checkBtn) checkBtn.disabled = state.typedValue.trim() === "";
    });
    blankInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") submitTypedAnswer();
    });
  }

  var checkBtn = app.querySelector("#check-btn");
  if (checkBtn) {
    checkBtn.addEventListener("click", submitTypedAnswer);
  }

  function submitTypedAnswer() {
    if (state.checked || state.typedValue.trim() === "") return;
    var level = tiles.find(function (l) { return l.id === state.activeLevelId; });
    var question = level.questions[state.questionIndex];
    state.checked = true;
    if (state.typedValue.trim() === question.correctAnswer) {
      state.correctCount += 1;
      state.totalSnaps += SNAPS_BY_DIFFICULTY[level.difficulty] || 10;
      state.justSnapped = true;
    }
    render();
  }

  var nextBtn = app.querySelector("#next-btn");
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      var level = tiles.find(function (l) { return l.id === state.activeLevelId; });
      var isLast = state.questionIndex === level.questions.length - 1;
      if (isLast) {
        var ratio = state.correctCount / level.questions.length;
        if (level.id !== -1) {
          state.results[level.id] = { stars: starsFor(ratio), score: state.correctCount };
        }
        state.activeLevelId = null;
        state.questionIndex = 0;
        state.correctCount = 0;
        state.selected = null;
        state.typedValue = "";
        state.checked = false;
      } else {
        state.questionIndex += 1;
        state.selected = null;
        state.typedValue = "";
        state.checked = false;
      }
      render();
    });
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

render();
</script>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
