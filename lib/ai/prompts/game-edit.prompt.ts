import { MATH_RULE } from "./material-source";

// Lehrkräfte passen ein fertiges Lernspiel an, bevor sie es mit der Klasse teilen:
// eine einzelne Frage ersetzen oder ein ganzes Level zu einem (neuen) Unterthema neu erstellen.
// Das Originalmaterial (Fotos) liegt dann nicht mehr vor – Grundlage sind die vorhandenen Fragen.

const QUESTION_RULES = `Question types (same fields as the existing questions):
- "multiple-choice": "prompt" is the question, "options" has 3-4 choices with exactly one correct answer
  ("correctIndex"); the wrong options must be plausible, never obviously wrong.
- "lueckentext": "prompt" is a sentence with exactly one "___" gap; "correctAnswer" holds the exact correct
  word/number; "acceptedAnswers" lists other answers that must also count as correct (synonyms, equivalent
  numbers like "3/4" and "0,75", spelling variants) - leave it out if there are none.
- "explanation": one or two short sentences why the answer is correct.

A wrong or mismatched answer key is a serious failure: re-read every question together with its answer
before finalizing. Questions must be unambiguous, factually correct and age-appropriate.

${MATH_RULE}

Write everything in exactly the same language as the existing questions. Mixing languages is a serious failure.
Respond only via the provided tool.`;

export function buildReplaceQuestionPrompt(): string {
  return `A teacher is reviewing a quiz-style learning game before sharing it with their class and wants
to replace ONE question. You get the game's subject and title, the level the question belongs to (with its
other questions, for context and to avoid duplicates) and the question to replace, plus the teacher's wishes.

Create exactly one new question that:
- covers the same sub-topic as the level (unless the teacher asks for something else),
- fulfils every wish of the teacher (e.g. easier, harder, a different example, everyday context, as a gap
  question, as a multiple-choice question). If the teacher points out a mistake ("answer B is wrong, the
  correct one is ..."), fix exactly that and keep the rest of the question,
- matches the grade level and wording style of the existing questions,
- does not repeat or merely rephrase any other question of the level.
Keep the question type of the original unless the teacher asks for the other type.

${QUESTION_RULES}`;
}

export function buildReplaceLevelPrompt(count: number): string {
  return `A teacher is reviewing a quiz-style learning game before sharing it with their class and wants
to replace a WHOLE level (a block of questions) with new questions on a given sub-topic. You get the game's
subject and title, the other levels' titles and questions (so you can infer the grade level and must not
repeat them), the current level, the requested sub-topic and difficulty.

Create a new level with:
- "title": a short, specific title naming the sub-topic (e.g. "Comparing fractions"), no playful names,
  no emojis, no format words,
- "difficulty": exactly one of the literal values "leicht", "mittel", "schwer",
- exactly ${count} questions on the requested sub-topic, genuinely mixing the two question types,
  varied in wording and examples, none repeating a question from another level.
Match the grade level of the existing questions; "easier"/"harder" is relative to the current level.

${QUESTION_RULES}`;
}
