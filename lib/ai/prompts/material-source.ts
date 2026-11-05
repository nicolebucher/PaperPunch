import type { Profile } from "@/types/generation";
import type { Locale } from "@/lib/i18n/translations";

const LANGUAGE_NAMES: Record<Locale, string> = { en: "English", de: "German" };

// Ohne Upload tragen Fach + Notiz den Inhalt - die API stellt sicher, dass mindestens eins davon gesetzt ist.
export function describeTopic(profile: Profile): string {
  return [profile.subject && `subject "${profile.subject}"`, profile.notes && `the student's note "${profile.notes}"`]
    .filter(Boolean)
    .join(" and ");
}

/** Where the level should be inferred from when no school type/grade was given. */
export function levelSource(hasMaterial: boolean): string {
  return hasMaterial ? "the material (see instructions above)" : "the topic";
}

/** The paragraph telling the model what to base the content on. */
export function contentBasis(profile: Profile, hasMaterial: boolean): string {
  if (hasMaterial) {
    return `Use the attached material (one or more files: study material, notes, or photos of school material)
as the content basis. Handwritten or photographed material can contain spelling mistakes or
transcription artifacts - silently use the correct spelling/wording in your output rather than
reproducing an error, unless the error itself is the point of an exercise.`;
  }
  return `No material was uploaded. Base the content on the topic given by the student: ${describeTopic(profile)}.
Treat that as the curriculum topic to cover and draw on standard school-curriculum content for it at
the target level - core facts, rules, methods, and vocabulary a student would typically be taught
and tested on for this topic. Everything you write in place of "the material" below refers to this
topic. Stay strictly on this topic, and keep every fact correct.`;
}

/**
 * The paragraph deciding which language the generated content is written in.
 * Rule (product decision 3 Nov 2026): the output language always follows the INPUT language -
 * the language of the uploaded material, or of what the student typed - never the app/UI language.
 * The UI locale is only the fallback when the input gives no clear signal.
 */
/** Natürliche, kindgerechte Sprache – kein Übersetzungsdeutsch (Feedback: "Male dir vor" statt "Stell dir vor"). */
const NATURAL_LANGUAGE = `Language quality rule: write the way a good native-speaking teacher of that grade would write -
idiomatic, natural phrasing, never word-for-word translations or invented idioms. German examples:
"Stell dir vor" (never "Male dir vor"), "Wie viele ... sind es?", "Wer hat mehr ...?". Before finishing, re-read
every question, option and explanation once purely for wording, grammar and spelling and fix anything a
native speaker would find odd.`;

export function contentLanguage(hasMaterial: boolean, locale: Locale, fields: string): string {
  return `${contentLanguageRule(hasMaterial, locale, fields)}\n\n${NATURAL_LANGUAGE}`;
}

function contentLanguageRule(hasMaterial: boolean, locale: Locale, fields: string): string {
  if (hasMaterial) {
    return `Output language rule (critical): detect the language of the attached material and write all content
(${fields}) in that same language - regardless of the language of these instructions and regardless of
the app language the student uses. Example: English-language material always gives English output, even
for a German-speaking student. Only if the material's language cannot be determined at all (e.g. it is
only numbers, formulas or diagrams) fall back to the language the student typed in, if any, else ${LANGUAGE_NAMES[locale]}.`;
  }
  return `Output language rule (critical): no material was uploaded, so write all content (${fields}) in the
language the student used to type the topic (the subject and/or note above) - regardless of the app
language. Example: a topic typed as "Photosynthesis" or "causes of WW1" gives English output, "Bruchrechnen"
gives German output. Only if the typed words give no clear signal (e.g. a single name or formula used in both
languages) fall back to ${LANGUAGE_NAMES[locale]}. If the topic is learning a foreign language, practise that
language the way a school textbook would.`;
}

/** Titel, die man in der Materialliste sofort versteht: das konkrete Thema, keine Fantasienamen. */
export function titleRule(field: string): string {
  return `Title rule: "${field}" must say plainly what is practised - the concrete topic the way a student
or parent would name it, so it is instantly clear in a list of saved materials and clearly matches the
content. 2-6 words, at most 40 characters, e.g. "Brüche kürzen und erweitern", "Photosynthese",
"Simple past: irregular verbs", "Causes of World War I". No invented or playful names (not
"Photosynthese-Profi", "Fraction Adventure", "Quiz Master"), no format words (worksheet, test, quiz,
game, Arbeitsblatt, Lernspiel), no grade or school type, no emojis.`;
}

/** Mathe-Schreibweise, damit App und PDF Brüche wie in der Schule (untereinander) darstellen können. */
export const MATH_RULE = `Math notation: write every fraction as numerator/denominator with digits and a slash, e.g. 3/4,
12/18, and mixed numbers as "2 1/2". Never use Unicode fraction characters (½, ¾), LaTeX, "\\frac" or words
like "drei Viertel" in place of a fraction. Use × for multiplication and : or ÷ for division as taught in
school, never "*". Write units after a space (5 km/h, 3 cm).`;
