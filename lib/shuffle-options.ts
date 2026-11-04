import type { Task, Question } from "@/types/generation";

// LLMs systematically default to writing the correct option first (it's the natural order to
// generate: state the question, write the right answer, then invent distractors afterwards).
// Left alone, that makes multiple-choice/underline tasks trivially guessable - shuffle the
// options ourselves after generation instead of relying on the model to vary their position.
export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Doppelte Antwortoptionen entfernen (Groß/klein und Leerzeichen egal) – die KI liefert sie gelegentlich. */
export function uniqueOptions(options: string[]): string[] {
  const seen = new Set<string>();
  return options.filter((o) => {
    const k = o.trim().replace(/\s+/g, " ").toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function shuffleTaskOptions(tasks: Task[]): Task[] {
  return tasks.map((task) =>
    (task.type === "multiple-choice" || task.type === "unterstreichen") && task.options
      ? { ...task, options: shuffleArray(uniqueOptions(task.options)) }
      : task
  );
}

export function shuffleQuestionOptions(questions: Question[]): Question[] {
  return questions.map((question) => {
    if (question.type !== "multiple-choice" || !question.options || question.correctIndex === undefined) {
      return question;
    }
    const correctValue = question.options[question.correctIndex];
    const options = shuffleArray(uniqueOptions(question.options));
    const key = (o: string) => o.trim().replace(/\s+/g, " ").toLowerCase();
    return { ...question, options, correctIndex: options.findIndex((o) => key(o) === key(correctValue)) };
  });
}
