// Provider-neutral pieces of the `systemOne` stand-in: the client contract, the
// JSON schema for structured answers, answer parsing, and probability handling.
import type {
  ChoiceResponse,
  NoulResponse,
  Question,
  Questions,
  ScoreResponse,
  SystemOneRequest,
  SystemOneResult,
} from "@typesafe-ai/sdk";

export interface SystemOneClient {
  readonly model: string;
  systemOne<Q extends Questions>(request: SystemOneRequest<Q>): Promise<SystemOneResult<Q>>;
}

export const SYSTEM_PROMPT = [
  "You are a calibrated code-review judge.",
  "Answer every question using only the supplied state.",
  "For yes/no questions, `answer` is true when the `true` criterion applies.",
  "Probabilities are your calibrated beliefs from 0 to 1, not certainty theatre.",
  "Every distribution must cover each label and sum to 1.",
].join(" ");

export type RawAnswer = {
  answer?: boolean;
  p_yes?: number;
  label?: string;
  score?: number;
  probabilities?: Record<string, number>;
};

const routedModels = new Map<string, number>();

export function recordRoutedModel(model: string): void {
  routedModels.set(model, (routedModels.get(model) ?? 0) + 1);
}

/** Model counts for this process, e.g. to log after a review. */
export function routedModelSummary(): string {
  return [...routedModels].map(([model, count]) => model + " x" + count).join(", ") || "none";
}

// Some providers prepend reasoning text or code fences to the JSON body.
export function parseAnswers(content: string): Record<string, RawAnswer> {
  try {
    return JSON.parse(content) as Record<string, RawAnswer>;
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Completion is not JSON: " + content.slice(0, 120));
    return JSON.parse(content.slice(start, end + 1)) as Record<string, RawAnswer>;
  }
}

export function answersSchema(questions: Questions) {
  const properties: Record<string, unknown> = {};
  for (const [name, question] of Object.entries(questions)) {
    properties[name] = questionSchema(question);
  }
  return { type: "object", properties, required: Object.keys(questions), additionalProperties: false };
}

function questionSchema(question: Question) {
  if (question.type === "noul") {
    // `answer` comes first so its token logprob is read before the stated probability.
    return {
      type: "object",
      properties: { answer: { type: "boolean" }, p_yes: { type: "number" } },
      required: ["answer", "p_yes"],
      additionalProperties: false,
    };
  }
  const labels = question.type === "choice"
    ? Object.keys(question.criteria)
    : question.criteria.map((_, index) => String(index));
  const distribution = {
    type: "object",
    properties: Object.fromEntries(labels.map((label) => [label, { type: "number" }])),
    required: labels,
    additionalProperties: false,
  };
  const pick = question.type === "choice"
    ? { label: { type: "string", enum: labels } }
    : { score: { type: "integer", enum: labels.map(Number) } };
  return {
    type: "object",
    properties: { ...pick, probabilities: distribution },
    required: [...Object.keys(pick), "probabilities"],
    additionalProperties: false,
  };
}

export function toAnswers<Q extends Questions>(
  questions: Q,
  raw: Record<string, RawAnswer>,
  tokenProbabilities: Map<string, number> = new Map(),
): SystemOneResult<Q>["answers"] {
  const answers: Record<string, unknown> = {};
  for (const name of Object.keys(questions)) {
    answers[name] = toAnswer(questions[name], raw[name], tokenProbabilities.get(name));
  }
  return answers as SystemOneResult<Q>["answers"];
}

function toAnswer(question: Question, raw: RawAnswer | undefined, tokenProbability: number | undefined) {
  if (!raw) throw new Error("Missing answer in structured output");
  if (question.type === "noul") {
    const stated = clamp(raw.p_yes ?? (raw.answer ? 1 : 0));
    return { type: "noul", noul: tokenProbability ?? stated } satisfies NoulResponse;
  }
  if (question.type === "choice") {
    const labels = Object.keys(question.criteria);
    const probabilities = normalize(labels, raw.probabilities, raw.label);
    const choice = raw.label && labels.includes(raw.label) ? raw.label : argmax(probabilities);
    return {
      type: "choice",
      choice,
      confidence: probabilities[choice],
      probabilities,
    } satisfies ChoiceResponse;
  }
  const labels = question.criteria.map((_, index) => String(index));
  const probabilities = normalize(labels, raw.probabilities, raw.score === undefined ? undefined : String(raw.score));
  const expected = labels.reduce((sum, label) => sum + Number(label) * probabilities[label], 0);
  return {
    type: "score",
    score: expected,
    confidence: Math.max(...Object.values(probabilities)),
    legend: Object.fromEntries(question.criteria.map((description, index) => [String(index), description])),
    probabilities,
  } satisfies ScoreResponse;
}

function normalize(labels: string[], raw: Record<string, number> | undefined, picked: string | undefined) {
  const values = labels.map((label) => Math.max(0, Number(raw?.[label] ?? 0)));
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return Object.fromEntries(labels.map((label) => [label, picked === undefined ? 1 / labels.length : label === picked ? 1 : 0]));
  }
  return Object.fromEntries(labels.map((label, index) => [label, values[index] / total]));
}

function argmax(probabilities: Record<string, number>): string {
  return Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0][0];
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
