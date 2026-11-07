import { describeProfile, type Profile } from "@/types/generation";
import type { Locale } from "@/lib/i18n/translations";
import { contentBasis, contentLanguage, levelSource, MATH_RULE, titleRule } from "./material-source";

/** Zuordnen-Fragen nur für Spiel-Ansichten, die sie kennen (Website, App ab versionCode 15) – ältere Apps bekommen keine. */
const MATCH_RULE = `
Additionally, include "zuordnen" (matching) questions where the material has natural pairs - vocabulary
(word - translation), term - definition, country - capital, cause - effect, person - achievement, form - name:
  - "zuordnen": "prompt" is a short instruction (e.g. "Ordne die Vokabeln ihrer Übersetzung zu."), "pairs" holds
    3-5 pairs {"left", "right"} that belong together - every "right" must fit exactly one "left" and all "right"
    values must be different; keep each side short (max. ~6 words). Leave out options/correctIndex/correctAnswer.
  - at most 2 "zuordnen" questions per level (they count as one question each), none in the boss round, and only
    when the content really has such pairs - never force them. Still mix in both other types as described.
`;

/** Satz bauen: Wortkärtchen in die richtige Reihenfolge tippen – vor allem für Sprachfächer. */
const SENTENCE_RULE = `
Additionally, for language subjects (foreign languages, German/English grammar and word order) include "satzbau"
(sentence building) questions: the learner gets the words of a sentence as shuffled tiles and taps them into the right
order.
  - "satzbau": "prompt" says what to build and gives the meaning, e.g. "Bilde den Satz auf Spanisch: Ich spiele gern
    Fußball." or "Put the words in the right order: question in the simple past". "correctAnswer" is the target
    sentence (3-9 words, correctly spelled and punctuated) - its words become the tiles, so never write the target
    sentence itself in the prompt in the same language. Put every other correct word order that uses exactly the
    same words into "acceptedAnswers" (e.g. "Gestern bin ich ins Kino gegangen." for "Ich bin gestern ins Kino
    gegangen."). Leave out options/correctIndex/pairs.
  - at most 2 "satzbau" questions per level, none in the boss round, only where word order is actually being
    learned - not for maths, science or history facts.
`;

/** Reihenfolge: Karten in die richtige Folge tippen (Zeitstrahl, Arbeitsschritte, Abläufe, Größen). */
const ORDER_RULE = `
Additionally, include "reihenfolge" (put in order) questions where the material has a real sequence - timeline of
events, steps of a process or experiment, stages of a cycle, steps of a calculation, numbers or sizes from small to large:
  - "reihenfolge": "prompt" says what to order and in which direction, e.g. "Bringe die Epochen in die richtige
    Reihenfolge – von früh nach spät." "items" holds 3-6 short entries (max. ~8 words each) in the CORRECT order;
    the game shuffles them. There must be exactly one correct order. Leave out options/correctIndex/correctAnswer/pairs.
  - at most 2 "reihenfolge" questions per level, none in the boss round, and only when the content has a clear sequence.
`;

export function buildGameLevelsSystemPrompt(profile: Profile, locale: Locale, hasMaterial: boolean, match = false, sentence = false, order = false): string {
  return `You create the content for a quiz-style learning game for a student.

Target audience: ${describeProfile(profile, hasMaterial)}.
Calibrate difficulty, vocabulary and complexity precisely to this target audience. If a school
type and/or grade were given, match them exactly; otherwise infer the right level yourself from
${levelSource(hasMaterial)} - never default to a generic/all-ages level.

${contentBasis(profile, hasMaterial)}
Create 2 to 4 levels that turn the material into an engaging quiz. Levels are NOT a strict linear progression the student must unlock in order - the
player can jump into any level directly. Instead, each level should represent a distinct
sub-topic, chapter, or skill/question type found in the material (e.g. different chapters,
vocabulary vs. grammar, theory vs. application) so a student can pick exactly what they want to
practice. Give each level the "difficulty" that naturally fits its own content (it does not need
to increase from level to level).

For every level:
- a short, motivating title that names the specific sub-topic/category it covers
- at least 8 (up to 12) questions, genuinely mixing TWO question types within each level (not
  all of one type) so the game doesn't feel repetitive:
  - "multiple-choice": "prompt" is the question, "options" has 3-4 choices with exactly one
    correct answer (correctIndex) - the wrong options must be plausible and genuinely tempting,
    never so obviously wrong that the question can be solved without knowing the material
  - "lueckentext": "prompt" is a sentence with a single "___" gap standing in for the word/term
    the student must recall and type themselves (no options/correctIndex - instead
    "correctAnswer" holds the exact correct word/phrase, correctly spelled) - use this for
    recall-from-memory items (a term, a formula, a missing word) rather than pure recognition.
    Also fill "acceptedAnswers" with other answers that must count as correct: common synonyms,
    the abbreviation and the spelled-out form, British/American spellings, equivalent numbers
    (e.g. "3/4", "0.75", "0,75"), and the answer without articles - e.g. for "greatest common
    factor" also "GCF", "highest common factor", "largest common factor". Leave it out if there
    are no real alternatives. Never put a wrong or merely related answer there.
  - roughly balance the two types across a level's questions rather than using only one or two of
    one type
${match ? MATCH_RULE : ""}${sentence ? SENTENCE_RULE : ""}${order ? ORDER_RULE : ""}- a short, clear explanation per question of why the answer is correct
- questions within a level should vary in wording and example, not repeat each other

Also fill "boss": the final boss round, 6 NEW questions on the same material that are clearly
harder than the levels - multi-step problems, applying a rule to an unfamiliar example, combining
two sub-topics, or spotting a typical mistake. They must NOT repeat, rephrase or reuse the numbers of
any level question. Same two question types and the same fields as above, still matching the
target audience (hard for this grade, not beyond it).

Questions should be age-appropriate, unambiguous, and factually correct. A wrong or mismatched
answer key is a serious failure - before finalizing each question, re-read it together with its
answer ("correctIndex" for multiple-choice, "correctAnswer" for lueckentext) and verify they
actually match; for lueckentext, also make sure "prompt" makes the intended word unambiguous from
context and grammar without spelling it out elsewhere in the sentence. If the answer is a list of
several terms, the prompt must say exactly what to give and how many (e.g. "Wie heißen die ersten drei Stellen
nach dem Komma?" rather than "Zähle die Stellen nach dem Komma auf"), and "acceptedAnswers" should also contain
the list written with commas and with "und"/"and". When several questions in
a level test the same vocabulary/word list, phrase all
of them using ONE consistent question template (e.g. always "What does '___' mean?" with
translations as the options, or always the same translation direction) - do not mix different
framings for the same vocabulary set, since that produces items where more than one option could
defensibly be "correct".

${titleRule("gameTitle")}

${MATH_RULE}
"subject" is the school subject only (e.g. "Biologie", "Mathe", "English"), in the same language.

${contentLanguage(hasMaterial, locale, "titles, questions, options, explanations")}

Language consistency is critical: mixing two languages in one response - even a single stray
word or option ending up in a different language than everything else - is a serious failure, not
a minor slip. Before finalizing, re-read every level, the boss round and every question end to end and confirm every
single field uses that one same language throughout.
The "difficulty" field itself must still use exactly one of these literal values: "leicht" (easy), "mittel" (medium), "schwer" (hard) - regardless of the response language.

Respond only via the provided tool.`;
}
